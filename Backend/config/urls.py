"""
Kaizen Backend — Root URL Configuration
========================================
All API endpoints are versioned under /api/v1/.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin panel
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/v1/auth/', include('accounts.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/v1/', include('kaizens.urls')),
    path('api/v1/', include('workflow.urls')),
    path('api/v1/', include('impact.urls')),
    path('api/v1/', include('verification.urls')),
    path('api/v1/', include('voting.urls')),
    path('api/v1/', include('notifications.urls')),
    path('api/v1/', include('audit.urls')),
    path('api/v1/', include('reports.urls')),
    path('api/v1/cft/', include('cft_awards.urls', namespace='cft_awards')),
    path('api/v1/ppsr/', include('ppsr.urls')),
    path('api/ppsr/', include('ppsr.urls')),

    # Health check
    path('api/v1/health/', include('core.health_urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
