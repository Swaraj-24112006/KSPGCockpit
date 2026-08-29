"""
Audit Views & Serializers
"""

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import AuditLog
from accounts.permissions import IsAdmin
from core.pagination import StandardPagination


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    kaizen_sr_no = serializers.CharField(source='kaizen.sr_no', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'kaizen', 'kaizen_sr_no',
            'action', 'action_display',
            'previous_value', 'new_value',
            'timestamp', 'remarks', 'ip_address',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def audit_log_list(request):
    """
    GET /api/v1/audit-logs/
    Admin-only: View audit trail with filters.
    """
    queryset = AuditLog.objects.select_related('user', 'kaizen').all()

    # Filters
    user_id = request.query_params.get('user')
    kaizen_id = request.query_params.get('kaizen')
    action = request.query_params.get('action')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    if user_id:
        queryset = queryset.filter(user_id=user_id)
    if kaizen_id:
        queryset = queryset.filter(kaizen_id=kaizen_id)
    if action:
        queryset = queryset.filter(action=action)
    if date_from:
        queryset = queryset.filter(timestamp__date__gte=date_from)
    if date_to:
        queryset = queryset.filter(timestamp__date__lte=date_to)

    paginator = StandardPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = AuditLogSerializer(queryset[:100], many=True)
    return Response({'success': True, 'data': serializer.data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def kaizen_audit_log(request, kaizen_id):
    """
    GET /api/v1/kaizens/<id>/audit-log/
    View audit trail for a specific Kaizen.
    """
    queryset = AuditLog.objects.filter(
        kaizen_id=kaizen_id
    ).select_related('user').order_by('-timestamp')

    serializer = AuditLogSerializer(queryset, many=True)
    return Response({'success': True, 'data': serializer.data})
