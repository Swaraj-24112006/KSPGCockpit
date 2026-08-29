from django.urls import path
from .views import notification_list, unread_count, mark_read, mark_all_read

urlpatterns = [
    path('notifications/', notification_list, name='notification-list'),
    path('notifications/unread-count/', unread_count, name='notification-unread-count'),
    path('notifications/<int:notification_id>/read/', mark_read, name='notification-read'),
    path('notifications/mark-all-read/', mark_all_read, name='notification-mark-all-read'),
]
