"""
Workflow URL Configuration
"""

from django.urls import path
from .views import approve_kaizen, reject_kaizen, rework_kaizen, classify_kaizen, workflow_history

urlpatterns = [
    path('kaizens/<int:kaizen_id>/approve/', approve_kaizen, name='kaizen-approve'),
    path('kaizens/<int:kaizen_id>/reject/', reject_kaizen, name='kaizen-reject'),
    path('kaizens/<int:kaizen_id>/rework/', rework_kaizen, name='kaizen-rework'),
    path('kaizens/<int:kaizen_id>/classify/', classify_kaizen, name='kaizen-classify'),
    path('kaizens/<int:kaizen_id>/workflow-history/', workflow_history, name='kaizen-workflow-history'),
]
