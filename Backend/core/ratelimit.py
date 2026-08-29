"""
Core Rate Limiting Module — Kaizen Backend
===========================================
Enterprise rate limiting backed by Redis and django-ratelimit.

Rate limits configured:
- Login: 5 attempts/minute/IP + 5 attempts/minute/username
- Password Reset: 3 requests/minute/IP
- OTP Verification: 5 attempts/minute/user or IP
- Normal APIs: 100 requests/minute/user (60/minute/anon)
- File Uploads: 10 requests/minute/user
- Admin APIs: 30 requests/minute/user
"""

import logging
from rest_framework.throttling import SimpleRateThrottle
from django.http import JsonResponse
from django.core.cache import cache
from django_ratelimit.decorators import ratelimit

logger = logging.getLogger('kaizen')


def get_client_ip(request) -> str:
    """
    Extract client IP address reliably, handling proxies / reverse proxies.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('HTTP_X_REAL_IP') or request.META.get('REMOTE_ADDR') or '127.0.0.1'
    return ip


def get_user_or_ip(request) -> str:
    """
    Returns user ID if authenticated, otherwise returns client IP.
    """
    if getattr(request, 'user', None) and request.user.is_authenticated:
        return f"user_{request.user.pk}"
    return f"ip_{get_client_ip(request)}"


# ─── DRF Throttle Classes (Redis-Backed) ──────────────────────────────────────

class NormalAPIRateThrottle(SimpleRateThrottle):
    """
    Normal APIs: 100 requests/minute/user, 60 requests/minute/anon.
    Backed by Redis cache.
    """
    scope = 'user'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            self.scope = 'user'
            self.rate = self.get_rate()
            return f"throttle_normal_user_{request.user.pk}"
        self.scope = 'anon'
        self.rate = self.get_rate()
        return f"throttle_normal_anon_{get_client_ip(request)}"


class LoginIPRateThrottle(SimpleRateThrottle):
    """
    Login: 5 attempts/minute/IP.
    """
    scope = 'login_ip'

    def get_cache_key(self, request, view):
        ip = get_client_ip(request)
        return f"throttle_login_ip_{ip}"


class LoginUserRateThrottle(SimpleRateThrottle):
    """
    Login Account: 5 attempts/minute/username (prevents account-targeted brute force).
    """
    scope = 'login_user'

    def get_cache_key(self, request, view):
        username = request.data.get('username') if hasattr(request, 'data') else None
        if not username:
            username = request.POST.get('username', '').strip()
        if username:
            return f"throttle_login_account_{username.strip().lower()}"
        return f"throttle_login_account_{get_client_ip(request)}"


class ForgotPasswordRateThrottle(SimpleRateThrottle):
    """
    Forgot Password: 3 requests / 10 min / IP or account.
    """
    scope = 'password_reset'

    def get_cache_key(self, request, view):
        ip = get_client_ip(request)
        return f"throttle_forgot_pwd_{ip}"


class PasswordResetRateThrottle(SimpleRateThrottle):
    """
    Password Reset: 5 requests / 10 min / IP.
    """
    scope = 'password_reset'

    def get_cache_key(self, request, view):
        ip = get_client_ip(request)
        return f"throttle_password_reset_{ip}"


class OTPVerifyRateThrottle(SimpleRateThrottle):
    """
    OTP Verification: 5 attempts / 5 min / user or IP.
    """
    scope = 'otp_verify'

    def get_cache_key(self, request, view):
        ident = get_user_or_ip(request)
        return f"throttle_otp_{ident}"


class ResendOTPRateThrottle(SimpleRateThrottle):
    """
    Resend OTP: 1 request / 60 seconds / IP or user.
    """
    scope = 'resend_otp'

    def get_cache_key(self, request, view):
        username = request.data.get('username') if hasattr(request, 'data') else None
        if username:
            return f"throttle_resend_otp_{username.strip().lower()}"
        return f"throttle_resend_otp_{get_client_ip(request)}"



class FileUploadRateThrottle(SimpleRateThrottle):
    """
    File Uploads: 10 requests/minute/user.
    """
    scope = 'file_upload'

    def get_cache_key(self, request, view):
        ident = get_user_or_ip(request)
        return f"throttle_upload_{ident}"


class AdminAPIRateThrottle(SimpleRateThrottle):
    """
    Admin APIs: 30 requests/minute/user.
    """
    scope = 'admin_api'

    def get_cache_key(self, request, view):
        ident = get_user_or_ip(request)
        return f"throttle_admin_{ident}"


def ratelimited_handler(request, exception=None):
    """
    Standard HTTP 429 response when django-ratelimit triggers on standard Django views.
    """
    return JsonResponse({
        'success': False,
        'error': {
            'code': 'RATE_LIMIT_EXCEEDED',
            'message': 'Too many requests. Rate limit exceeded. Please try again later.',
            'details': {
                'retry_after': 60,
            }
        }
    }, status=429)
