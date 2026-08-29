"""
Verification Views — Verify and Close Kaizens
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from kaizens.models import Kaizen
from .models import KaizenVerification, KaizenClosure
from .serializers import (
    KaizenVerificationSerializer,
    KaizenClosureSerializer,
    VerifySerializer,
    CloseSerializer,
)
from workflow.models import WorkflowHistory
from accounts.permissions import IsVerifier
from core.exceptions import KaizenAPIException, ClosurePreConditionError


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/verify/
    Submit verification for a Kaizen.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    if kaizen.status not in ('approved', 'good_point'):
        raise KaizenAPIException(
            message='Only approved or good point Kaizens can be verified.',
            code='INVALID_STATE',
            status_code=422,
        )

    serializer = VerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    verification, created = KaizenVerification.objects.update_or_create(
        kaizen=kaizen,
        defaults={
            'verifier': request.user,
            'implementation_verified': serializer.validated_data['implementation_verified'],
            'evidence_verified': serializer.validated_data['evidence_verified'],
            'result_verified': serializer.validated_data['result_verified'],
            'benefits_verified': serializer.validated_data['benefits_verified'],
            'cost_savings_verified': serializer.validated_data['cost_savings_verified'],
            'impact_actions_verified': serializer.validated_data['impact_actions_verified'],
            'verification_remarks': serializer.validated_data.get('verification_remarks', ''),
            'verification_date': timezone.now(),
            'is_verified': all([
                serializer.validated_data['implementation_verified'],
                serializer.validated_data['evidence_verified'],
                serializer.validated_data['result_verified'],
                serializer.validated_data['benefits_verified'],
                serializer.validated_data['cost_savings_verified'],
                serializer.validated_data['impact_actions_verified'],
            ]),
        }
    )

    # Update Kaizen verified_by field
    kaizen.verified_by_name = request.user.get_full_name()
    kaizen.save(update_fields=['verified_by_name', 'updated_at'])

    # Record in workflow history
    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='verified',
        from_status=kaizen.status,
        to_status=kaizen.status,
        performed_by=request.user,
        remarks=f"Verification {'completed' if verification.is_verified else 'partial'}. "
                f"{serializer.validated_data.get('verification_remarks', '')}",
    )

    return Response({
        'success': True,
        'message': 'Verification submitted.' + (
            ' All checks passed.' if verification.is_verified else ' Some checks are pending.'
        ),
        'data': KaizenVerificationSerializer(verification).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_verification(request, kaizen_id):
    """
    GET /api/v1/kaizens/<id>/verification/
    Get verification status for a Kaizen.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)
    try:
        verification = kaizen.verification
        serializer = KaizenVerificationSerializer(verification)
        return Response({'success': True, 'data': serializer.data})
    except KaizenVerification.DoesNotExist:
        return Response({
            'success': True,
            'data': None,
            'message': 'No verification record exists yet.',
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_kaizen(request, kaizen_id):
    """
    POST /api/v1/kaizens/<id>/close/
    Close a Kaizen. Checks all pre-conditions before allowing closure.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    if kaizen.status not in ('approved', 'good_point'):
        raise KaizenAPIException(
            message='Only approved or good point Kaizens can be closed.',
            code='INVALID_STATE',
            status_code=422,
        )

    # Pre-condition checks
    failures = []

    # 1. Check verification
    try:
        verification = kaizen.verification
        if not verification.is_verified:
            failures.append('Verification is not complete. All checks must pass.')
    except KaizenVerification.DoesNotExist:
        failures.append('No verification record found. Kaizen must be verified first.')

    # 2. Check impact actions (if assessment exists)
    try:
        assessment = kaizen.impact_assessment
        open_actions = assessment.actions.filter(
            status__in=['open', 'in_progress', 'pending']
        ).count()
        if open_actions > 0:
            failures.append(
                f'{open_actions} impact action(s) still open. All must be completed or marked not required.'
            )

        open_items = assessment.impact_items.filter(
            required=True,
            status__in=['pending', 'in_progress']
        ).count()
        if open_items > 0:
            failures.append(
                f'{open_items} required impact item(s) still pending. Complete them first.'
            )
    except Exception:
        pass  # No assessment is OK — not all Kaizens need one

    if failures:
        raise ClosurePreConditionError(
            message='Cannot close Kaizen. Pre-conditions not met.',
            details={'failures': failures},
        )

    serializer = CloseSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    # Create closure record
    closure, _ = KaizenClosure.objects.update_or_create(
        kaizen=kaizen,
        defaults={
            'closed_by': request.user,
            'closure_date': timezone.now(),
            'closure_remarks': serializer.validated_data.get('closure_remarks', ''),
            'all_actions_completed': True,
        }
    )

    # Update Kaizen status
    from_status = kaizen.status
    kaizen.status = 'closed'
    kaizen.save(update_fields=['status', 'updated_at'])

    # Update impact assessment closure status if exists
    try:
        assessment = kaizen.impact_assessment
        assessment.overall_closure_status = 'fully_closed'
        assessment.closed_by = request.user
        assessment.closure_date = timezone.now()
        assessment.closure_remarks = serializer.validated_data.get('closure_remarks', '')
        assessment.save()
    except Exception:
        pass

    # Record in workflow history
    WorkflowHistory.objects.create(
        kaizen=kaizen,
        action='closed',
        from_status=from_status,
        to_status='closed',
        performed_by=request.user,
        remarks=serializer.validated_data.get('closure_remarks', 'Kaizen closed.'),
    )

    return Response({
        'success': True,
        'message': f'Kaizen {kaizen.sr_no} has been successfully closed.',
        'data': KaizenClosureSerializer(closure).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_closure(request, kaizen_id):
    """
    GET /api/v1/kaizens/<id>/closure/
    Get closure details for a Kaizen.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)
    try:
        closure = kaizen.closure
        serializer = KaizenClosureSerializer(closure)
        return Response({'success': True, 'data': serializer.data})
    except KaizenClosure.DoesNotExist:
        return Response({
            'success': True,
            'data': None,
            'message': 'Kaizen has not been closed yet.',
        })
