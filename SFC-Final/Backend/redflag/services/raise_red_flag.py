"""
Stage-1 write path: Raise a Red Flag.
All state transitions live in services/, never in views.
"""
import logging
from datetime import date, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from ..exceptions import UnprocessableEntity

from ..models import (
    RedFlag, RedFlagSequence, StageHistory, RedFlagAuditLog,
    Attachment, Employee, Department, Plant, Line, Station, ProductModel,
    RedFlagConfig,
)
from ..enums import Status, ContainmentStatus, QaCustodianStatus, AttachmentKind

logger = logging.getLogger(__name__)


def _next_sr_no(max_retries=10):
    """
    Generate the next sr_no under a row lock.
    Uses RedFlagSequence with select_for_update to prevent duplicates.
    Retries on transient lock contention (e.g. SQLite concurrent threads).
    """
    import time
    for attempt in range(max_retries):
        try:
            with transaction.atomic():
                seq, _ = RedFlagSequence.objects.get_or_create(name='redflag')
                seq = RedFlagSequence.objects.select_for_update().get(name='redflag')
                seq.last_value += 1
                seq.save(update_fields=['last_value'])
                return seq.last_value
        except Exception as e:
            if 'locked' in str(e).lower() and attempt < max_retries - 1:
                time.sleep(0.05 * (attempt + 1))
                continue
            raise


def _generate_red_flag_no(plant_code, sr_no):
    """Generate flag number: RF-{plant_code}-{sr_no:03d}"""
    return f"RF-{plant_code}-{sr_no:03d}"


def raise_red_flag(user, data, ip=None, user_agent=''):
    """
    Creates a new Red Flag (Stage 1 - Detection).

    Args:
        user: The authenticated Django User
        data: Dict with the raise payload (camelCase keys accepted)
        ip: Client IP
        user_agent: Client User-Agent

    Returns:
        The created RedFlag instance
    """
    from ..permissions import user_roles, ROLE_PLANT_HEAD

    config = RedFlagConfig.get_config()
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles

    # Resolve the raising employee
    employee = getattr(user, 'employee_profile', None)
    if not employee and user.is_authenticated:
        dept = Department.objects.filter(name__iexact=getattr(user, 'department', '')).first() or Department.objects.first()
        plant = Plant.objects.filter(code__iexact=getattr(user, 'plant', '')).first() or Plant.objects.first()
        emp_code = getattr(user, 'employee_id', None) or f"EMP-{user.username.upper()[:6]}"
        employee, _ = Employee.objects.get_or_create(
            user=user,
            defaults={
                'employee_code': emp_code,
                'full_name': user.get_full_name() or user.username,
                'designation': getattr(user, 'designation', 'Staff') or 'Staff',
                'department': dept,
                'plant': plant,
                'email': user.email or '',
                'is_active': True,
            }
        )
    if not employee:
        raise UnprocessableEntity("Your user account is not linked to an employee profile.")

    # --- Validate required fields ---
    required_fields = [
        'description', 'plant', 'line', 'station', 'model',
        'red_flag_type', 'severity', 'category_5m',
        'target_department', 'target_person',
    ]
    for f in required_fields:
        if not data.get(f):
            raise UnprocessableEntity({f: f"This field is required."})

    # Validate T0 photo
    evidence_attachment_id = data.get('evidence_attachment_id') or data.get('evidence_photo_id')
    evidence_photo_data = data.get('evidence_photo')

    if not evidence_attachment_id and not evidence_photo_data:
        raise UnprocessableEntity({
            'evidence_photo': 'T0 point-of-defect photo is required. Upload a photo first via /api/redflags/attachments.'
        })

    # --- Resolve FK references ---
    try:
        plant = Plant.objects.get(id=data['plant'], is_active=True)
    except Plant.DoesNotExist:
        raise UnprocessableEntity({'plant': 'Invalid plant.'})

    try:
        line = Line.objects.get(id=data['line'], plant=plant, is_active=True)
    except Line.DoesNotExist:
        raise UnprocessableEntity({'line': 'Invalid line for this plant.'})

    try:
        station = Station.objects.get(id=data['station'], line=line, is_active=True)
    except Station.DoesNotExist:
        raise UnprocessableEntity({'station': 'Invalid station for this line.'})

    try:
        model_obj = ProductModel.objects.get(id=data['model'], is_active=True)
    except ProductModel.DoesNotExist:
        raise UnprocessableEntity({'model': 'Invalid product model.'})

    try:
        target_department = Department.objects.get(id=data['target_department'], is_active=True)
    except Department.DoesNotExist:
        raise UnprocessableEntity({'target_department': 'Invalid target department.'})

    try:
        target_person = Employee.objects.get(id=data['target_person'], is_active=True)
    except Employee.DoesNotExist:
        raise UnprocessableEntity({'target_person': 'Invalid target person.'})

    # QA Custodian: use provided or default from plant
    qa_custodian_id = data.get('qa_custodian')
    if qa_custodian_id:
        try:
            qa_custodian = Employee.objects.get(id=qa_custodian_id, is_active=True)
        except Employee.DoesNotExist:
            raise UnprocessableEntity({'qa_custodian': 'Invalid QA custodian.'})
    elif plant.default_qa_custodian:
        qa_custodian = plant.default_qa_custodian
    else:
        qa_custodian = (
            Employee.objects.filter(department__code='QA', is_active=True).first()
            or Employee.objects.filter(user__groups__name='rf_quality_custodian', is_active=True).first()
            or employee
        )

    # Raised-by: from logged-in employee unless Plant Head overrides
    raised_by = employee
    raised_by_department = employee.department
    if is_plant_head and data.get('raised_by'):
        try:
            raised_by = Employee.objects.get(id=data['raised_by'], is_active=True)
            raised_by_department = raised_by.department
        except Employee.DoesNotExist:
            raise UnprocessableEntity({'raised_by': 'Invalid raised-by employee.'})

    # Target date: from data or config default
    target_date_str = data.get('target_date')
    if target_date_str:
        try:
            target_date_val = date.fromisoformat(target_date_str)
        except (ValueError, TypeError):
            raise UnprocessableEntity({'target_date': 'Invalid date format. Use YYYY-MM-DD.'})
    else:
        target_date_val = date.today() + timedelta(days=config.default_target_days)

    # Raised timestamp
    raised_at = timezone.now()
    raised_at_str = data.get('raised_at') or data.get('raised_timestamp')
    if raised_at_str:
        from django.utils.dateparse import parse_datetime
        parsed = parse_datetime(raised_at_str.replace(' ', 'T'))
        if parsed:
            if timezone.is_naive(parsed):
                from django.utils.timezone import make_aware
                parsed = make_aware(parsed)
            raised_at = parsed

    # Resolve evidence attachment
    if evidence_attachment_id:
        try:
            evidence_attachment = Attachment.objects.get(
                id=evidence_attachment_id,
                kind=AttachmentKind.T0_EVIDENCE
            )
        except (Attachment.DoesNotExist, ValueError):
            raise UnprocessableEntity({'evidence_attachment_id': 'Invalid attachment ID or wrong kind.'})
    else:
        # Legacy base64 data:image support for migration
        evidence_attachment = _handle_legacy_photo(
            evidence_photo_data, user, AttachmentKind.T0_EVIDENCE
        )

    # --- Create everything in one transaction ---
    with transaction.atomic():
        sr_no = _next_sr_no()
        red_flag_no = _generate_red_flag_no(plant.code, sr_no)

        flag = RedFlag.objects.create(
            sr_no=sr_no,
            red_flag_no=red_flag_no,
            status=Status.OPEN,
            raised_at=raised_at,
            raised_by=raised_by,
            raised_by_name=raised_by.label,
            raised_by_department=raised_by_department,
            raised_by_department_name=raised_by_department.name,
            raised_by_role=data.get('raised_by_role', ''),
            target_department=target_department,
            target_department_name=target_department.name,
            target_person=target_person,
            target_person_name=target_person.label,
            team_leader=data.get('team_leader', ''),
            plant=plant,
            plant_name=plant.code,
            line=line,
            line_name=line.name,
            station=station,
            station_name=station.name,
            model=model_obj,
            model_name=model_obj.name,
            red_flag_type=data['red_flag_type'],
            red_flag_sub_type=data.get('red_flag_sub_type', ''),
            severity=data['severity'],
            category_5m=data['category_5m'],
            repetitive_occurrence=data.get('repetitive_occurrence', 'First Time'),
            description=data['description'],
            evidence_photo=evidence_attachment,
            qa_custodian=qa_custodian,
            qa_custodian_name=qa_custodian.label,
            qa_custodian_status=QaCustodianStatus.REVIEW_PENDING,
            closure_responsibility=qa_custodian,
            target_date=target_date_val,
        )

        # Link attachment to flag
        evidence_attachment.red_flag = flag
        evidence_attachment.save(update_fields=['red_flag'])

        # StageHistory: Detection
        StageHistory.objects.create(
            red_flag=flag,
            stage='Detection',
            event='RAISED',
            completed_at=raised_at,
            completed_by=raised_by,
            completed_by_name=raised_by.label,
            sign_off_role='Initiator',
            notes=f"Red Flag {red_flag_no} raised by {raised_by.label}.",
            from_status='',
            to_status=Status.OPEN,
        )

        # AuditLog
        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='RAISED',
            changes={'event': ['', 'Stage 1 Detection raised']},
            ip=ip,
            user_agent=user_agent,
        )

    logger.info("Red Flag %s raised by %s", red_flag_no, user.username)
    return flag


def _handle_legacy_photo(photo_data, user, kind):
    """
    Handle legacy base64 data:image/jpeg|png|webp;base64,... format.
    Decode, validate, store to MinIO, return Attachment.
    SVG is rejected.
    """
    import base64
    import re

    if not photo_data or not isinstance(photo_data, str):
        raise UnprocessableEntity({'evidence_photo': 'Invalid photo data.'})

    # Check for SVG
    if 'svg' in photo_data.lower():
        raise UnprocessableEntity({'evidence_photo': 'SVG images are not accepted.'})

    # Match data URL pattern
    match = re.match(r'^data:image/(jpeg|png|webp);base64,(.+)$', photo_data, re.IGNORECASE)
    if not match:
        raise UnprocessableEntity({'evidence_photo': 'Invalid base64 image format. Only JPEG, PNG, WebP data URLs are accepted.'})

    img_format = match.group(1).lower()
    b64_data = match.group(2)

    try:
        raw_bytes = base64.b64decode(b64_data)
    except Exception:
        raise UnprocessableEntity({'evidence_photo': 'Invalid base64 encoding.'})

    import io
    return _process_and_store_attachment(io.BytesIO(raw_bytes), f"legacy.{img_format}", user, kind)


def _process_and_store_attachment(file_obj, filename, user, kind):
    """Process image file and create Attachment record."""
    from ..storage import validate_and_process_image, upload_to_minio

    processed_bytes, content_type, width, height, sha256_hex = validate_and_process_image(file_obj)
    object_key = upload_to_minio(processed_bytes, content_type, kind)

    attachment = Attachment.objects.create(
        kind=kind,
        bucket=settings.AWS_STORAGE_BUCKET_NAME,
        object_key=object_key,
        original_name=filename,
        content_type=content_type,
        size_bytes=len(processed_bytes),
        width=width,
        height=height,
        sha256=sha256_hex,
        uploaded_by=user,
    )
    return attachment

