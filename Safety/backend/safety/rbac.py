"""
Role-Based Access Control (RBAC) Module for Safety Desk.
Supports standard Django session user groups and X-Persona-Role header fallback.
"""

def get_current_user_role(request) -> str:
    """
    Determines the active role from Django Session user groups or X-Persona-Role header.
    Returns: 'operator', 'coordinator', 'doctor', 'committee', or 'manager'.
    """
    # 1. Check custom intranet request header
    header_role = request.headers.get('x-persona-role') or request.META.get('HTTP_X_PERSONA_ROLE')
    if header_role:
        return header_role.lower().strip()

    # 2. Check authenticated Django User groups
    if request.user and request.user.is_authenticated:
        if request.user.is_superuser:
            return 'manager'
        user_groups = set(request.user.groups.values_list('name', flat=True))
        if 'Doctor' in user_groups:
            return 'doctor'
        if 'Safety Coordinator' in user_groups:
            return 'coordinator'
        if 'Manager BI Desk' in user_groups or 'Manager' in user_groups:
            return 'manager'
        if 'Committee Reviewer' in user_groups:
            return 'committee'
        if 'Operator' in user_groups:
            return 'operator'

    # Default fallback for intranet open logging
    return 'coordinator'


def is_doctor(request) -> bool:
    role = get_current_user_role(request)
    return role == 'doctor' or getattr(request.user, 'is_superuser', False)


def is_coordinator(request) -> bool:
    role = get_current_user_role(request)
    return role in ('coordinator', 'manager') or getattr(request.user, 'is_superuser', False)

