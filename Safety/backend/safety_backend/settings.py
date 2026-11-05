"""
Django settings for safety_backend project.
Integrated with PostgreSQL, MinIO Object Storage, and Role-Based Access Control.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# Security & Debug
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-safety-desk-monolith-key-change-in-production')
DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() in ('true', '1', 't')

allowed_hosts_raw = os.getenv('ALLOWED_HOSTS', '*')
if allowed_hosts_raw == '*':
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(',') if h.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'corsheaders',
    
    # Safety Desk Core Reusable App (Ready to merge into Monolith)
    'safety',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # High priority for frontend cross-origin
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'safety_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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

WSGI_APPLICATION = 'safety_backend.wsgi.application'

# ==============================================================================
# DATABASE CONFIGURATION (PostgreSQL with graceful local SQLite fallback)
# ==============================================================================
db_engine = os.getenv('DB_ENGINE', 'django.db.backends.postgresql')
db_name = os.getenv('DB_NAME', 'safety_db')
db_user = os.getenv('DB_USER', 'postgres')
db_password = os.getenv('DB_PASSWORD', 'postgres')
db_host = os.getenv('DB_HOST', 'localhost')
db_port = os.getenv('DB_PORT', '5432')
allow_fallback = os.getenv('DB_ALLOW_SQLITE_FALLBACK', 'True').lower() in ('true', '1', 't')

use_postgres = False
if db_engine == 'django.db.backends.postgresql':
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.0)
        s.connect((db_host, int(db_port)))
        s.close()
        use_postgres = True
    except Exception:
        use_postgres = not allow_fallback

if use_postgres:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': db_name,
            'USER': db_user,
            'PASSWORD': db_password,
            'HOST': db_host,
            'PORT': db_port,
        }
    }
else:
    # Local development SQLite fallback when Postgres is not currently running
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ==============================================================================
# MinIO OBJECT STORAGE CONFIGURATION (Easily editable)
# ==============================================================================
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
MINIO_CONSOLE_PORT = os.getenv('MINIO_CONSOLE_PORT', '9001')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
MINIO_BUCKET_NAME = os.getenv('MINIO_BUCKET_NAME', 'safety-media')
MINIO_SECURE = os.getenv('MINIO_SECURE', 'False').lower() in ('true', '1', 't')

# ==============================================================================
# CORS & CSRF CONFIGURATION
# ==============================================================================
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'True').lower() in ('true', '1', 't')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-persona-role',  # Allows fast intranet role switching during review
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
