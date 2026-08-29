"""
Workflow Views — Kaizen Approval, Rejection, Rework, Classification
Authentication disabled for testing phase.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone

from kaizens.models import Kaizen
from .models import WorkflowHistory
from .serializers import (
    WorkflowHistorySerializer,
    ApproveSerializer,
    RejectSerializer,
    ReworkSerializer,
    ClassifySerializer,
)
from core.exceptions import InvalidWorkflowTransition, KaizenAPIException


@api_view(['POST'])
@permission_classes([AllowAny])
def approve_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/approve/
    Approve a Kaizen (sets status to 'approved' or 'good_point').
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    if kaizen.status not in ('submitted', 'pending', 'draft'):
        raise InvalidWorkflowTransition(
            message=f'Cannot approve a Kaizen with status "{kaizen.get_status_display()}".',
            details={'current_status': kaizen.status, 'allowed_from': ['submitted', 'pending', 'draft']},
        )

    serializer = ApproveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    from_status = kaizen.status
    classification = serializer.validated_data.get('classification', 'kaizen')

    if classification == 'good_point':
        kaizen.status = 'good_point'
        kaizen.classification = 'good_point'
    else:
        kaizen.status = 'approved'
        kaizen.classification = 'kaizen'

    kaizen.approved_by = serializer.validated_data.get('remarks', 'Committee')
    kaizen.remark = serializer.validated_data.get('remarks', kaizen.remark)
    kaizen.save()

    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='approved' if classification != 'good_point' else 'good_point',
        from_status=from_status,
        to_status=kaizen.status,
        performed_by=None,
        remarks=serializer.validated_data.get('remarks', ''),
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} has been approved as {kaizen.get_classification_display()}.',
        'data': {'status': kaizen.status, 'classification': kaizen.classification},
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def reject_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/reject/
    Reject a Kaizen — reason is required.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    if kaizen.status not in ('submitted', 'pending', 'draft'):
        raise InvalidWorkflowTransition(
            message=f'Cannot reject a Kaizen with status "{kaizen.get_status_display()}".',
            details={'current_status': kaizen.status, 'allowed_from': ['submitted', 'pending', 'draft']},
        )

    serializer = RejectSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    from_status = kaizen.status
    kaizen.status = 'rejected'
    kaizen.remark = serializer.validated_data['reason']
    kaizen.save()

    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='rejected',
        from_status=from_status,
        to_status='rejected',
        performed_by=None,
        remarks=serializer.validated_data['reason'],
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} has been rejected.',
        'data': {'status': kaizen.status},
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def rework_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/rework/
    Return a Kaizen for correction/rework.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    if kaizen.status not in ('submitted', 'pending', 'draft'):
        raise InvalidWorkflowTransition(
            message=f'Cannot return a Kaizen with status "{kaizen.get_status_display()}" for rework.',
            details={'current_status': kaizen.status, 'allowed_from': ['submitted', 'pending', 'draft']},
        )

    serializer = ReworkSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    from_status = kaizen.status
    kaizen.status = 'rework'
    kaizen.remark = serializer.validated_data['remarks']
    kaizen.save()

    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='rework',
        from_status=from_status,
        to_status='rework',
        performed_by=None,
        remarks=serializer.validated_data['remarks'],
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} has been returned for rework.',
        'data': {'status': kaizen.status},
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def classify_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/classify/
    Change the classification of a Kaizen.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    serializer = ClassifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    old_classification = kaizen.classification
    kaizen.classification = serializer.validated_data['classification']
    kaizen.save(update_fields=['classification', 'updated_at'])

    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='classified',
        from_status=old_classification,
        to_status=kaizen.classification,
        performed_by=None,
        remarks=serializer.validated_data.get('remarks', ''),
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} classification changed to {kaizen.get_classification_display()}.',
        'data': {'classification': kaizen.classification},
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def workflow_history(request, kaizen_id):
    """
    GET /api/v1/kaizens/<id>/workflow-history/
    Get the complete workflow history for a Kaizen.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)
    history = WorkflowHistory.objects.filter(kaizen=kaizen).select_related('performed_by')
    serializer = WorkflowHistorySerializer(history, many=True)
    return Response({'success': True, 'data': serializer.data})
