import logging
from datetime import date
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from ..models import RedFlag, RedFlagRootCause, Employee, StageHistory, RedFlagAuditLog
from ..enums import Status
from ..exceptions import UnprocessableEntity
from ..permissions import (
    user_roles, ROLE_PLANT_HEAD, ROLE_QUALITY_CUSTODIAN, ROLE_TARGET_PERSON
)

logger = logging.getLogger(__name__)


def save_root_cause(flag_id, user, data, ip=None, user_agent=''):
    """
    Submits or updates Stage 3 Root Cause (5-Why) and Systematic Permanent Action.
    Moves status to In-Progress.
    """
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    is_qa_custodian = ROLE_QUALITY_CUSTODIAN in roles
    employee = getattr(user, 'employee_profile', None)

    with transaction.atomic():
        try:
            flag = RedFlag.objects.select_for_update().get(id=flag_id, deleted_at__isnull=True)
        except RedFlag.DoesNotExist:
            raise UnprocessableEntity("Red Flag not found.")

        # 1. Containment precondition
        if not flag.containment_attempts.exists():
            raise UnprocessableEntity("Stage 2 Immediate Containment must be submitted before Root Cause (5-Why).")

        # 2. State & Permission check
        if flag.status in (Status.OPEN, Status.CLOSED):
            raise UnprocessableEntity(f"Root cause cannot be submitted when status is {flag.status}.")

        if flag.status == Status.UNDER_SUSTENANCE and not (is_qa_custodian or is_plant_head):
            raise PermissionDenied("Only Quality Custodian or Plant Head can amend root cause once under sustenance.")

        is_authorized = False
        if is_plant_head or is_qa_custodian:
            is_authorized = True
        elif employee:
            if flag.target_person_id == employee.id:
                is_authorized = True
            elif flag.target_department_id == employee.department_id and ROLE_TARGET_PERSON in roles:
                is_authorized = True

        if not is_authorized:
            raise PermissionDenied("You do not have permission to submit root cause for this Red Flag.")

        # 3. Required fields
        root_cause_text = data.get('rootCause5Why') or data.get('root_cause_5_why') or data.get('root_cause')
        if not root_cause_text or not str(root_cause_text).strip():
            raise UnprocessableEntity({'rootCause5Why': '5-Why root cause analysis is required.'})

        permanent_action_text = data.get('systematicPermanentAction') or data.get('systematic_permanent_action') or data.get('permanent_action')
        if not permanent_action_text or not str(permanent_action_text).strip():
            raise UnprocessableEntity({'systematicPermanentAction': 'Systematic permanent corrective action is required.'})

        # Standardization updates
        std_updates = data.get('standardizationUpdates') or data.get('standardization_updates') or {}
        sop_updated = bool(std_updates.get('sopUpdated', std_updates.get('sop_updated', data.get('sop_updated', False))))
        pfmea_updated = bool(std_updates.get('pfmeaUpdated', std_updates.get('pfmea_updated', data.get('pfmea_updated', False))))
        control_plan_updated = bool(std_updates.get('controlPlanUpdated', std_updates.get('control_plan_updated', data.get('control_plan_updated', False))))
        opl_issued = bool(std_updates.get('onePointLessonIssued', std_updates.get('opl_issued', data.get('opl_issued', False))))

        # Target date update
        target_date_str = data.get('targetDate') or data.get('target_date')
        if target_date_str:
            try:
                flag.target_date = date.fromisoformat(target_date_str)
            except (ValueError, TypeError):
                pass

        submitting_emp = employee or flag.target_person

        # 4. Upsert RedFlagRootCause
        rc_obj, created = RedFlagRootCause.objects.update_or_create(
            red_flag=flag,
            defaults={
                'why1': data.get('why1') or data.get('why_1') or '',
                'why2': data.get('why2') or data.get('why_2') or '',
                'why3': data.get('why3') or data.get('why_3') or '',
                'why4': data.get('why4') or data.get('why_4') or '',
                'root_cause': str(root_cause_text).strip(),
                'permanent_action': str(permanent_action_text).strip(),
                'sop_updated': sop_updated,
                'pfmea_updated': pfmea_updated,
                'control_plan_updated': control_plan_updated,
                'opl_issued': opl_issued,
                'submitted_by': submitting_emp,
                'submitted_by_name': submitting_emp.label,
            }
        )

        old_status = flag.status
        if flag.status == Status.CONTAINED:
            flag.status = Status.IN_PROGRESS

        flag.row_version += 1
        flag.save()

        # 5. StageHistory & AuditLog
        StageHistory.objects.create(
            red_flag=flag,
            stage='RootCause',
            event='RCA_SUBMITTED',
            completed_at=timezone.now(),
            completed_by=submitting_emp,
            completed_by_name=submitting_emp.label,
            sign_off_role='Target Person' if not (is_qa_custodian or is_plant_head) else 'Quality Custodian',
            notes=f"5-Why root cause and systematic permanent action submitted by {submitting_emp.label}.",
            from_status=old_status,
            to_status=flag.status,
        )

        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='RCA_SUBMITTED',
            changes={
                'root_cause': ['', rc_obj.root_cause] if created else ['updated', rc_obj.root_cause],
                'status': [old_status, flag.status],
            },
            ip=ip,
            user_agent=user_agent,
        )

    logger.info("Root cause saved for %s", flag.red_flag_no)
    return flag, rc_obj

