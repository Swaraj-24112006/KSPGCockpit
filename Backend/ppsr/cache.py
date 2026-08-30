"""
PPSR Cache — Redis Caching Layer for PPSR Module
=================================================
Key builders, TTL constants, resilient get/set helpers,
and invalidation routines for all PPSR cached endpoints.
"""

import hashlib
import fnmatch
import logging
import time
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


# ── TTL Constants (pulled from Django settings) ──────────────────────────────

TTL_LEADERBOARD = getattr(settings, 'PPSR_CACHE_TTL_LEADERBOARD', 300)
TTL_SUMMARY     = getattr(settings, 'PPSR_CACHE_TTL_SUMMARY',     120)
TTL_REGISTER    = getattr(settings, 'PPSR_CACHE_TTL_REGISTER',     60)
TTL_SHEET       = getattr(settings, 'PPSR_CACHE_TTL_SHEET',        300)
TTL_MEETINGS    = getattr(settings, 'PPSR_CACHE_TTL_MEETINGS',     180)


# ── Key Builders ─────────────────────────────────────────────────────────────

def leaderboard_key(year: str, month: str, category: str, status: str) -> str:
    """
    One key per unique (year, month, category, status) combination.
    PPSRMonthlyAwards.tsx filters by selectedYear, selectedMonth,
    categoryFilter, and statusFilter.
    """
    return f'leaderboard:{year}:{month}:{category}:{status}'


def summary_key() -> str:
    """
    Global summary — not user-specific.
    PpsrReviewBoard shows the same summary banner to all users.
    """
    return 'summary:v1'


def register_list_key(params: dict) -> str:
    """
    Build a deterministic cache key from active filter params and pagination.
    PpsrReviewBoard.tsx uses: status, plant, week, committee_decision,
    std_status_mf, search, page, page_size.
    Hashes sorted params so key length stays fixed.
    """
    EXCLUDED = {'format', 'csrfmiddlewaretoken'}
    stable = {k: v for k, v in sorted(params.items()) if k not in EXCLUDED and v}
    params_str = '&'.join(f'{k}={v}' for k, v in stable.items())
    digest = hashlib.md5(params_str.encode()).hexdigest()[:12]
    return f'register:{digest}'


def sheet_key(report_id: str) -> str:
    """Per-report sheet inspect data — used by PpsrSheetInspect.tsx."""
    return f'sheet:{report_id}'


def meetings_key() -> str:
    """Meeting log list — same for all users."""
    return 'meetings:list:v1'


# ── Generic Get / Set Helpers ────────────────────────────────────────────────

def cache_get(key: str):
    """
    Safely get value from cache.
    Falls back to None on cache miss or connection error.
    """
    try:
        t0 = time.monotonic()
        value = cache.get(key)
        elapsed = time.monotonic() - t0
        if value is None:
            logger.info('PPSR cache MISS key=%s (%.2fms)', key, elapsed * 1000)
        return value
    except Exception as exc:
        logger.warning('PPSR cache GET failed for key=%s: %s', key, exc)
        return None


def cache_set(key: str, value, ttl: int):
    """
    Safely store value in cache with given TTL.
    """
    try:
        cache.set(key, value, timeout=ttl)
    except Exception as exc:
        logger.warning('PPSR cache SET failed for key=%s: %s', key, exc)


def _delete_pattern(pattern: str):
    """
    Delete keys matching pattern.
    Uses django-redis delete_pattern() when available, or fallback for LocMemCache in tests.
    """
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(pattern)
        else:
            # Fallback for LocMemCache or non-redis backends
            if hasattr(cache, '_cache'):
                clean_pattern = pattern.strip('*')
                keys_to_del = [
                    k for k in list(cache._cache.keys())
                    if clean_pattern in k or fnmatch.fnmatch(k, f'*{clean_pattern}*')
                ]
                for k in keys_to_del:
                    cache._cache.pop(k, None)
                    if hasattr(cache, '_expire_info'):
                        cache._expire_info.pop(k, None)
    except Exception as exc:
        logger.warning('PPSR cache delete_pattern failed for pattern=%s: %s', pattern, exc)


# ── Invalidation Helpers ─────────────────────────────────────────────────────

def invalidate_leaderboard():
    """
    Called when a CftRating is created or updated.
    Clears all leaderboard cache variants.
    """
    try:
        _delete_pattern('*leaderboard:*')
        logger.debug('PPSR: leaderboard cache cleared')
    except Exception as exc:
        logger.warning('PPSR cache invalidate_leaderboard failed: %s', exc)


def invalidate_summary():
    """
    Called when any PpsrReport is created or updated.
    Clears the global summary stats cache.
    """
    try:
        cache.delete(summary_key())
        logger.debug('PPSR: summary cache cleared')
    except Exception as exc:
        logger.warning('PPSR cache invalidate_summary failed: %s', exc)


def invalidate_register():
    """
    Called when any PpsrReport is created or updated.
    Clears all register list variants.
    """
    try:
        _delete_pattern('*register:*')
        logger.debug('PPSR: register list cache cleared')
    except Exception as exc:
        logger.warning('PPSR cache invalidate_register failed: %s', exc)


def invalidate_sheet(report_id: str):
    """
    Called when a specific PpsrReport is updated.
    Clears the cached sheet inspect data for that report.
    """
    try:
        cache.delete(sheet_key(report_id))
        logger.debug('PPSR: sheet cache cleared for report %s', report_id)
    except Exception as exc:
        logger.warning('PPSR cache invalidate_sheet failed: %s', exc)


def invalidate_meetings():
    """
    Called when a PpsrMeetingLog is created or updated.
    Clears the meetings list cache.
    """
    try:
        cache.delete(meetings_key())
        logger.debug('PPSR: meetings cache cleared')
    except Exception as exc:
        logger.warning('PPSR cache invalidate_meetings failed: %s', exc)


def invalidate_all_for_report(report_id: str):
    """
    Convenience: called on any report write.
    Clears summary, register, sheet, and leaderboard.
    """
    invalidate_summary()
    invalidate_register()
    invalidate_sheet(report_id)
    invalidate_leaderboard()
