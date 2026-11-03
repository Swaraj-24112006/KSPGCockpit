import logging
from datetime import date, timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from ..models import (
    RedFlag, SustenanceCheck, RedFlagContainment, RedFlagRootCause,
    Attachment, Employee, StageHistory, RedFlagAuditLog, RedFlagConfig
)
from ..enums import Status, CheckStatus, QaCustodianStatus, ContainmentStatus, AttachmentKind
from ..exceptions import UnprocessableEntity, ConflictError
from ..permissions import user_roles, ROLE_PLANT_HEAD, ROLE_QUALITY_CUSTODIAN

logger = logging.getLogger(__name__)


def start_sustenance(flag_id, user, notes='', standardization_updates=None, start_date=None, ip=None, user_agent=''):
    """
    Quality Custodian verifies CAPA and initiates the 3-month (30/60/90 days) sustenance watch.
    Creates 3 SustenanceCheck rows for the current cycle.
    """
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    is_qa_custodian = ROLE_QUALITY_CUSTODIAN in roles
    employee = getattr(user, 'employee_profile', None)

    if not (is_plant_head or is_qa_custodian):
        raise PermissionDenied("Only Quality Custodian or Plant Head can start sustenance tracking.")

    config = RedFlagConfig.get_config()

    with transaction.atomic():
        try:
            flag = RedFlag.objects.select_for_update().get(id=flag_id, deleted_at__isnull=True)
        except RedFlag.DoesNotExist:
            raise UnprocessableEntity("Red Flag not found.")

        # 1. Preconditions from B4
        if flag.status == Status.OPEN:
            raise UnprocessableEntity("Immediate containment must be submitted and verified before starting sustenance.")

        if flag.status == Status.CLOSED:
            raise UnprocessableEntity("Cannot start sustenance on a closed Red Flag.")

        if flag.status == Status.UNDER_SUSTENANCE:
            raise ConflictError(f"Flag is already under sustenance tracking for Cycle {flag.sustenance_cycle}.")

        # Check if containment exists
        current_containment = RedFlagContainment.objects.filter(red_flag=flag, is_current=True).first()
        if not current_containment:
            raise UnprocessableEntity("No containment attempt on file. Containment is required before sustenance.")

        # Auto-mark containment Verified if not already
        if current_containment.status != ContainmentStatus.VERIFIED:
            verifier = employee or flag.qa_custodian
            current_containment.status = ContainmentStatus.VERIFIED
            current_containment.verified_by = verifier
            current_containment.verified_by_name = verifier.label
            current_containment.verified_at = timezone.now()
            current_containment.save(update_fields=['status', 'verified_by', 'verified_by_name', 'verified_at'])

        # Check if Root Cause exists
        root_cause_obj = getattr(flag, 'root_cause', None)
        if not root_cause_obj or not root_cause_obj.root_cause or not root_cause_obj.permanent_action:
            raise UnprocessableEntity("Stage 3 5-Why root cause and systematic permanent action are required before starting sustenance.")

        # Check if checks for this cycle already exist (starting twice returns 409)
        if SustenanceCheck.objects.filter(red_flag=flag, cycle_no=flag.sustenance_cycle).exists():
            raise ConflictError(f"Sustenance checks for cycle {flag.sustenance_cycle} already exist.")

        # Apply any standardization updates if provided
        if standardization_updates and isinstance(standardization_updates, dict):
            if 'sopUpdated' in standardization_updates:
                root_cause_obj.sop_updated = bool(standardization_updates['sopUpdated'])
            if 'pfmeaUpdated' in standardization_updates:
                root_cause_obj.pfmea_updated = bool(standardization_updates['pfmeaUpdated'])
            if 'controlPlanUpdated' in standardization_updates:
                root_cause_obj.control_plan_updated = bool(standardization_updates['controlPlanUpdated'])
            if 'onePointLessonIssued' in standardization_updates:
                root_cause_obj.opl_issued = bool(standardization_updates['onePointLessonIssued'])
            root_cause_obj.save()

        # 2. Schedule dates for 3 checks (default 30, 60, 90 days from start_date)
        if start_date is None:
            start_date = timezone.localdate()
        elif isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)

        check_days = config.sustenance_check_days if len(config.sustenance_check_days) == 3 else [30, 60, 90]

        for idx, days_offset in enumerate(check_days, start=1):
            target_days_val = 30 if idx == 1 else (60 if idx == 2 else 90)
            SustenanceCheck.objects.create(
                red_flag=flag,
                cycle_no=flag.sustenance_cycle,
                month=idx,
                target_days=target_days_val,
                scheduled_date=start_date + timedelta(days=days_offset),
                status=CheckStatus.PENDING,
            )

        # 3. Update Flag
        old_status = flag.status
        flag.sustenance_start_date = start_date
        flag.status = Status.UNDER_SUSTENANCE
        flag.qa_custodian_status = QaCustodianStatus.IN_SUSTENANCE
        flag.sustenance_achieved = False
        flag.row_version += 1
        flag.save()

        qa_emp = employee or flag.qa_custodian

        # 4. StageHistory: CAPA Verified then Sustenance Started
        StageHistory.objects.create(
            red_flag=flag,
            stage='CAPA',
            event='CAPA_VERIFIED',
            completed_at=timezone.now(),
            completed_by=qa_emp,
            completed_by_name=qa_emp.label,
            sign_off_role='Quality Custodian',
            notes="Corrective and Preventive Actions verified by Quality Custodian.",
            from_status=old_status,
            to_status=old_status,
        )

        StageHistory.objects.create(
            red_flag=flag,
            stage='Sustenance',
            event='SUSTENANCE_STARTED',
            completed_at=timezone.now(),
            completed_by=qa_emp,
            completed_by_name=qa_emp.label,
            sign_off_role='Quality Custodian',
            notes=notes.strip() or f"90-Day sustenance watch started for Cycle {flag.sustenance_cycle}.",
            from_status=old_status,
            to_status=Status.UNDER_SUSTENANCE,
        )

        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='SUSTENANCE_STARTED',
            changes={
                'status': [old_status, Status.UNDER_SUSTENANCE],
                'qa_custodian_status': ['', QaCustodianStatus.IN_SUSTENANCE],
                'sustenance_start_date': ['', str(start_date)],
            },
            ip=ip,
            user_agent=user_agent,
        )

    logger.info("Sustenance started for %s (cycle #%d)", flag.red_flag_no, flag.sustenance_cycle)
    return flag


def log_month_check(flag_id, month, user, data, ip=None, user_agent=''):
    """
    Logs 30/60/90-day sustenance audit results (Passed | Recurrence Detected).
    Enforces audit order, scheduling rules, and immutability.
    """
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    is_qa_custodian = ROLE_QUALITY_CUSTODIAN in roles
    employee = getattr(user, 'employee_profile', None)

    if not (is_plant_head or is_qa_custodian):
        raise PermissionDenied("Only Quality Custodian or Plant Head can log sustenance audit results.")

    if month not in (1, 2, 3):
        raise UnprocessableEntity("Month must be 1, 2, or 3.")

    config = RedFlagConfig.get_config()

    with transaction.atomic():
        try:
            flag = RedFlag.objects.select_for_update().get(id=flag_id, deleted_at__isnull=True)
        except RedFlag.DoesNotExist:
            raise UnprocessableEntity("Red Flag not found.")

        # 1. State check
        if flag.status != Status.UNDER_SUSTENANCE:
            raise UnprocessableEntity(f"Flag must be Under-Sustenance to log an audit check (current status: {flag.status}).")

        # 2. Find check for this month in current cycle
        check = SustenanceCheck.objects.filter(
            red_flag=flag, cycle_no=flag.sustenance_cycle, month=month
        ).first()

        if not check:
            raise UnprocessableEntity(f"No scheduled check found for Cycle {flag.sustenance_cycle} Month {month}.")

        # 3. Immutability: logged checks are immutable (Plant Head correction only)
        if check.status in (CheckStatus.PASSED, CheckStatus.RECURRENCE_DETECTED) and not is_plant_head:
            raise UnprocessableEntity(f"Month {month} audit check has already been logged ({check.status}) and is immutable.")

        # 4. Audit sequence order
        if month == 2:
            m1 = SustenanceCheck.objects.filter(red_flag=flag, cycle_no=flag.sustenance_cycle, month=1).first()
            if not m1 or m1.status != CheckStatus.PASSED:
                raise UnprocessableEntity("Month 1 audit must be Passed before Month 2 audit can be logged.")
        elif month == 3:
            m2 = SustenanceCheck.objects.filter(red_flag=flag, cycle_no=flag.sustenance_cycle, month=2).first()
            if not m2 or m2.status != CheckStatus.PASSED:
                raise UnprocessableEntity("Month 2 audit must be Passed before Month 3 audit can be logged.")

        # 5. Schedule date enforcement
        raw_date = data.get('auditDate') or data.get('audit_date')
        if raw_date:
            try:
                audit_date = date.fromisoformat(raw_date)
            except (ValueError, TypeError):
                audit_date = timezone.localdate()
        else:
            audit_date = timezone.localdate()

        if config.enforce_sustenance_schedule and not is_plant_head:
            earliest_allowed = check.scheduled_date - timedelta(days=config.sustenance_audit_grace_days)
            if audit_date < earliest_allowed:
                raise UnprocessableEntity(
                    f"Audit cannot be performed before {earliest_allowed} "
                    f"(scheduled date {check.scheduled_date} with {config.sustenance_audit_grace_days}-day grace window)."
                )

        # 6. Status validation
        status_val = data.get('status')
        if status_val not in (CheckStatus.PASSED, CheckStatus.RECURRENCE_DETECTED):
            raise UnprocessableEntity({'status': "Audit status must be either 'Passed' or 'Recurrence Detected'."})

        observations = (data.get('observations') or '').strip()
        if status_val == CheckStatus.RECURRENCE_DETECTED and not observations:
            raise UnprocessableEntity({'observations': "Observations are mandatory when a recurrence is detected."})

        # Photo evidence
        photo_att = None
        photo_id = data.get('photoAttachmentId') or data.get('photo_id') or data.get('photoEvidence')
        if photo_id and isinstance(photo_id, str) and not photo_id.startswith('http') and not photo_id.startswith('data:'):
            try:
                photo_att = Attachment.objects.get(id=photo_id)
            except (Attachment.DoesNotExist, ValueError):
                pass

        auditor_emp = employee or flag.qa_custodian

        # 7. Update SustenanceCheck
        check.status = status_val
        check.audit_date = audit_date
        check.auditor = auditor_emp
        check.auditor_name = auditor_emp.label
        check.observations = observations
        if photo_att:
            check.photo = photo_att
        check.save()

        # 8. Handle Effects: Recurrence vs Passed
        if status_val == CheckStatus.RECURRENCE_DETECTED:
            # Decision 3: Flag returns to In-Progress, failed cycle is kept, advances to cycle n+1
            flag.status = Status.IN_PROGRESS
            flag.sustenance_achieved = False
            flag.qa_custodian_status = QaCustodianStatus.REVIEW_PENDING
            flag.sustenance_cycle += 1
            flag.row_version += 1
            flag.save()

            StageHistory.objects.create(
                red_flag=flag,
                stage='Sustenance',
                event='AUDIT_LOGGED',
                completed_at=timezone.now(),
                completed_by=auditor_emp,
                completed_by_name=auditor_emp.label,
                sign_off_role='Quality Custodian',
                notes=f"Recurrence detected during Month {month} audit: {observations}. Sustenance watch failed. Flag reopened for CAPA review.",
                from_status=Status.UNDER_SUSTENANCE,
                to_status=Status.IN_PROGRESS,
            )

            RedFlagAuditLog.objects.create(
                red_flag=flag,
                actor=user,
                action='AUDIT_LOGGED',
                changes={
                    'status': [Status.UNDER_SUSTENANCE, Status.IN_PROGRESS],
                    f'month_{month}_check': ['Pending', CheckStatus.RECURRENCE_DETECTED],
                    'cycle_no': [flag.sustenance_cycle - 1, flag.sustenance_cycle],
                },
                ip=ip,
                user_agent=user_agent,
            )
        else:
            # Passed
            if month == 3:
                # All 3 Passed! Status stays Under-Sustenance until explicit closure
                flag.sustenance_achieved = True
                flag.row_version += 1
                flag.save()

            StageHistory.objects.create(
                red_flag=flag,
                stage='Sustenance',
                event='AUDIT_LOGGED',
                completed_at=timezone.now(),
                completed_by=auditor_emp,
                completed_by_name=auditor_emp.label,
                sign_off_role='Quality Custodian',
                notes=f"Month {month} Sustenance Audit Passed. {observations}".strip(),
                from_status=flag.status,
                to_status=flag.status,
            )

            RedFlagAuditLog.objects.create(
                red_flag=flag,
                actor=user,
                action='AUDIT_LOGGED',
                changes={
                    f'month_{month}_check': ['Pending', CheckStatus.PASSED],
                    'sustenance_achieved': [False, flag.sustenance_achieved],
                },
                ip=ip,
                user_agent=user_agent,
            )

    logger.info("Month %d audit logged for %s: %s", month, flag.red_flag_no, status_val)
    return flag, check

