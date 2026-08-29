"""
Kaizen Backend — Django Settings
=================================
Production-grade settings for the Kaizen management system.
All secrets loaded from environment variables via python-decouple.
"""

import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# =============================================================================
# Paths
# =============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# =============================================================================
# Security
# =============================================================================
SECRET_KEY = config('SECRET_KEY', default='django-insecure-development-key-for-kaizen-sfc-2026')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,*', cast=Csv())

# =============================================================================
# Application Definition
# =============================================================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'storages',

    # Project apps
    'accounts',
    'kaizens',
    'workflow',
    'impact',
    'verification',
    'voting',
    'notifications',
    'audit',
    'reports',
    'cft_awards',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    # Redis-backed session validation — must be AFTER CORS so preflight passes
    'core.session_middleware.SessionValidationMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# =============================================================================
# Database — PostgreSQL
# =============================================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DATABASE_NAME', default='kaizen_db'),
        'USER': config('DATABASE_USER', default='postgres'),
        'PASSWORD': config('DATABASE_PASSWORD', default='postgres'),
        'HOST': config('DATABASE_HOST', default='localhost'),
        'PORT': config('DATABASE_PORT', default='5432'),
        'OPTIONS': {
            'connect_timeout': 10,
        },
        'CONN_MAX_AGE': 600,
    }
}

# =============================================================================
# Redis — Cache & Session Store
# =============================================================================
REDIS_HOST = config('REDIS_HOST', default='127.0.0.1')
REDIS_PORT = config('REDIS_PORT', default=6379, cast=int)
REDIS_USERNAME = config('REDIS_USERNAME', default='').strip()
REDIS_PASSWORD = config('REDIS_PASSWORD', default='').strip()
REDIS_DB = config('REDIS_DB', default=0, cast=int)

_redis_user_pass = ''
if REDIS_USERNAME and REDIS_PASSWORD:
    _redis_user_pass = f'{REDIS_USERNAME}:{REDIS_PASSWORD}@'
elif REDIS_PASSWORD:
    _redis_user_pass = f':{REDIS_PASSWORD}@'

REDIS_URL = f'redis://{_redis_user_pass}{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}'

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'IGNORE_EXCEPTIONS': True,  # Ensures cache downtime does not crash app requests
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True,
            'MAX_CONNECTIONS': 20,
            'CONNECTION_POOL_KWARGS': {'max_connections': 20},
        },
        'KEY_PREFIX': 'kspg_cache',
    }
}

# =============================================================================
# Celery Configuration (Async Task Processing via Redis Broker)
# =============================================================================
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default=REDIS_URL)
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default=REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Kolkata'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ALWAYS_EAGER = config('CELERY_TASK_ALWAYS_EAGER', default=False, cast=bool)

# =============================================================================
# Session Security — Redis-backed with HttpOnly / SameSite cookies
# =============================================================================
SESSION_COOKIE_AGE = config('SESSION_COOKIE_AGE', default=3600, cast=int)  # 60 min sliding base
MAX_CONCURRENT_SESSIONS = config('MAX_CONCURRENT_SESSIONS', default=5, cast=int)

# Session Hijacking & Timeout Controls
SESSION_IDLE_TIMEOUT_SECONDS = config('SESSION_IDLE_TIMEOUT_SECONDS', default=1800, cast=int)      # 30 min idle timeout
SESSION_ABSOLUTE_TIMEOUT_SECONDS = config('SESSION_ABSOLUTE_TIMEOUT_SECONDS', default=43200, cast=int)  # 12 hr absolute timeout
SESSION_STRICT_DEVICE_CHECK = config('SESSION_STRICT_DEVICE_CHECK', default=True, cast=bool)       # User-Agent anomaly check
SESSION_STRICT_IP_CHECK = config('SESSION_STRICT_IP_CHECK', default=False, cast=bool)             # Strict IP binding

# Cookie security flags
SESSION_COOKIE_NAME = 'kspg_session'
SESSION_COOKIE_HTTPONLY = True           # Not accessible via JavaScript
SESSION_COOKIE_SAMESITE = 'Lax'         # Prevents CSRF while allowing normal navigation
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=not DEBUG, cast=bool)
SESSION_COOKIE_PATH = '/'
SESSION_SAVE_EVERY_REQUEST = False       # We manage TTL manually in middleware

# Global Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# KSPG custom session cookie name (used by SessionValidationMiddleware)
KSPG_SESSION_COOKIE_NAME = 'kspg_sid'

# =============================================================================
# Auth
# =============================================================================
AUTH_USER_MODEL = 'accounts.CustomUser'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# =============================================================================
# =============================================================================
# Rate Limiting Configuration (django-ratelimit & Redis cache)
# =============================================================================
RATELIMIT_USE_CACHE = 'default'
RATELIMIT_ENABLE = True
RATELIMIT_VIEW = 'core.ratelimit.ratelimited_handler'

# =============================================================================
# REST Framework
# =============================================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # Authentication disabled for testing — all endpoints are publicly accessible
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_THROTTLE_CLASSES': [
        'core.ratelimit.NormalAPIRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/min',
        'user': '200/min',
        'login_ip': '30/min',
        'login_user': '30/min',
        'password_reset': '60/min',
        'otp_verify': '60/min',
        'resend_otp': '60/min',
        'file_upload': '30/min',
        'admin_api': '60/min',
    },
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': (
        'djangorestframework_camel_case.render.CamelCaseJSONRenderer',
        'djangorestframework_camel_case.render.CamelCaseBrowsableAPIRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'djangorestframework_camel_case.parser.CamelCaseJSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser'
    ),
}


# =============================================================================
# JWT Settings
# =============================================================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# =============================================================================
# CORS
# =============================================================================
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://localhost:5173',
    cast=Csv()
)
CORS_ALLOW_CREDENTIALS = True

# =============================================================================
# Internationalization
# =============================================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# =============================================================================
# Static & Media Files — Local Storage
# =============================================================================
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Images are stored locally at: media/
# Served by Django dev server at: http://localhost:8000/media/<path>
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# =============================================================================
# File Upload Settings
# =============================================================================
MAX_UPLOAD_SIZE_MB = config('MAX_UPLOAD_SIZE_MB', default=10, cast=int)
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_BYTES

# =============================================================================
# MinIO Object Storage Config (kept for future production deployment)
# Currently using local filesystem storage (Django default).
# To enable MinIO, uncomment DEFAULT_FILE_STORAGE and the AWS_* settings below.
# =============================================================================
MINIO_ENDPOINT = config('MINIO_ENDPOINT', default='localhost:9000')
MINIO_ACCESS_KEY = config('MINIO_ACCESS_KEY', default='minioadmin')
MINIO_SECRET_KEY = config('MINIO_SECRET_KEY', default='minioadmin')
MINIO_BUCKET_NAME = config('MINIO_BUCKET_NAME', default='kaizenimages')
MINIO_USE_HTTPS = config('MINIO_USE_HTTPS', default=False, cast=bool)
MINIO_REGION = config('MINIO_REGION', default='us-east-1')

# Uncomment below to switch to MinIO storage in production:
# DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
# AWS_ACCESS_KEY_ID = MINIO_ACCESS_KEY
# AWS_SECRET_ACCESS_KEY = MINIO_SECRET_KEY
# AWS_STORAGE_BUCKET_NAME = MINIO_BUCKET_NAME
# AWS_S3_ENDPOINT_URL = ('https://' if MINIO_USE_HTTPS else 'http://') + MINIO_ENDPOINT
# AWS_S3_REGION_NAME = 'us-east-1'
# AWS_DEFAULT_ACL = None
# AWS_QUERYSTRING_AUTH = True
# AWS_QUERYSTRING_EXPIRE = 3600
# AWS_S3_FILE_OVERWRITE = False
# AWS_S3_VERIFY = False
# AWS_S3_SIGNATURE_VERSION = 's3v4'


# =============================================================================
# Default Primary Key Field Type
# =============================================================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =============================================================================
# Security Headers (enforced in production)
# =============================================================================
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True

# =============================================================================
# Logging
# =============================================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'kaizen_backend.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'kaizen': {
            'handlers': ['console', 'file'] if not DEBUG else ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

# =============================================================================
# SMTP Email Configuration
# =============================================================================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='').replace(' ', '')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='KSPG Cockpit <no-reply@kspg.local>')

