"""
core/redis_client.py — Singleton Redis Client & Session CRUD
=============================================================
All Redis session operations live here so they're reusable across
the middleware, login view, and logout view without duplicating
connection logic.

Session data schema
-------------------
Key   : session:<session_id>       (string → JSON)
Value : {
    "user_id"    : int,
    "username"   : str,
    "jti"        : str,             # JWT "jti" claim (optional, for future access-token revocation)
    "user_agent" : str,
    "created_at" : ISO-8601 str,
    "last_seen"  : ISO-8601 str,
}
TTL   : SESSION_COOKIE_AGE seconds (sliding — extended on every request)

User session index
------------------
Key   : user_sessions:<user_id>    (Redis list, oldest first)
Value : [session_id, session_id, …]
"""

import json
import logging
import secrets
from datetime import datetime, timezone

import redis
from django.conf import settings

logger = logging.getLogger(__name__)

# ─── Connection ───────────────────────────────────────────────────────────────

def _build_redis_url() -> str:
    host = getattr(settings, "REDIS_HOST", "127.0.0.1")
    port = getattr(settings, "REDIS_PORT", 6379)
    username = getattr(settings, "REDIS_USERNAME", "")
    password = getattr(settings, "REDIS_PASSWORD", "")
    db = getattr(settings, "REDIS_DB", 0)

    if username and password:
        return f"redis://{username}:{password}@{host}:{port}/{db}"
    elif password:
        return f"redis://:{password}@{host}:{port}/{db}"
    return f"redis://{host}:{port}/{db}"


_redis_pool: redis.ConnectionPool | None = None


def get_redis() -> redis.Redis:
    """Return a shared Redis client (thread-safe connection pool)."""
    global _redis_pool
    if _redis_pool is None:
        url = _build_redis_url()
        _redis_pool = redis.ConnectionPool.from_url(
            url,
            decode_responses=True,
            max_connections=20,
            socket_connect_timeout=3,
            socket_timeout=3,
            retry_on_timeout=True,
        )
    return redis.Redis(connection_pool=_redis_pool)


# ─── Key helpers ──────────────────────────────────────────────────────────────

SESSION_PREFIX = "kspg:session:"
USER_SESSIONS_PREFIX = "kspg:user_sessions:"


def _session_key(session_id: str) -> str:
    return f"{SESSION_PREFIX}{session_id}"


def _user_sessions_key(user_id: int) -> str:
    return f"{USER_SESSIONS_PREFIX}{user_id}"


# ─── Session TTL ──────────────────────────────────────────────────────────────

def _get_ttl() -> int:
    return getattr(settings, "SESSION_COOKIE_AGE", 3600)


def _get_idle_timeout() -> int:
    return getattr(settings, "SESSION_IDLE_TIMEOUT_SECONDS", 1800)  # 30 min


def _get_absolute_timeout() -> int:
    return getattr(settings, "SESSION_ABSOLUTE_TIMEOUT_SECONDS", 43200)  # 12 hours


def _get_max_sessions() -> int:
    return getattr(settings, "MAX_CONCURRENT_SESSIONS", 5)


# ─── Public API ───────────────────────────────────────────────────────────────

def generate_session_id() -> str:
    """Generate a cryptographically secure, unguessable session ID."""
    return secrets.token_urlsafe(32)


def create_session(
    user_id: int,
    username: str,
    user_agent: str = "",
    ip_address: str = "",
    jti: str = "",
    is_mfa_verified: bool = False,
) -> str:
    """
    Create a new Redis session record and return the session_id.
    Stores device fingerprinting (IP, User-Agent), timestamps, and MFA status.
    Also manages the per-user session index: if the user already has
    MAX_CONCURRENT_SESSIONS, the oldest one is evicted first.
    """
    r = get_redis()
    now = datetime.now(timezone.utc).isoformat()
    session_id = generate_session_id()
    ttl = _get_ttl()
    max_sessions = _get_max_sessions()

    payload = {
        "user_id": user_id,
        "username": username,
        "ip_address": ip_address,
        "user_agent": user_agent[:512],
        "jti": jti,
        "is_mfa_verified": is_mfa_verified,
        "created_at": now,
        "last_seen": now,
    }

    pipe = r.pipeline(transaction=True)

    # Write session record
    pipe.setex(_session_key(session_id), ttl, json.dumps(payload))

    # Add to user's session index (left-push = newest first)
    user_key = _user_sessions_key(user_id)
    pipe.lpush(user_key, session_id)
    pipe.expire(user_key, ttl * max_sessions)

    pipe.execute()

    # Evict overflow (keep only the newest MAX_CONCURRENT_SESSIONS)
    _evict_overflow_sessions(r, user_id, max_sessions)

    logger.info(
        "Session created: user=%s session=%s… ip=%s",
        username,
        session_id[:8],
        ip_address or "unknown",
    )
    return session_id


def get_session(session_id: str) -> dict | None:
    """
    Return the session payload dict, or None if it doesn't exist / is expired.
    """
    try:
        r = get_redis()
        raw = r.get(_session_key(session_id))
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as exc:
        logger.warning("Redis get_session error: %s", exc)
        return None


def validate_session_timeouts(session_data: dict) -> tuple[bool, str]:
    """
    Validates idle timeout (default 30m) and absolute timeout (default 12h).
    Returns (True, "") if valid, or (False, "REASON") if expired.
    """
    if not session_data:
        return False, "SESSION_MISSING"

    now = datetime.now(timezone.utc)

    # 1. Check Idle Timeout
    last_seen_str = session_data.get("last_seen")
    if last_seen_str:
        try:
            last_seen = datetime.fromisoformat(last_seen_str)
            idle_seconds = (now - last_seen).total_seconds()
            if idle_seconds > _get_idle_timeout():
                return False, "SESSION_IDLE_TIMEOUT"
        except Exception:
            pass

    # 2. Check Absolute Timeout
    created_at_str = session_data.get("created_at")
    if created_at_str:
        try:
            created_at = datetime.fromisoformat(created_at_str)
            absolute_seconds = (now - created_at).total_seconds()
            if absolute_seconds > _get_absolute_timeout():
                return False, "SESSION_ABSOLUTE_TIMEOUT"
        except Exception:
            pass

    return True, ""


def rotate_session(
    old_session_id: str,
    ip_address: str = "",
    user_agent: str = "",
) -> str:
    """
    Rotate session ID after privilege change or sensitive action.
    Transfers session metadata to a new ID and deletes the old one.
    """
    r = get_redis()
    session_data = get_session(old_session_id)
    if not session_data:
        return generate_session_id()

    new_session_id = generate_session_id()
    now = datetime.now(timezone.utc).isoformat()
    ttl = _get_ttl()
    user_id = session_data.get("user_id")

    session_data["last_seen"] = now
    if ip_address:
        session_data["ip_address"] = ip_address
    if user_agent:
        session_data["user_agent"] = user_agent[:512]

    pipe = r.pipeline(transaction=True)
    pipe.setex(_session_key(new_session_id), ttl, json.dumps(session_data))
    pipe.delete(_session_key(old_session_id))

    if user_id:
        user_key = _user_sessions_key(user_id)
        pipe.lrem(user_key, 0, old_session_id)
        pipe.lpush(user_key, new_session_id)

    pipe.execute()
    logger.info("Session rotated: %s… -> %s…", old_session_id[:8], new_session_id[:8])
    return new_session_id


def refresh_session_ttl(session_id: str, ip_address: str = "", user_agent: str = "") -> None:
    """Slide the session TTL and update last_seen timestamp."""
    try:
        r = get_redis()
        ttl = _get_ttl()
        raw = r.get(_session_key(session_id))
        if raw:
            payload = json.loads(raw)
            payload["last_seen"] = datetime.now(timezone.utc).isoformat()
            if ip_address and not payload.get("ip_address"):
                payload["ip_address"] = ip_address
            if user_agent and not payload.get("user_agent"):
                payload["user_agent"] = user_agent[:512]
            r.setex(_session_key(session_id), ttl, json.dumps(payload))
    except Exception as exc:
        logger.warning("Redis refresh_session_ttl error: %s", exc)


def delete_session(session_id: str) -> None:
    """
    Delete a session from Redis (called on logout).
    Also removes from the user's session index.
    """
    try:
        r = get_redis()

        # Read to get user_id for index cleanup
        raw = r.get(_session_key(session_id))
        if raw:
            payload = json.loads(raw)
            user_id = payload.get("user_id")
            if user_id:
                r.lrem(_user_sessions_key(user_id), 0, session_id)

        r.delete(_session_key(session_id))
        logger.info("Session deleted: %s…", session_id[:8])
    except Exception as exc:
        logger.warning("Redis delete_session error: %s", exc)


def delete_all_user_sessions(user_id: int) -> int:
    """
    Invalidate ALL sessions for a given user (e.g. password change, account lock).
    Returns the number of sessions deleted.
    """
    try:
        r = get_redis()
        user_key = _user_sessions_key(user_id)
        session_ids = r.lrange(user_key, 0, -1)
        pipe = r.pipeline()
        for sid in session_ids:
            pipe.delete(_session_key(sid))
        pipe.delete(user_key)
        pipe.execute()
        logger.info("All sessions deleted for user_id=%s (%d sessions)", user_id, len(session_ids))
        return len(session_ids)
    except Exception as exc:
        logger.warning("Redis delete_all_user_sessions error: %s", exc)
        return 0


def count_user_sessions(user_id: int) -> int:
    """Return the number of active sessions for a user."""
    try:
        r = get_redis()
        return r.llen(_user_sessions_key(user_id))
    except Exception:
        return 0


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _evict_overflow_sessions(r: redis.Redis, user_id: int, max_sessions: int) -> None:
    """Remove oldest sessions that exceed max_sessions for this user."""
    user_key = _user_sessions_key(user_id)
    # lrange gives [newest, …, oldest]; trim at max
    all_sessions = r.lrange(user_key, 0, -1)   # newest first (lpush inserts at left)

    if len(all_sessions) <= max_sessions:
        return

    to_evict = all_sessions[max_sessions:]      # oldest excess sessions
    pipe = r.pipeline()
    for sid in to_evict:
        pipe.delete(_session_key(sid))
        pipe.lrem(user_key, 0, sid)
    pipe.execute()
    logger.info("Evicted %d overflow sessions for user_id=%s", len(to_evict), user_id)


def ping_redis() -> bool:
    """Health check — returns True if Redis is reachable."""
    try:
        return get_redis().ping()
    except Exception:
        return False
