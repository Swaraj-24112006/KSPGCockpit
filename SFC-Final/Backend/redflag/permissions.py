from typing import List, Any
from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()

# Role names & Group constants
GROUP_QUALITY_CUSTODIAN = 'rf_quality_custodian'
GROUP_PLANT_HEAD = 'rf_plant_head'
GROUP_TARGET_PERSON = 'rf_target_person'

ROLE_INITIATOR = 'Initiator'
ROLE_TARGET_PERSON = 'Target Person'
ROLE_QUALITY_CUSTODIAN = 'Quality Custodian'
ROLE_PLANT_HEAD = 'Plant Head'

def user_roles(user: User) -> List[str]:
    """
    Computes user roles based on group membership and superuser status.
    All authenticated users possess the implicit 'Initiator' role.
    Caches on user instance for the duration of the request to prevent N+1 queries.
    """
    if not user or not user.is_authenticated:
        return []
    
    if hasattr(user, '_cached_roles'):
        return user._cached_roles

    roles = [ROLE_INITIATOR]
    user_groups = set(user.groups.values_list('name', flat=True))

    if user.is_superuser or GROUP_PLANT_HEAD in user_groups:
        roles.append(ROLE_PLANT_HEAD)
    
    if user.is_superuser or GROUP_QUALITY_CUSTODIAN in user_groups:
        roles.append(ROLE_QUALITY_CUSTODIAN)

    if GROUP_TARGET_PERSON in user_groups:
        roles.append(ROLE_TARGET_PERSON)

    user._cached_roles = roles
    return roles

class IsQualityCustodian(permissions.BasePermission):
    """
    Allows access only to members of rf_quality_custodian group or superusers / Plant Heads.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return (
            user.is_superuser or 
            user.groups.filter(name__in=[GROUP_QUALITY_CUSTODIAN, GROUP_PLANT_HEAD]).exists()
        )

class IsPlantHead(permissions.BasePermission):
    """
    Allows access only to members of rf_plant_head group or superusers.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return (
            user.is_superuser or 
            user.groups.filter(name=GROUP_PLANT_HEAD).exists()
        )

class IsTargetPersonFor(permissions.BasePermission):
    """
    Object-level permission checking if user is the assigned target person,
    a target department member with rf_target_person, or a Plant Head.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser or user.groups.filter(name=GROUP_PLANT_HEAD).exists():
            return True

        employee = getattr(user, 'employee_profile', None)
        if not employee:
            return False

        # If obj has target_person FK or target_department
        target_person_emp = getattr(obj, 'target_person', None)
        if target_person_emp and target_person_emp.id == employee.id:
            return True

        target_department = getattr(obj, 'target_department', None)
        if (
            target_department and 
            employee.department_id == target_department.id and 
            user.groups.filter(name=GROUP_TARGET_PERSON).exists()
        ):
            return True

        return False



def allowed_actions(user: User, flag) -> List[str]:
    """
    Computes list of allowed action strings for the given user on the given RedFlag.
    Additive list based on user roles and flag lifecycle state.
    """
    if not user or not user.is_authenticated:
        return []

    if getattr(flag, 'deleted_at', None):
        return []

    roles = user_roles(user)
    is_plant_head = ROLE_PLANT_HEAD in roles
    is_qa_custodian = ROLE_QUALITY_CUSTODIAN in roles
    employee = getattr(user, 'employee_profile', None)

    actions = []

    from .enums import Status, ContainmentStatus, CheckStatus

    # 1. editDetails: raiser while status is Open; Quality Custodian until Closed; Plant Head always
    can_edit = False
    if is_plant_head:
        can_edit = True
    elif is_qa_custodian and flag.status != Status.CLOSED:
        can_edit = True
    elif flag.status == Status.OPEN and employee and flag.raised_by_id == employee.id:
        can_edit = True

    if can_edit:
        actions.append('editDetails')

    # 2. delete: Plant Head only
    if is_plant_head:
        actions.append('delete')

    # 3. submitContainment: Open status + target person / target dept / plant head
    is_target = False
    if is_plant_head:
        is_target = True
    elif employee:
        if flag.target_person_id == employee.id:
            is_target = True
        elif flag.target_department_id == employee.department_id and ROLE_TARGET_PERSON in roles:
            is_target = True

    if flag.status == Status.OPEN and is_target:
        actions.append('submitContainment')

    # 4. saveRootCause: Contained or In-Progress (or Under-Sustenance if QA/Plant Head)
    if flag.status in (Status.CONTAINED, Status.IN_PROGRESS) and (is_target or is_qa_custodian or is_plant_head):
        actions.append('saveRootCause')
    elif flag.status == Status.UNDER_SUSTENANCE and (is_qa_custodian or is_plant_head):
        actions.append('saveRootCause')

    # 5. approveContainment & rejectContainment: QA Custodian or Plant Head when status is Contained
    if flag.status == Status.CONTAINED and (is_qa_custodian or is_plant_head):
        current_attempt = getattr(flag, '_prefetched_current_containment', None)
        if current_attempt is None and hasattr(flag, 'containment_attempts'):
            current_attempt = flag.containment_attempts.filter(is_current=True).first()

        can_approve = True
        if not is_plant_head and employee and current_attempt and current_attempt.action_taken_by_id == employee.id:
            can_approve = False

        if can_approve:
            actions.append('approveContainment')
        actions.append('rejectContainment')

    # 6. startSustenance: QA Custodian or Plant Head when status is In-Progress (or Contained with RCA)
    if flag.status in (Status.IN_PROGRESS, Status.CONTAINED) and (is_qa_custodian or is_plant_head):
        has_containment = hasattr(flag, 'containment_attempts') and flag.containment_attempts.exists()
        has_rca = hasattr(flag, 'root_cause') and bool(getattr(flag, 'root_cause', None))
        if has_containment and has_rca:
            actions.append('startSustenance')

    # 7. logAudit:1|2|3: Under-Sustenance + QA Custodian or Plant Head
    if flag.status == Status.UNDER_SUSTENANCE and (is_qa_custodian or is_plant_head):
        checks = getattr(flag, '_prefetched_checks', None)
        if checks is None and hasattr(flag, 'sustenance_checks'):
            checks = {c.month: c for c in flag.sustenance_checks.filter(cycle_no=flag.sustenance_cycle)}

        if checks:
            m1 = checks.get(1)
            m2 = checks.get(2)
            m3 = checks.get(3)

            if m1 and (m1.status == CheckStatus.PENDING or is_plant_head):
                actions.append('logAudit:1')
            if m2 and m1 and m1.status == CheckStatus.PASSED and (m2.status == CheckStatus.PENDING or is_plant_head):
                actions.append('logAudit:2')
            if m3 and m2 and m2.status == CheckStatus.PASSED and (m3.status == CheckStatus.PENDING or is_plant_head):
                actions.append('logAudit:3')

    # 8. close & closeEarly: Under-Sustenance + QA Custodian or Plant Head
    if flag.status == Status.UNDER_SUSTENANCE and (is_qa_custodian or is_plant_head):
        if flag.sustenance_achieved:
            actions.append('close')
        elif is_plant_head:
            actions.append('closeEarly')

    # 9. Escalations: PPSR, Kaizen, 5S Red Tag (only if not closed and not already linked)
    if flag.status != Status.CLOSED:
        from .enums import EscalationModule
        if hasattr(flag, 'escalation_links'):
            linked_modules = {link.target_module for link in flag.escalation_links.all()}
        else:
            linked_modules = set()

        # escalatePpsr: QA Custodian or Plant Head
        if (is_qa_custodian or is_plant_head) and EscalationModule.PPSR not in linked_modules:
            actions.append('escalatePpsr')

        # convertKaizen: QA Custodian or Plant Head + systematicPermanentAction
        rc = getattr(flag, 'root_cause', None)
        has_permanent_action = bool(rc and rc.permanent_action and rc.permanent_action.strip())
        if (is_qa_custodian or is_plant_head) and has_permanent_action and EscalationModule.KAIZEN not in linked_modules:
            actions.append('convertKaizen')

        # linkFiveS: Target Person or QA Custodian or Plant Head + containment with suspect_qty > 0
        current_containment = getattr(flag, '_prefetched_current_containment', None)
        if current_containment is None and hasattr(flag, 'containment_attempts'):
            if hasattr(flag, '_prefetched_objects_cache') and 'containment_attempts' in flag._prefetched_objects_cache:
                for att in flag.containment_attempts.all():
                    if att.is_current:
                        current_containment = att
                        break
            else:
                current_containment = flag.containment_attempts.filter(is_current=True).first()

        has_suspect_qty = bool(current_containment and current_containment.suspect_qty > 0)
        if (is_target or is_qa_custodian or is_plant_head) and has_suspect_qty and EscalationModule.FIVES_RED_TAG not in linked_modules:
            actions.append('linkFiveS')

    return actions
