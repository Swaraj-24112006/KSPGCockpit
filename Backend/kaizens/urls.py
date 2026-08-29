"""
Kaizen URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KaizenViewSet, KaizenEvidenceViewSet
from .photo_views import KaizenPhotoUploadView, KaizenPhotoUrlsView, KaizenPhotoDeleteView

router = DefaultRouter()
router.register(r'kaizens', KaizenViewSet, basename='kaizen')

urlpatterns = [
    path('', include(router.urls)),

    # Nested evidence endpoints
    path(
        'kaizens/<int:kaizen_pk>/evidence/',
        KaizenEvidenceViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='kaizen-evidence-list',
    ),
    path(
        'kaizens/<int:kaizen_pk>/evidence/<int:pk>/',
        KaizenEvidenceViewSet.as_view({'delete': 'destroy'}),
        name='kaizen-evidence-detail',
    ),

    # MinIO Photo Upload & Retrieval
    # POST /api/v1/kaizens/<pk>/upload-photo/
    path(
        'kaizens/<int:pk>/upload-photo/',
        KaizenPhotoUploadView.as_view(),
        name='kaizen-photo-upload',
    ),
    # GET /api/v1/kaizens/<pk>/photo-urls/
    path(
        'kaizens/<int:pk>/photo-urls/',
        KaizenPhotoUrlsView.as_view(),
        name='kaizen-photo-urls',
    ),
    # DELETE /api/v1/kaizens/<pk>/delete-photo/<photo_type>/
    path(
        'kaizens/<int:pk>/delete-photo/<str:photo_type>/',
        KaizenPhotoDeleteView.as_view(),
        name='kaizen-photo-delete',
    ),
]
