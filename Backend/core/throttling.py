"""
Rate limiting / throttling configuration for the Kaizen Backend API.
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class DefaultRateThrottle(UserRateThrottle):
    """Standard rate limit for authenticated API endpoints."""
    scope = 'default'
    rate = '100/min'


class LoginRateThrottle(AnonRateThrottle):
    """Stricter rate limit for authentication endpoints to prevent brute force."""
    scope = 'login'
    rate = '10/min'


class ExportRateThrottle(UserRateThrottle):
    """Rate limit for report export endpoints (CPU-intensive operations)."""
    scope = 'export'
    rate = '10/min'
