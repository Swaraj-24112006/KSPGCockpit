"""
core/session_middleware.py — Redis Session Validation Middleware
================================================================
Sits between the CORS middleware and the authentication middleware.

For every request to a protected API path (/api/v1/ except auth endpoints):
1. Read the `kspg_sid` HttpOnly cookie.
2. Look it up in Redis.
3. If it exists → slide TTL (keep session alive) and allow the request.
4. If it is missing or expired → return 401 Unauthorized immediately.

Auth endpoints are always exempted so the login flow is never broken.
"""

import json
import logging

from django.conf import settings
from django.http import JsonResponse

from core.redis_client import (
    get_session,
    refresh_session_ttl,
    validate_session_timeouts,
    delete_session,
)
from core.ratelimit import get_client_ip

logger = logging.getLogger(__name__)

# ── Paths that are always allowed without a Redis session ─────────────────────
EXEMPT_PREFIXES = (
    "/api/v1/auth/",
    "/api/auth/",
    "/api/v1/health/",
    "/admin/",
    "/media/",
    "/static/",
)


# ── Only protect these path prefixes ─────────────────────────────────────────
PROTECTED_PREFIX = "/api/v1/"

SESSION_COOKIE_NAME = "kspg_sid"


class SessionValidationMiddleware:
    """
    Validates the Redis session cookie on every protected API request.
    Enforces:
    - Idle session timeout (default 30 minutes)
    - Absolute session timeout (default 12 hours)
    - Session hijacking / Device User-Agent anomaly detection
    - Rolling session TTL sliding
    Must be placed AFTER CorsMiddleware so CORS preflight (OPTIONS) passes.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._should_validate(request):
            # If request.user is already authenticated (e.g. via test client, token, or prior middleware), pass through
            if getattr(request, 'user', None) and request.user.is_authenticated:
                return self.get_response(request)

            session_id = request.COOKIES.get(SESSION_COOKIE_NAME)

            if not session_id:
                return self._reject("SESSION_MISSING", "Authentication required. Please log in.")

            session_data = get_session(session_id)
            if session_data is None:
                return self._reject(
                    "SESSION_EXPIRED",
                    "Your session has expired. Please log in again.",
                )

            # ── 1. Validate Idle and Absolute Timeouts ────────────────────────
            valid_timeouts, timeout_reason = validate_session_timeouts(session_data)
            if not valid_timeouts:
                delete_session(session_id)
                if timeout_reason == "SESSION_IDLE_TIMEOUT":
                    return self._reject(
                        "SESSION_IDLE_TIMEOUT",
                        "Your session has expired due to inactivity. Please log in again.",
                    )
                else:
                    return self._reject(
                        "SESSION_ABSOLUTE_TIMEOUT",
                        "Your session has reached its maximum duration. Please log in again.",
                    )

            # ── 2. Session Hijacking / Device Anomaly Detection ──────────────
            current_ip = get_client_ip(request)
            current_ua = request.META.get("HTTP_USER_AGENT", "")[:512]
            stored_ua = session_data.get("user_agent", "")
            stored_ip = session_data.get("ip_address", "")

            # If user agent was recorded and has now changed → device mismatch
            if stored_ua and current_ua and stored_ua != current_ua:
                logger.warning(
                    "SESSION_HIJACK_SUSPECTED: User %s session %s device mismatch! Orig UA: '%s' vs Current UA: '%s'",
                    session_data.get("username"),
                    session_id[:8],
                    stored_ua,
                    current_ua,
                )
                if getattr(settings, "SESSION_STRICT_DEVICE_CHECK", True):
                    delete_session(session_id)
                    return self._reject(
                        "SESSION_HIJACK_DETECTED",
                        "Suspicious session activity detected from a different device. Please log in again.",
                    )

            # Strict IP check (optional per setting)
            if getattr(settings, "SESSION_STRICT_IP_CHECK", False) and stored_ip and current_ip != stored_ip:
                logger.warning(
                    "SESSION_IP_MISMATCH: User %s session %s IP changed from %s to %s",
                    session_data.get("username"),
                    session_id[:8],
                    stored_ip,
                    current_ip,
                )
                delete_session(session_id)
                return self._reject(
                    "SESSION_IP_MISMATCH",
                    "Your network location changed during the session. Please log in again.",
                )

            # Attach session data to the request for downstream views
            request.kspg_session_id = session_id
            request.kspg_session = session_data

            # Slide the TTL on every valid request (rolling session)
            refresh_session_ttl(session_id, ip_address=current_ip, user_agent=current_ua)

        return self.get_response(request)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _should_validate(self, request) -> bool:
        """Return True if this request must have a valid Redis session."""
        path = request.path_info

        # CORS preflight — always pass
        if request.method == "OPTIONS":
            return False

        # Only validate API paths
        if not path.startswith(PROTECTED_PREFIX):
            return False

        # Exempt auth endpoints
        for prefix in EXEMPT_PREFIXES:
            if path.startswith(prefix):
                return False

        return True

    @staticmethod
    def _reject(code: str, message: str) -> JsonResponse:
        return JsonResponse(
            {
                "success": False,
                "error": {
                    "code": code,
                    "message": message,
                    "details": {},
                },
            },
            status=401,
        )
