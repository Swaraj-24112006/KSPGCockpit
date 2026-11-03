import json
import logging
import uuid
import contextvars
from datetime import datetime

# Context variable for thread-safe request ID tracking
request_id_var = contextvars.ContextVar('request_id', default='-')


class RequestIDFilter(logging.Filter):
    """Logging filter that injects request_id into every log record."""
    def filter(self, record):
        record.request_id = request_id_var.get('-')
        return True


class JSONLogFormatter(logging.Formatter):
    """Structured JSON formatter for production log ingestion (e.g. Datadog, ELK)."""
    def format(self, record):
        log_obj = {
            'timestamp': datetime.fromtimestamp(record.created).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'request_id': getattr(record, 'request_id', '-'),
            'module': record.module,
            'line': record.lineno,
        }
        if record.exc_info:
            log_obj['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_obj)


class RequestIDMiddleware:
    """
    Middleware that assigns a unique Request ID to each incoming request.
    Reads X-Request-ID if provided, otherwise generates a UUID4.
    Attaches the request ID to the response and sets essential security headers.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Read or generate request id
        req_id = request.headers.get('X-Request-ID') or request.META.get('HTTP_X_REQUEST_ID')
        if not req_id:
            req_id = str(uuid.uuid4())

        request.id = req_id
        request.request_id = req_id
        token = request_id_var.set(req_id)

        try:
            response = self.get_response(request)
        finally:
            request_id_var.reset(token)

        # Inject X-Request-ID into response headers
        response['X-Request-ID'] = req_id

        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        return response
