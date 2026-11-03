import logging
from datetime import date
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from redflag.models import (
    RedFlag, RedFlagClosure, Attachment, Employee, StageHistory, RedFlagAuditLog
)
from redflag.enums import Status, QaCustodianStatus, AttachmentKind
from redflag.exceptions import UnprocessableEntity
from redflag.permissions import user_roles, ROLE_PLANT_HEAD, ROLE_QUALITY_CUSTODIAN, GROUP_PLANT_HEAD

logger = logging.getLogger(__name__)


def close_red_flag(flag_id, user, data, ip=None, user_agent=''):
    """
    Closes a Red Flag with dual QA and Plant Head sign-offs.
    Allowed only from status Under-Sustenance.
    Requires 3-month sustenance achieved unless authorized by Plant Head with earlyClosureReason.
    """
    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    is_qa_custodian = ROLE_QUALITY_CUSTODIAN in roles
    employee = getattr(user, 'employee_profile', None)

    if not (is_plant_head or is_qa_custodian):
        raise PermissionDenied("Only Quality Custodian or Plant Head can authorize closure.")

    with transaction.atomic():
        try:
            flag = RedFlag.objects.select_for_update().get(id=flag_id, deleted_at__isnull=True)
        except RedFlag.DoesNotExist:
            raise UnprocessableEntity("Red Flag not found.")

        # 1. Status check: only from Under-Sustenance
        if flag.status != Status.UNDER_SUSTENANCE:
            raise UnprocessableEntity(f"Flag can only be closed from Under-Sustenance status (current status: {flag.status}).")

        # 2. Check sustenance achieved vs early closure
        early_reason = (data.get('earlyClosureReason') or data.get('early_closure_reason') or '').strip()

        if early_reason:
            if not is_plant_head:
                raise PermissionDenied("Only Plant Head can authorize early closure.")
        else:
            if not flag.sustenance_achieved:
                raise UnprocessableEntity(
                    "Sustenance period (3 months zero recurrence) has not been achieved. "
                    "Early closure requires Plant Head authorization with a mandatory reason."
                )

        # 3. Closure evidence photo (mandatory)
        evidence_id = (
            data.get('closureEvidence') or
            data.get('closure_evidence') or
            data.get('closureEvidenceId') or
            data.get('closure_evidence_id') or
            data.get('closure_photo_attachment_id')
        )
        evidence_att = None
        if evidence_id:
            try:
                evidence_att = Attachment.objects.get(id=evidence_id, kind=AttachmentKind.CLOSURE_EVIDENCE)
            except Attachment.DoesNotExist:
                # Fallback to any attachment matching ID
                try:
                    evidence_att = Attachment.objects.get(id=evidence_id)
                except Attachment.DoesNotExist:
                    raise UnprocessableEntity({'closureEvidence': 'Invalid closure evidence attachment ID.'})
        else:
            raise UnprocessableEntity({'closureEvidence': 'Closure evidence document/photo is required.'})

        evidence_att.red_flag = flag
        evidence_att.save(update_fields=['red_flag'])

        # 4. Approvers: QA and Production (Plant Head)
        qa_emp_id = data.get('approvedByQa') or data.get('approved_by_qa')
        if qa_emp_id:
            try:
                qa_emp = Employee.objects.get(id=qa_emp_id, is_active=True)
            except Employee.DoesNotExist:
                raise UnprocessableEntity({'approvedByQa': 'Invalid QA approver employee.'})
        else:
            qa_emp = flag.qa_custodian or employee

        prod_emp_id = data.get('approvedByProduction') or data.get('approved_by_production')
        if prod_emp_id:
            try:
                prod_emp = Employee.objects.get(id=prod_emp_id, is_active=True)
            except Employee.DoesNotExist:
                raise UnprocessableEntity({'approvedByProduction': 'Invalid Production approver employee.'})
        else:
            prod_emp = flag.plant.plant_head or (employee if is_plant_head else None)

        if not prod_emp:
            raise UnprocessableEntity({'approvedByProduction': 'Production/Plant Head approver is required.'})

        # Validate that approvedByProduction is indeed in rf_plant_head group or superuser
        if prod_emp.user:
            prod_user_groups = set(prod_emp.user.groups.values_list('name', flat=True))
            if not (prod_emp.user.is_superuser or GROUP_PLANT_HEAD in prod_user_groups):
                raise UnprocessableEntity({
                    'approvedByProduction': f"Employee '{prod_emp.label}' does not have Plant Head authority."
                })

        # 5. Validation trial fields
        shifts = int(data.get('validationTrialShifts', data.get('validation_trial_shifts', 0)))
        results = (data.get('validationTrialResults') or data.get('validation_trial_results') or '').strip()

        raw_closure_date = data.get('closureDate') or data.get('closure_date')
        if raw_closure_date:
            try:
                closure_date = date.fromisoformat(raw_closure_date)
            except (ValueError, TypeError):
                closure_date = timezone.localdate()
        else:
            closure_date = timezone.localdate()

        # 6. Create RedFlagClosure
        closure_obj = RedFlagClosure.objects.create(
            red_flag=flag,
            validation_trial_shifts=shifts,
            validation_trial_results=results,
            closure_date=closure_date,
            closure_evidence=evidence_att,
            approved_by_qa=qa_emp,
            approved_by_qa_name=qa_emp.label,
            approved_by_production=prod_emp,
            approved_by_production_name=prod_emp.label,
            early_closure_reason=early_reason,
            closed_by=user,
        )

        # 7. Update Flag
        flag.status = Status.CLOSED
        flag.qa_custodian_status = QaCustodianStatus.CLOSED_APPROVED
        flag.closed_early = bool(early_reason)
        flag.row_version += 1
        flag.save()

        # 8. StageHistory & AuditLog
        notes_detail = f"Closed approved by QA ({qa_emp.label}) and Plant Head ({prod_emp.label})."
        if early_reason:
            notes_detail += f" Early closure reason: {early_reason}"

        StageHistory.objects.create(
            red_flag=flag,
            stage='Effectiveness',
            event='CLOSED',
            completed_at=timezone.now(),
            completed_by=employee or qa_emp,
            completed_by_name=(employee or qa_emp).label,
            sign_off_role='Plant Head' if is_plant_head else 'Quality Custodian',
            notes=notes_detail,
            from_status=Status.UNDER_SUSTENANCE,
            to_status=Status.CLOSED,
        )

        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='CLOSED',
            changes={
                'status': [Status.UNDER_SUSTENANCE, Status.CLOSED],
                'qa_custodian_status': [QaCustodianStatus.IN_SUSTENANCE, QaCustodianStatus.CLOSED_APPROVED],
                'closed_early': [False, flag.closed_early],
            },
            ip=ip,
            user_agent=user_agent,
        )

    logger.info("Red Flag %s closed successfully (early=%s)", flag.red_flag_no, flag.closed_early)
    return flag, closure_obj

