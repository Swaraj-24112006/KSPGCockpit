"""
URL configuration for safety_backend project.
Includes the reusable 'safety' app API under /api/ and serves dist/ when available.
"""

from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('safety.urls')),
]

dist_dir = settings.BASE_DIR.parent / 'dist'
dist_index = dist_dir / 'index.html'

if dist_dir.exists():
    urlpatterns += static('/assets/', document_root=dist_dir / 'assets')

if dist_index.exists():
    def serve_frontend_spa(request):
        return FileResponse(open(dist_index, 'rb'), content_type='text/html')

    urlpatterns.append(
        re_path(r'^(?!api/|admin/|static/|media/).*$', serve_frontend_spa)
    )

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
