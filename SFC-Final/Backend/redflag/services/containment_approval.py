import logging
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from redflag.models import RedFlag, RedFlagContainment, Employee, StageHistory, RedFlagAuditLog
from redflag.enums import Status, ContainmentStatus, QaCustodianStatus
from redflag.exceptions import UnprocessableEntity, ConflictError
from redflag.permissions import user_roles, ROLE_PLANT_HEAD, ROLE_QUALITY_CUSTODIAN

logger = logging.getLogger(__name__)


def approve_containment(flag_id, user, notes='', ip=None, user_agent=''):
    """
    Quality Custodian approves physical containment & quarantine controls.
    Stamps verifier and verification timestamp.
    """
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    is_qa_custodian = ROLE_QUALITY_CUSTODIAN in roles
    employee = getattr(user, 'employee_profile', None)

    if not (is_plant_head or is_qa_custodian):
        raise PermissionDenied("Only Quality Custodian or Plant Head can approve containment.")

    with transaction.atomic():
        try:
            flag = RedFlag.objects.select_for_update().get(id=flag_id, deleted_at__isnull=True)
        except RedFlag.DoesNotExist:
            raise UnprocessableEntity("Red Flag not found.")

        current_attempt = RedFlagContainment.objects.filter(red_flag=flag, is_current=True).first()
        if not current_attempt:
            raise UnprocessableEntity("No current containment attempt found to approve.")

        # Check if already approved
        if current_attempt.status == ContainmentStatus.VERIFIED:
            raise ConflictError("Current containment attempt has already been verified and approved.")

        # Segregation of duties: unless Plant Head, verifier cannot be the person who took action
        if not is_plant_head and employee and current_attempt.action_taken_by_id == employee.id:
            raise PermissionDenied("Segregation of duties: The person who submitted containment cannot be the one who approves it.")

        verifier_emp = employee or flag.qa_custodian

        # 1. Update attempt
        current_attempt.status = ContainmentStatus.VERIFIED
        current_attempt.verified_by = verifier_emp
        current_attempt.verified_by_name = verifier_emp.label
        current_attempt.verified_at = timezone.now()
        current_attempt.save(update_fields=['status', 'verified_by', 'verified_by_name', 'verified_at'])

        # 2. Update Flag
        flag.qa_custodian_status = QaCustodianStatus.CONTAINMENT_APPROVED
        if notes:
            flag.qa_custodian_notes = notes.strip()
        flag.row_version += 1
        flag.save()

        # 3. StageHistory & AuditLog
        StageHistory.objects.create(
            red_flag=flag,
            stage='Containment',
            event='CONTAINMENT_APPROVED',
            completed_at=timezone.now(),
            completed_by=verifier_emp,
            completed_by_name=verifier_emp.label,
            sign_off_role='Quality Custodian',
            notes=notes.strip() or f"Containment attempt #{current_attempt.attempt_no} verified and approved.",
            from_status=flag.status,
            to_status=flag.status,
        )

        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='CONTAINMENT_APPROVED',
            changes={
                'qa_custodian_status': ['', QaCustodianStatus.CONTAINMENT_APPROVED],
                'containment_status': [ContainmentStatus.CONTAINED, ContainmentStatus.VERIFIED],
            },
            ip=ip,
            user_agent=user_agent,
        )

    logger.info("Containment approved for %s by %s", flag.red_flag_no, user.username)
    return flag, current_attempt


def reject_containment(flag_id, user, reason, ip=None, user_agent=''):
    """
    Quality Custodian rejects physical containment.
    Flag is reset to Open, requiring Target Person to redo Stage 2.
    """
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    is_qa_custodian = ROLE_QUALITY_CUSTODIAN in roles
    employee = getattr(user, 'employee_profile', None)

    if not (is_plant_head or is_qa_custodian):
        raise PermissionDenied("Only Quality Custodian or Plant Head can reject containment.")

    if not reason or not str(reason).strip():
        raise UnprocessableEntity({'reason': 'Rejection reason is required.'})

    reason_str = str(reason).strip()

    with transaction.atomic():
        try:
            flag = RedFlag.objects.select_for_update().get(id=flag_id, deleted_at__isnull=True)
        except RedFlag.DoesNotExist:
            raise UnprocessableEntity("Red Flag not found.")

        current_attempt = RedFlagContainment.objects.filter(red_flag=flag, is_current=True).first()
        if not current_attempt:
            raise UnprocessableEntity("No current containment attempt found to reject.")

        verifier_emp = employee or flag.qa_custodian
        old_status = flag.status

        # 1. Update attempt: marked Rejected
        current_attempt.status = ContainmentStatus.REJECTED
        current_attempt.rejection_reason = reason_str
        current_attempt.verified_by = verifier_emp
        current_attempt.verified_by_name = verifier_emp.label
        current_attempt.verified_at = timezone.now()
        current_attempt.save(update_fields=['status', 'rejection_reason', 'verified_by', 'verified_by_name', 'verified_at'])

        # 2. Update Flag: back to Open
        flag.status = Status.OPEN
        flag.qa_custodian_status = QaCustodianStatus.REVIEW_PENDING
        flag.row_version += 1
        flag.save()

        # 3. StageHistory & AuditLog
        StageHistory.objects.create(
            red_flag=flag,
            stage='Containment',
            event='CONTAINMENT_REJECTED',
            completed_at=timezone.now(),
            completed_by=verifier_emp,
            completed_by_name=verifier_emp.label,
            sign_off_role='Quality Custodian',
            notes=f"Containment rejected: {reason_str}",
            from_status=old_status,
            to_status=Status.OPEN,
        )

        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='CONTAINMENT_REJECTED',
            changes={
                'status': [old_status, Status.OPEN],
                'containment_status': [ContainmentStatus.CONTAINED, ContainmentStatus.REJECTED],
                'rejection_reason': ['', reason_str],
            },
            ip=ip,
            user_agent=user_agent,
        )

    logger.info("Containment rejected for %s by %s: %s", flag.red_flag_no, user.username, reason_str)
    return flag, current_attempt

