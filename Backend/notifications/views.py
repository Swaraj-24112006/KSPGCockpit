"""
Notification Views
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer
from core.pagination import StandardPagination


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """GET /api/v1/notifications/ — Current user's notifications."""
    queryset = Notification.objects.filter(
        recipient=request.user
    ).select_related('kaizen')

    # Optional filters
    is_read = request.query_params.get('is_read')
    if is_read is not None:
        queryset = queryset.filter(is_read=is_read.lower() == 'true')

    notification_type = request.query_params.get('type')
    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)

    paginator = StandardPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = NotificationSerializer(queryset, many=True)
    return Response({'success': True, 'data': serializer.data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """GET /api/v1/notifications/unread-count/ — Count of unread notifications."""
    count = Notification.objects.filter(
        recipient=request.user, is_read=False
    ).count()
    return Response({'success': True, 'data': {'unread_count': count}})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, notification_id):
    """POST /api/v1/notifications/<id>/read/ — Mark a notification as read."""
    try:
        notification = Notification.objects.get(
            pk=notification_id, recipient=request.user
        )
    except Notification.DoesNotExist:
        return Response({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Notification not found.', 'details': {}}
        }, status=status.HTTP_404_NOT_FOUND)

    notification.is_read = True
    notification.save(update_fields=['is_read'])
    return Response({'success': True, 'message': 'Notification marked as read.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """POST /api/v1/notifications/mark-all-read/ — Mark all as read."""
    updated = Notification.objects.filter(
        recipient=request.user, is_read=False
    ).update(is_read=True)
    return Response({
        'success': True,
        'message': f'{updated} notification(s) marked as read.'
    })
