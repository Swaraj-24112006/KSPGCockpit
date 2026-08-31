"""
PPSR Custom Exception Handler — Structured JSON Error Handling
==============================================================
Extends DRF's default exception handler to convert django-ratelimit's
Ratelimited exception into a structured 429 JSON response with Retry-After header.
"""

import logging
from django_ratelimit.exceptions import Ratelimited
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from core.exceptions import custom_exception_handler as core_exception_handler

logger = logging.getLogger(__name__)


def ppsr_exception_handler(exc, context):
    """
    Custom exception handler for PPSR and general API requests.
    Translates django-ratelimit's Ratelimited exception into a 429 JSON response:
    {
        "error": "rate_limited",
        "detail": "Too many requests. Please wait before trying again.",
        "status_code": 429
    }
    """
    if isinstance(exc, Ratelimited):
        logger.warning("PPSR rate limit exceeded: HTTP 429 Too Many Requests")
        response = Response(
            {
                'error': 'rate_limited',
                'detail': 'Too many requests. Please wait before trying again.',
                'status_code': 429,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
            headers={'Retry-After': '60'},
        )
        return response

    # Fall through to core custom exception handler / DRF handler
    return core_exception_handler(exc, context)
