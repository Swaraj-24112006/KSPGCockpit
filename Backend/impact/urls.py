"""
Impact URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    impact_assessment_view,
    impact_items_view,
    impact_item_detail,
    ImpactActionViewSet,
    resources_view,
    resource_detail,
)

router = DefaultRouter()
router.register(r'impact-actions', ImpactActionViewSet, basename='impact-action')

urlpatterns = [
    # Impact Actions (standalone)
    path('', include(router.urls)),

    # Nested under kaizens
    path('kaizens/<int:kaizen_id>/impact-assessment/', impact_assessment_view, name='impact-assessment'),
    path('kaizens/<int:kaizen_id>/impact-items/', impact_items_view, name='impact-items'),
    path('kaizens/<int:kaizen_id>/impact-items/<int:item_id>/', impact_item_detail, name='impact-item-detail'),
    path('kaizens/<int:kaizen_id>/resources/', resources_view, name='resources'),
    path('kaizens/<int:kaizen_id>/resources/<int:resource_id>/', resource_detail, name='resource-detail'),
]
