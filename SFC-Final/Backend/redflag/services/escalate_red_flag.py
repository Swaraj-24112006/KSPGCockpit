import logging
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from redflag.models import (
    RedFlag, EscalationLink, Employee, StageHistory, RedFlagAuditLog, RedFlagConfig
)
from redflag.enums import (
    Status, EscalationModule, EscalationState
)
from redflag.exceptions import UnprocessableEntity, BadGateway
from redflag.permissions import (
    user_roles, ROLE_PLANT_HEAD, ROLE_QUALITY_CUSTODIAN, ROLE_TARGET_PERSON
)
from .escalation import (
    TargetEscalationError,
    build_ppsr_payload,
    build_kaizen_payload,
    build_fives_red_tag_payload,
    get_escalation_adapter,
    BridgeEscalationAdapter,
)

logger = logging.getLogger(__name__)


def escalate_red_flag(flag_id, module: str, user, ip=None, user_agent='', adapter=None):
    """
    Executes cross-module escalation to PPSR, Kaizen, or 5S Red Tag.
    Idempotent: repeat calls return the existing link without re-creating target records.
    Never changes the Red Flag's status.
    """
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    is_qa_custodian = ROLE_QUALITY_CUSTODIAN in roles
    employee = getattr(user, 'employee_profile', None)

    config = RedFlagConfig.get_config()

    try:
        flag = RedFlag.objects.select_related(
            'plant', 'line', 'station', 'model',
            'raised_by', 'raised_by_department',
            'target_department', 'target_person',
            'qa_custodian', 'evidence_photo', 'closure_responsibility',
            'root_cause', 'closure'
        ).prefetch_related('containment_attempts', 'escalation_links').get(id=flag_id, deleted_at__isnull=True)
    except RedFlag.DoesNotExist:
        raise UnprocessableEntity("Red Flag not found.")

    # 1. Gating rule: flag must not be Closed
    if flag.status == Status.CLOSED:
        raise UnprocessableEntity("Cannot escalate a closed Red Flag.")

    # 2. Permissions & module-specific gating
    if module == EscalationModule.PPSR:
        if not (is_plant_head or is_qa_custodian):
            raise PermissionDenied("Only Quality Custodian or Plant Head can escalate to 8D PPSR.")

    elif module == EscalationModule.KAIZEN:
        if not (is_plant_head or is_qa_custodian):
            raise PermissionDenied("Only Quality Custodian or Plant Head can convert to Kaizen Poka-Yoke.")

        rc = getattr(flag, 'root_cause', None)
        if not rc or not rc.permanent_action or not rc.permanent_action.strip():
            raise UnprocessableEntity("Submit root cause and permanent action first.")

    elif module == EscalationModule.FIVES_RED_TAG:
        is_target_authorized = False
        if is_plant_head or is_qa_custodian:
            is_target_authorized = True
        elif employee:
            if flag.target_person_id == employee.id:
                is_target_authorized = True
            elif flag.target_department_id == employee.department_id and ROLE_TARGET_PERSON in roles:
                is_target_authorized = True

        if not is_target_authorized:
            raise PermissionDenied("Only Target Person, Quality Custodian, or Plant Head can link to 5S Red Tag.")

        current_containment = flag.containment_attempts.filter(is_current=True).first()
        if not current_containment or current_containment.suspect_qty <= 0:
            raise UnprocessableEntity(
                "Containment with suspect quarantined quantity greater than 0 is required for 5S Red Tag."
            )

    else:
        raise UnprocessableEntity(f"Unsupported escalation module: {module}")

    # 3. Idempotency check: if link already exists, return existing link immediately
    existing_link = EscalationLink.objects.filter(red_flag=flag, target_module=module).first()
    if existing_link:
        logger.info("Red Flag %s already escalated to %s (ref: %s). Returning existing link.",
                    flag.red_flag_no, module, existing_link.target_no)
        return flag, existing_link, existing_link.payload, False

    # 4. Build module payload
    if module == EscalationModule.PPSR:
        payload = build_ppsr_payload(flag, user, config)
    elif module == EscalationModule.KAIZEN:
        payload = build_kaizen_payload(flag, user, config)
    elif module == EscalationModule.FIVES_RED_TAG:
        payload = build_fives_red_tag_payload(flag, user, config)

    # 5. Call Target Adapter
    if adapter is None:
        adapter = get_escalation_adapter(module)

    try:
        ref_id, ref_no, target_record = adapter.create_from_red_flag(module, flag, user, payload)
    except TargetEscalationError as e:
        logger.error("Escalation failed for %s -> %s: %s", flag.red_flag_no, module, e.message)
        raise BadGateway(f"Failed to escalate to {module}: {e.message}")
    except Exception as e:
        logger.exception("Unexpected error in escalation adapter for %s -> %s: %s", flag.red_flag_no, module, e)
        raise BadGateway(f"Failed to escalate to {module}: {str(e)}")

    # 6. Atomic database creation: link + history + audit log
    with transaction.atomic():
        # Concurrency safety: check or get_or_create under lock
        state = EscalationState.LINKED if isinstance(adapter, BridgeEscalationAdapter) else EscalationState.PENDING_TARGET

        link, created = EscalationLink.objects.get_or_create(
            red_flag=flag,
            target_module=module,
            defaults={
                'target_ref_id': ref_id,
                'target_no': ref_no,
                'state': state,
                'payload': payload,
                'created_by': user,
            }
        )

        if not created:
            return flag, link, target_record, False

        # Stage mapping per C3:
        # PPSR -> stage: RootCause
        # Kaizen -> stage: CAPA
        # 5S Red Tag -> stage: Containment
        if module == EscalationModule.PPSR:
            stage_name = 'RootCause'
            notes_text = f"Escalated to 8D PPSR: {ref_no}"
        elif module == EscalationModule.KAIZEN:
            stage_name = 'CAPA'
            notes_text = f"Converted to Kaizen Poka-Yoke: {ref_no}"
        elif module == EscalationModule.FIVES_RED_TAG:
            stage_name = 'Containment'
            notes_text = f"Linked to 5S Red Tag Holding: {ref_no}"

        acting_emp = employee or flag.qa_custodian or flag.target_person
        sign_off_role = roles[0] if roles else 'Employee'

        StageHistory.objects.create(
            red_flag=flag,
            stage=stage_name,
            event='ESCALATED',
            completed_at=timezone.now(),
            completed_by=acting_emp,
            completed_by_name=acting_emp.label if acting_emp else user.username,
            sign_off_role=sign_off_role,
            notes=notes_text,
            from_status=flag.status,
            to_status=flag.status,  # Escalation never changes flag status!
        )

        # Audit log
        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='ESCALATED',
            changes={f'escalation_{module.lower()}': ['', ref_no]},
            ip=ip,
            user_agent=user_agent
        )

    logger.info("Successfully escalated %s to %s with number %s", flag.red_flag_no, module, ref_no)
    return flag, link, target_record, True

