"""
PPSR Rate Limiting Middleware
=============================
Middlewares for global unauthenticated IP protection, authenticated user backstop,
and automated rate limit response headers across all /api/ppsr/ endpoints.
"""

import logging
from django.conf import settings
from django.http import JsonResponse
from django_ratelimit.core import ALL, is_ratelimited

logger = logging.getLogger(__name__)


class PpsrUnauthenticatedRateLimitMiddleware:
    """
    Applied to all /api/ppsr/ and /api/v1/ppsr/ routes.
    For requests without a valid Authorization header (unauthenticated),
    rate-limits by IP at 20 requests/minute to prevent probing & brute-force.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith(('/api/ppsr/', '/api/v1/ppsr/')):
            if getattr(settings, 'RATELIMIT_ENABLE', True):
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                is_auth_token = bool(auth_header.startswith('Bearer ') and len(auth_header) > 10)
                is_auth_user = bool(hasattr(request, 'user') and request.user.is_authenticated)

                if not is_auth_token and not is_auth_user:
                    limited = is_ratelimited(
                        request=request,
                        group='ppsr:unauth',
                        key='ip',
                        rate='20/m',
                        method=ALL,
                        increment=True,
                    )
                    if limited:
                        ip = request.META.get('REMOTE_ADDR')
                        logger.warning('PPSR unauthenticated rate limit hit from IP: %s (path: %s)', ip, request.path)
                        response = JsonResponse(
                            {
                                'error': 'rate_limited',
                                'detail': 'Too many unauthenticated requests. Please authenticate and try again.',
                                'status_code': 429,
                            },
                            status=429,
                        )
                        response['Retry-After'] = '60'
                        return response

        return self.get_response(request)


class PpsrAuthenticatedBackstopMiddleware:
    """
    Global catch-all rate limit for authenticated users on /api/ppsr/ routes.
    200 requests/hour per user — guards against scripted token misuse.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith(('/api/ppsr/', '/api/v1/ppsr/')):
            if getattr(settings, 'RATELIMIT_ENABLE', True):
                if hasattr(request, 'user') and request.user.is_authenticated:
                    limited = is_ratelimited(
                        request=request,
                        group='ppsr:auth_backstop',
                        key='user',
                        rate='200/h',
                        method=ALL,
                        increment=True,
                    )
                    if limited:
                        logger.warning(
                            'PPSR global backstop rate limit hit by user: %s (path: %s)',
                            request.user.pk,
                            request.path
                        )
                        response = JsonResponse(
                            {
                                'error': 'rate_limited',
                                'detail': 'API usage limit reached for this hour.',
                                'status_code': 429,
                            },
                            status=429,
                        )
                        response['Retry-After'] = '60'
                        return response

        return self.get_response(request)


class PpsrRateLimitHeaderMiddleware:
    """
    Appends rate limit metadata headers (X-RateLimit-*) and Retry-After
    to all /api/ppsr/ responses.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith(('/api/ppsr/', '/api/v1/ppsr/')):
            if hasattr(request, 'ratelimit_data') and isinstance(request.ratelimit_data, dict):
                data = request.ratelimit_data
                if 'limit' in data:
                    response['X-RateLimit-Limit'] = str(data['limit'])
                if 'remaining' in data:
                    response['X-RateLimit-Remaining'] = str(data['remaining'])
                if 'reset' in data:
                    response['X-RateLimit-Reset'] = str(data['reset'])

            if response.status_code == 429 and 'Retry-After' not in response:
                response['Retry-After'] = '60'

        return response
