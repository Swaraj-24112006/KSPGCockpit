"""
Stage-1 write path: Raise a Red Flag.
All state transitions live in services/, never in views.
"""
import logging
import uuid
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


def _is_uuid(val):
    if not val:
        return False
    if isinstance(val, uuid.UUID):
        return True
    try:
        uuid.UUID(str(val).strip())
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _next_sr_no(max_retries=10):
    """
    Generate the next sr_no under a row lock.
    Uses RedFlagSequence with select_for_update to prevent duplicates.
    Retries on transient lock contention.
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
    clean_code = plant_code.replace('-', '').upper() if plant_code else 'MF1'
    return f"RF-{clean_code}-{sr_no:03d}"


def raise_red_flag(user, data, ip=None, user_agent=''):
    """
    Creates a new Red Flag (Stage 1 - Detection).

    Args:
        user: The authenticated Django User
        data: Dict with the raise payload (camelCase and snake_case accepted)
        ip: Client IP
        user_agent: Client User-Agent

    Returns:
        The created RedFlag instance
    """
    from ..permissions import user_roles, ROLE_PLANT_HEAD

    config = RedFlagConfig.get_config()
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles

    def _val(*keys, default=None):
        for k in keys:
            if k in data and data[k] is not None and str(data[k]).strip() != '':
                return data[k]
        return default

    # Resolve the raising employee
    employee = getattr(user, 'employee_profile', None)
    if not employee and user.is_authenticated:
        dept = Department.objects.filter(name__iexact=getattr(user, 'department', '')).first() or Department.objects.first()
        plant_fallback = Plant.objects.filter(code__iexact=getattr(user, 'plant', '')).first() or Plant.objects.first()
        emp_code = getattr(user, 'employee_id', None) or f"EMP-{user.username.upper()[:6]}"
        employee, _ = Employee.objects.get_or_create(
            user=user,
            defaults={
                'employee_code': emp_code,
                'full_name': user.get_full_name() or user.username,
                'designation': getattr(user, 'designation', 'Staff') or 'Staff',
                'department': dept,
                'plant': plant_fallback,
                'email': user.email or '',
                'is_active': True,
            }
        )
    if not employee:
        raise UnprocessableEntity("Your user account is not linked to an employee profile.")

    # --- Extract input fields supporting both camelCase and snake_case ---
    description = _val('description')
    plant_val = _val('plant', 'plant_id', 'plantId')
    line_val = _val('line', 'line_id', 'lineId')
    station_val = _val('station', 'station_id', 'stationId')
    model_val = _val('model', 'model_id', 'modelId')
    red_flag_type = _val('red_flag_type', 'redFlagType')
    red_flag_sub_type = _val('red_flag_sub_type', 'redFlagSubType', default='')
    severity = _val('severity', default='Major')
    category_5m = _val('category_5m', 'category5M')
    target_dept_val = _val('target_department', 'targetDepartment', 'target_department_id', 'targetDepartmentId')
    target_person_val = _val('target_person', 'targetPerson', 'target_person_id', 'targetPersonId')
    qa_custodian_val = _val('qa_custodian', 'qaCustodian', 'qa_custodian_id', 'qaCustodianId')
    repetitive_occurrence = _val('repetitive_occurrence', 'repetitiveOccurrence', default='First Time')
    team_leader = _val('team_leader', 'teamLeader', default='')
    raised_by_role = _val('raised_by_role', 'raisedByRole', default='')
    target_date_str = _val('target_date', 'targetDate')
    raised_at_str = _val('raised_at', 'raisedAt', 'raised_timestamp', 'raisedTimestamp')
    evidence_attachment_id = _val('evidence_attachment_id', 'evidenceAttachmentId', 'evidence_photo_id', 'evidencePhotoId')
    evidence_photo_data = _val('evidence_photo', 'evidencePhoto')

    # Validate essential fields
    if not description:
        raise UnprocessableEntity({'description': 'Description is required.'})
    if not plant_val:
        raise UnprocessableEntity({'plant': 'Plant / Mini-Factory is required.'})
    if not red_flag_type:
        raise UnprocessableEntity({'red_flag_type': 'Red Flag Type is required.'})
    if not category_5m:
        raise UnprocessableEntity({'category_5m': '5M Category is required.'})
    if not target_dept_val:
        raise UnprocessableEntity({'target_department': 'Target Department is required.'})
    if not target_person_val:
        raise UnprocessableEntity({'target_person': 'Target Person is required.'})

    # Validate T0 photo presence
    if not evidence_attachment_id and not evidence_photo_data:
        raise UnprocessableEntity({
            'evidence_photo': 'T0 point-of-defect photo is required. Upload a photo or select a preset.'
        })

    # --- Resilient FK resolutions (by UUID or Code or Name) ---
    # 1. Plant
    plant = None
    if _is_uuid(plant_val):
        plant = Plant.objects.filter(id=plant_val, is_active=True).first()
    if not plant:
        p_str = str(plant_val).strip()
        plant = Plant.objects.filter(code__iexact=p_str, is_active=True).first()
        if not plant:
            plant = Plant.objects.filter(name__icontains=p_str, is_active=True).first()
    if not plant:
        plant = Plant.objects.filter(is_active=True).first()
    if not plant:
        raise UnprocessableEntity({'plant': 'Invalid plant.'})

    # 2. Line
    line = None
    if _is_uuid(line_val):
        line = Line.objects.filter(id=line_val, is_active=True).first()
    if not line and line_val:
        l_str = str(line_val).strip()
        line = Line.objects.filter(name__icontains=l_str, plant=plant, is_active=True).first()
        if not line:
            line = Line.objects.filter(name__icontains=l_str, is_active=True).first()
        if not line:
            line, _ = Line.objects.get_or_create(
                name=l_str,
                plant=plant,
                defaults={'is_active': True}
            )
    if not line:
        line = Line.objects.filter(plant=plant, is_active=True).first() or Line.objects.first()
    if not line:
        raise UnprocessableEntity({'line': 'Invalid line for this plant.'})

    # 3. Station
    station = None
    if _is_uuid(station_val):
        station = Station.objects.filter(id=station_val, is_active=True).first()
    if not station and station_val:
        s_str = str(station_val).strip()
        station = Station.objects.filter(name__icontains=s_str, line=line, is_active=True).first()
        if not station:
            station = Station.objects.filter(name__icontains=s_str, is_active=True).first()
        if not station:
            station, _ = Station.objects.get_or_create(
                name=s_str,
                line=line,
                defaults={'is_active': True}
            )
    if not station:
        station = Station.objects.filter(line=line, is_active=True).first() or Station.objects.first()
    if not station:
        raise UnprocessableEntity({'station': 'Invalid station for this line.'})

    # 4. Product Model
    model_obj = None
    if _is_uuid(model_val):
        model_obj = ProductModel.objects.filter(id=model_val, is_active=True).first()
    if not model_obj and model_val:
        m_str = str(model_val).strip()
        model_obj = ProductModel.objects.filter(name__icontains=m_str, is_active=True).first()
        if not model_obj:
            model_obj, _ = ProductModel.objects.get_or_create(
                name=m_str,
                defaults={'is_active': True}
            )
    if not model_obj:
        model_obj = ProductModel.objects.filter(is_active=True).first()
    if not model_obj:
        raise UnprocessableEntity({'model': 'Invalid product model.'})

    # 5. Target Department
    target_department = None
    if _is_uuid(target_dept_val):
        target_department = Department.objects.filter(id=target_dept_val, is_active=True).first()
    if not target_department and target_dept_val:
        d_str = str(target_dept_val).strip()
        target_department = Department.objects.filter(name__icontains=d_str, is_active=True).first()
        if not target_department:
            target_department = Department.objects.filter(code__iexact=d_str, is_active=True).first()
    if not target_department:
        target_department = Department.objects.filter(is_active=True).first()
    if not target_department:
        raise UnprocessableEntity({'target_department': 'Invalid target department.'})

    # 6. Target Person
    target_person = None
    if _is_uuid(target_person_val):
        target_person = Employee.objects.filter(id=target_person_val, is_active=True).first()
    if not target_person and target_person_val:
        tp_str = str(target_person_val).strip()
        core_name = tp_str.split('(')[0].strip() if '(' in tp_str else tp_str
        target_person = Employee.objects.filter(full_name__icontains=core_name, is_active=True).first()
        if not target_person:
            target_person = Employee.objects.filter(full_name__icontains=tp_str, is_active=True).first()
        if not target_person:
            target_person = Employee.objects.filter(employee_code__iexact=tp_str, is_active=True).first()
        if not target_person:
            code_suffix = uuid.uuid4().hex[:6].upper()
            target_person, _ = Employee.objects.get_or_create(
                full_name=tp_str,
                defaults={
                    'employee_code': f"EMP-{code_suffix}",
                    'department': target_department,
                    'plant': plant,
                    'designation': 'Target Area Lead',
                    'is_active': True,
                }
            )
    if not target_person:
        target_person = Employee.objects.filter(department=target_department, is_active=True).first() or Employee.objects.filter(is_active=True).first()
    if not target_person:
        raise UnprocessableEntity({'target_person': 'Invalid target person.'})

    # 7. QA Custodian
    qa_custodian = None
    if _is_uuid(qa_custodian_val):
        qa_custodian = Employee.objects.filter(id=qa_custodian_val, is_active=True).first()
    if not qa_custodian and qa_custodian_val:
        q_str = str(qa_custodian_val).strip()
        qa_custodian = Employee.objects.filter(full_name__icontains=q_str, is_active=True).first()
    if not qa_custodian and plant.default_qa_custodian:
        qa_custodian = plant.default_qa_custodian
    if not qa_custodian:
        qa_custodian = (
            Employee.objects.filter(department__code='QA', is_active=True).first()
            or Employee.objects.filter(user__groups__name='rf_quality_custodian', is_active=True).first()
            or employee
        )

    # Raised-by: from logged-in employee unless Plant Head overrides
    raised_by = employee
    raised_by_department = employee.department or Department.objects.first()
    if is_plant_head and _val('raised_by', 'raisedBy'):
        rb_val = _val('raised_by', 'raisedBy')
        if _is_uuid(rb_val):
            rb = Employee.objects.filter(id=rb_val, is_active=True).first()
            if rb:
                raised_by = rb
                raised_by_department = rb.department or raised_by_department
        else:
            rb_str = str(rb_val).strip()
            rb = Employee.objects.filter(full_name__icontains=rb_str, is_active=True).first()
            if rb:
                raised_by = rb
                raised_by_department = rb.department or raised_by_department

    # Target date: from data or config default
    if target_date_str:
        try:
            target_date_val = date.fromisoformat(str(target_date_str)[:10])
        except (ValueError, TypeError):
            target_date_val = date.today() + timedelta(days=config.default_target_days)
    else:
        target_date_val = date.today() + timedelta(days=config.default_target_days)

    # Raised timestamp
    raised_at = timezone.now()
    if raised_at_str:
        from django.utils.dateparse import parse_datetime
        parsed = parse_datetime(str(raised_at_str).replace(' ', 'T')[:19])
        if parsed:
            if timezone.is_naive(parsed):
                from django.utils.timezone import make_aware
                parsed = make_aware(parsed)
            raised_at = parsed

    # Resolve evidence attachment
    evidence_attachment = None
    if _is_uuid(evidence_attachment_id):
        try:
            evidence_attachment = Attachment.objects.get(
                id=evidence_attachment_id,
                kind=AttachmentKind.T0_EVIDENCE
            )
        except Attachment.DoesNotExist:
            evidence_attachment = None

    if not evidence_attachment:
        if evidence_photo_data:
            evidence_attachment = _handle_legacy_photo(
                evidence_photo_data, user, AttachmentKind.T0_EVIDENCE
            )
        else:
            raise UnprocessableEntity({
                'evidence_photo': 'T0 point-of-defect photo is required. Upload a photo or select a preset.'
            })

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
            raised_by_department_name=raised_by_department.name if raised_by_department else 'Production',
            raised_by_role=raised_by_role,
            target_department=target_department,
            target_department_name=target_department.name,
            target_person=target_person,
            target_person_name=target_person.label,
            team_leader=team_leader,
            plant=plant,
            plant_name=plant.code,
            line=line,
            line_name=line.name,
            station=station,
            station_name=station.name,
            model=model_obj,
            model_name=model_obj.name,
            red_flag_type=red_flag_type,
            red_flag_sub_type=red_flag_sub_type,
            severity=severity,
            category_5m=category_5m,
            repetitive_occurrence=repetitive_occurrence,
            description=description,
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
    Handle legacy base64 data:image/jpeg|png|webp;base64,... format or SVG presets.
    Decode, validate, store to MinIO, return Attachment.
    """
    import base64
    import re
    import io

    if not photo_data or not isinstance(photo_data, str):
        raise UnprocessableEntity({'evidence_photo': 'Invalid photo data.'})

    # Support demo SVG presets by generating a valid PNG placeholder
    if 'svg' in photo_data.lower() or 'image/svg' in photo_data.lower():
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (400, 250), color=(254, 242, 242))
        d = ImageDraw.Draw(img)
        d.rectangle([10, 10, 390, 240], outline=(225, 29, 72), width=3)
        d.text((25, 110), "Point-of-Defect T0 (Preset Evidence)", fill=(190, 18, 60))
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        raw_bytes = buf.getvalue()
        img_format = 'png'
        return _process_and_store_attachment(io.BytesIO(raw_bytes), f"preset_t0.{img_format}", user, kind)

    # Match data URL pattern
    match = re.match(r'^data:image/(jpeg|png|webp);base64,(.+)$', photo_data, re.IGNORECASE)
    if not match:
        try:
            raw_bytes = base64.b64decode(photo_data)
            img_format = 'png'
            return _process_and_store_attachment(io.BytesIO(raw_bytes), f"legacy.{img_format}", user, kind)
        except Exception:
            raise UnprocessableEntity({'evidence_photo': 'Invalid base64 image format. Only JPEG, PNG, WebP data URLs are accepted.'})

    img_format = match.group(1).lower()
    b64_data = match.group(2)

    try:
        raw_bytes = base64.b64decode(b64_data)
    except Exception:
        raise UnprocessableEntity({'evidence_photo': 'Invalid base64 encoding.'})

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
