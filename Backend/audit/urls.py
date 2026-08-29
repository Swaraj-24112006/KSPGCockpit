from django.urls import path
from .views import audit_log_list, kaizen_audit_log

urlpatterns = [
    path('audit-logs/', audit_log_list, name='audit-log-list'),
    path('kaizens/<int:kaizen_id>/audit-log/', kaizen_audit_log, name='kaizen-audit-log'),
]
