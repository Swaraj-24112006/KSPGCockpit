"""
Health check endpoint for operational monitoring.
"""

from django.http import JsonResponse
from django.db import connection
from django.utils import timezone
import time


_start_time = time.time()


def health_check(request):
    """
    GET /api/v1/health/
    Returns server health status including database connectivity.
    """
    db_status = 'healthy'
    db_error = None

    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception as e:
        db_status = 'unhealthy'
        db_error = str(e)

    uptime_seconds = int(time.time() - _start_time)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    response_data = {
        'success': True,
        'status': 'healthy' if db_status == 'healthy' else 'degraded',
        'version': '1.0.0',
        'timestamp': timezone.now().isoformat(),
        'uptime': f'{hours}h {minutes}m {seconds}s',
        'database': {
            'status': db_status,
            'error': db_error,
        },
    }

    status_code = 200 if db_status == 'healthy' else 503
    return JsonResponse(response_data, status=status_code)
