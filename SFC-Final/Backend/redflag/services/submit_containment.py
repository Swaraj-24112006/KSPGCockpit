import io
import re
import base64
import logging
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import PermissionDenied

from ..models import (
    RedFlag, RedFlagContainment, Attachment, Employee, StageHistory, RedFlagAuditLog, RedFlagConfig
)
from ..enums import Status, ContainmentStatus, AttachmentKind
from ..exceptions import UnprocessableEntity
from ..permissions import user_roles, ROLE_PLANT_HEAD, ROLE_TARGET_PERSON, GROUP_TARGET_PERSON

logger = logging.getLogger(__name__)


def format_gap_label(gap_minutes):
    """Formats integer gap minutes into a human-readable string like '1 hr 20 mins'."""
    if gap_minutes < 60:
        return f"{gap_minutes} mins"
    hours = gap_minutes // 60
    mins = gap_minutes % 60
    if mins == 0:
        return f"{hours} hr{'s' if hours > 1 else ''}"
    return f"{hours} hr{'s' if hours > 1 else ''} {mins} mins"


def submit_containment(flag_id, user, data, ip=None, user_agent=''):
    """
    Submits Stage 2 immediate containment & quarantine action.
    Moves status from Open to Contained.
    """
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    employee = getattr(user, 'employee_profile', None)

    with transaction.atomic():
        try:
            flag = RedFlag.objects.select_for_update().get(id=flag_id, deleted_at__isnull=True)
        except RedFlag.DoesNotExist:
            raise UnprocessableEntity("Red Flag not found.")

        # 1. State check
        if flag.status != Status.OPEN:
            raise UnprocessableEntity(f"Containment can only be submitted when status is Open (current status: {flag.status}).")

        # 2. Permission check: Target Person, target dept member with group, or Plant Head
        is_authorized = False
        if is_plant_head:
            is_authorized = True
        elif employee:
            if flag.target_person_id == employee.id:
                is_authorized = True
            elif flag.target_department_id == employee.department_id and ROLE_TARGET_PERSON in roles:
                is_authorized = True

        if not is_authorized:
            raise PermissionDenied("You do not have permission to submit containment for this Red Flag.")

        # 3. Action taken by employee
        action_emp = employee
        req_emp = data.get('actionTakenBy') or data.get('action_taken_by')
        if req_emp:
            from .raise_red_flag import _is_uuid
            if _is_uuid(req_emp):
                found = Employee.objects.filter(id=req_emp, is_active=True).first()
                if found:
                    action_emp = found
            else:
                emp_str = str(req_emp).strip()
                core = emp_str.split('(')[0].strip() if '(' in emp_str else emp_str
                found = Employee.objects.filter(full_name__icontains=core, is_active=True).first()
                if not found:
                    found = Employee.objects.filter(full_name__icontains=emp_str, is_active=True).first()
                if found:
                    action_emp = found
        if not action_emp and flag.target_person:
            action_emp = flag.target_person
        if not action_emp:
            action_emp = employee

        if not action_emp:
            raise UnprocessableEntity("Your user account is not linked to an employee profile.")

        # 4. Containment timestamp & gap calculation
        contained_at = timezone.now()
        raw_ts = data.get('containedAt') or data.get('contained_at') or data.get('containmentTimestamp')
        if raw_ts:
            parsed = parse_datetime(raw_ts.replace(' ', 'T') if isinstance(raw_ts, str) else '')
            if parsed:
                if timezone.is_naive(parsed):
                    from django.utils.timezone import make_aware
                    parsed = make_aware(parsed)
                contained_at = parsed

        if contained_at < flag.raised_at:
            raise UnprocessableEntity({'containedAt': 'Containment timestamp cannot be earlier than defect raised timestamp.'})

        gap_minutes = max(0, int((contained_at - flag.raised_at).total_seconds() // 60))

        # 5. Quarantine & sorting fields
        suspect_qty = int(data.get('suspectQtyQuarantined') or data.get('suspect_qty_quarantined') or data.get('suspect_qty') or 0)
        if suspect_qty < 0:
            raise UnprocessableEntity({'suspectQtyQuarantined': 'Quarantine quantity cannot be negative.'})

        quarantine_loc = data.get('quarantineLocation') or data.get('quarantine_location')
        if not quarantine_loc or not str(quarantine_loc).strip():
            raise UnprocessableEntity({'quarantineLocation': 'Quarantine location is required.'})

        quarantine_tag = data.get('quarantineTagNo') or data.get('quarantine_tag_no') or f"QT-{flag.red_flag_no}"

        sorting_inspected = int(data.get('sortingQtyInspected') or data.get('sorting_qty_inspected') or data.get('sorting_inspected') or 0)
        sorting_ok = int(data.get('sortingQtyOk') or data.get('sorting_qty_ok') or data.get('sorting_ok') or 0)
        sorting_rejected = int(data.get('sortingQtyRejected') or data.get('sorting_qty_rejected') or data.get('sorting_rejected') or 0)

        if sorting_inspected < 0 or sorting_ok < 0 or sorting_rejected < 0:
            raise UnprocessableEntity("Sorting quantities cannot be negative.")

        if sorting_ok + sorting_rejected > sorting_inspected:
            raise UnprocessableEntity("Sum of OK and Rejected sorting quantities cannot exceed total inspected quantity.")

        containment_action = data.get('containmentAction') or data.get('containment_action') or data.get('action_text') or data.get('immediateActionTaken')
        if not containment_action or not str(containment_action).strip():
            raise UnprocessableEntity({'containmentAction': 'Immediate containment action description is required.'})

        # 6. Countermeasure Photo (T1)
        photo_att_id = (
            data.get('countermeasurePhotoId') or
            data.get('countermeasure_photo_id') or
            data.get('photo_id') or
            data.get('attachment_id') or
            data.get('photo_attachment_id')
        )
        photo_b64 = data.get('countermeasurePhoto') or data.get('countermeasure_photo')

        photo_attachment = None
        if photo_att_id:
            try:
                photo_attachment = Attachment.objects.get(id=photo_att_id)
            except Attachment.DoesNotExist:
                raise UnprocessableEntity({'countermeasurePhoto': 'Invalid countermeasure photo attachment ID.'})
        elif photo_b64 and isinstance(photo_b64, str):
            from .raise_red_flag import _handle_legacy_photo
            if photo_b64.startswith('http'):
                key_candidate = photo_b64.split('?')[0].split('/')[-1]
                photo_attachment = Attachment.objects.filter(object_key__icontains=key_candidate).first()
                if not photo_attachment:
                    photo_attachment = _handle_legacy_photo('data:image/svg+xml;utf8,<svg></svg>', user, AttachmentKind.T1_CONTAINMENT)
            else:
                photo_attachment = _handle_legacy_photo(photo_b64, user, AttachmentKind.T1_CONTAINMENT)
        else:
            raise UnprocessableEntity({'countermeasurePhoto': 'T1 physical containment photo is required.'})

        photo_attachment.red_flag = flag
        photo_attachment.save(update_fields=['red_flag'])

        # 7. Create new attempt, marking previous current as False
        RedFlagContainment.objects.filter(red_flag=flag, is_current=True).update(is_current=False)
        attempt_no = flag.containment_attempts.count() + 1

        containment = RedFlagContainment.objects.create(
            red_flag=flag,
            attempt_no=attempt_no,
            is_current=True,
            action_taken_by=action_emp,
            action_taken_by_name=action_emp.label,
            contained_at=contained_at,
            gap_minutes=gap_minutes,
            suspect_qty=suspect_qty,
            quarantine_tag_no=quarantine_tag,
            quarantine_location=quarantine_loc.strip(),
            sorting_inspected=sorting_inspected,
            sorting_ok=sorting_ok,
            sorting_rejected=sorting_rejected,
            action_text=containment_action.strip(),
            photo=photo_attachment,
            status=ContainmentStatus.CONTAINED,
        )

        # 8. Update Flag
        flag.status = Status.CONTAINED
        flag.row_version += 1
        flag.save()

        # 9. Audit & StageHistory
        StageHistory.objects.create(
            red_flag=flag,
            stage='Containment',
            event='CONTAINMENT_SUBMITTED',
            completed_at=contained_at,
            completed_by=action_emp,
            completed_by_name=action_emp.label,
            sign_off_role='Target Person',
            notes=f"Containment attempt #{attempt_no} submitted by {action_emp.label}.",
            from_status=Status.OPEN,
            to_status=Status.CONTAINED,
        )

        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='CONTAINMENT_SUBMITTED',
            changes={
                'status': [Status.OPEN, Status.CONTAINED],
                'attempt_no': [attempt_no - 1, attempt_no],
                'gap_minutes': [0, gap_minutes],
            },
            ip=ip,
            user_agent=user_agent,
        )

    logger.info("Containment submitted for %s (attempt #%d)", flag.red_flag_no, attempt_no)
    return flag, containment

