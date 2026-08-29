"""
Health check URL configuration.
"""

from django.urls import path
from core.health import health_check

urlpatterns = [
    path('', health_check, name='health-check'),
]
