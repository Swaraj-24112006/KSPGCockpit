"""
Test settings for running unit tests with SQLite in-memory DB
without requiring an external running PostgreSQL instance.
"""
from .settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'timeout': 30,
        },
    }
}

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10000/day',
        'user': '10000/hour',
        'attachment_upload': '1000/minute',
        'lookups': '1000/minute',
        'analytics': '1000/minute',
    }
}
