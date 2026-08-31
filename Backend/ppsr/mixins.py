"""
PPSR Rate Limiting Mixin & Helpers
==================================
Reusable mixin and decorators for applying per-action and per-endpoint
rate limits on DRF ViewSets and APIViews using django-ratelimit.
"""

from functools import wraps
from django.conf import settings
from django_ratelimit.core import is_ratelimited
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited


def apply_ratelimit(rate: str, method: str = 'POST', key: str = 'user_or_ip'):
    """
    Decorator factory for applying django-ratelimit to a CBV method.
    """
    def decorator(func):
        @wraps(func)
        def wrapped(self, request, *args, **kwargs):
            if not getattr(settings, 'RATELIMIT_ENABLE', True):
                return func(self, request, *args, **kwargs)
            limited = getattr(request, 'limited', False)
            if limited:
                raise Ratelimited()
            return func(self, request, *args, **kwargs)
        return ratelimit(key=key, rate=rate, method=method, block=True)(wrapped)
    return decorator


class PpsrRateLimitMixin:
    """
    Mixin that provides a clean interface for per-action rate limits on
    DRF ViewSets. Subclasses declare RATE_LIMITS as a dict mapping
    action name -> (rate, method) tuples.

    Example:
        class MyViewSet(PpsrRateLimitMixin, ModelViewSet):
            RATE_LIMITS = {
                'create': ('10/h', 'POST'),
                'partial_update': ('60/h', 'PATCH'),
            }
    """

    RATE_LIMITS: dict = {}

    def initial(self, request, *args, **kwargs):
        """
        Called before every action. Checks the rate limit for the
        current action name (e.g. 'create', 'partial_update').
        """
        super().initial(request, *args, **kwargs)

        if not getattr(settings, 'RATELIMIT_ENABLE', True):
            return

        action = getattr(self, 'action', None)
        if action and action in self.RATE_LIMITS:
            rate, method = self.RATE_LIMITS[action]
            limited = is_ratelimited(
                request=request,
                group=f'ppsr:{action}',
                key='user_or_ip',
                rate=rate,
                method=method,
                increment=True,
            )
            if limited:
                raise Ratelimited()
