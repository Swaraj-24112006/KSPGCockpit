"""
core/rbac.py — Role-Based Access Control for Kaizen System
============================================================
Provides:
  - Role category constants
  - Role → DB name mapping
  - `require_role(*roles)` — DRF permission class factory
  - `RolePermission` — base DRF permission that reads role from the DB user

Usage in any DRF view:
    from core.rbac import require_role
    permission_classes = [IsAuthenticated, require_role('coordinator', 'admin')]

Role hierarchy (weakest → strongest):
  initiator < committee < coordinator < admin
"""

import logging
from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)

# ─── Role Category Constants ──────────────────────────────────────────────────

ROLE_INITIATOR   = 'initiator'
ROLE_COORDINATOR = 'coordinator'
ROLE_COMMITTEE   = 'committee'
ROLE_ADMIN       = 'admin'
ROLE_SUPERADMIN  = 'superadmin'

ALL_ROLES = (ROLE_INITIATOR, ROLE_COORDINATOR, ROLE_COMMITTEE, ROLE_ADMIN, ROLE_SUPERADMIN)

# ─── DB role name → RBAC category ────────────────────────────────────────────
# Maps the Role.name values stored in the database to the frontend categories.

DB_ROLE_TO_CATEGORY = {
    'initiator':   ROLE_INITIATOR,
    'reviewer':    ROLE_COMMITTEE,     # Reviewer/Manager = Committee member
    'cft_member':  ROLE_COMMITTEE,     # CFT Member = Committee member
    'verifier':    ROLE_COMMITTEE,     # Verifier = Committee member
    'kaizen_lead': ROLE_COORDINATOR,   # Kaizen Lead = Coordinator (full admin)
    'admin':       ROLE_ADMIN,
    'superadmin':  ROLE_SUPERADMIN,
}


def get_role_category(user) -> str:
    """
    Return the RBAC category for a user.
    Strictly: user is SuperAdmin only if is_superuser=True or role.name == 'superadmin'.
    (is_staff does NOT grant SuperAdmin).
    Falls back to 'initiator' (least privilege) if no role is assigned.
    """
    if not user or not user.is_authenticated:
        return ROLE_INITIATOR
    if user.is_superuser:
        return ROLE_SUPERADMIN
    if user.role and user.role.name == 'superadmin':
        return ROLE_SUPERADMIN
    db_role_name = user.role.name if user.role else 'initiator'
    return DB_ROLE_TO_CATEGORY.get(db_role_name, ROLE_INITIATOR)


# ─── Permission class factory ─────────────────────────────────────────────────

def require_role(*allowed_roles: str):
    """
    DRF permission class factory.

    Usage:
        class MyView(APIView):
            permission_classes = [IsAuthenticated, require_role('coordinator', 'admin', 'superadmin')]

    Returns a DRF BasePermission subclass that grants access only if the
    authenticated user's role category is in `allowed_roles` (or is SuperAdmin).
    """
    allowed_set = frozenset(allowed_roles)

    class _RolePermission(BasePermission):
        message = (
            f"Access denied. This action requires one of the following roles: "
            f"{', '.join(allowed_roles)}."
        )

        def has_permission(self, request, view) -> bool:
            if not request.user or not request.user.is_authenticated:
                return False
            category = get_role_category(request.user)
            # SuperAdmin has global override access across all module roles
            if category == ROLE_SUPERADMIN:
                return True
            allowed = category in allowed_set
            if not allowed:
                logger.warning(
                    "RBAC denied: user=%s role=%s tried to access %s %s",
                    request.user.username,
                    category,
                    request.method,
                    request.path,
                )
            return allowed

    _RolePermission.__name__ = f"Require({'|'.join(sorted(allowed_roles))})"
    return _RolePermission


# ─── Convenience permission classes ──────────────────────────────────────────

class IsSuperAdminOnly(BasePermission):
    """Allow Super Administrator only (platform-level manager)."""
    message = "Access denied. Super Administrator privileges required."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            get_role_category(request.user) == ROLE_SUPERADMIN
        )


class IsCoordinatorOrAdmin(BasePermission):
    """Allow Coordinator, Admin, and SuperAdmin roles."""
    message = "Access denied. Coordinator or Admin role required."

    def has_permission(self, request, view) -> bool:
        return get_role_category(request.user) in (ROLE_COORDINATOR, ROLE_ADMIN, ROLE_SUPERADMIN)


class IsCommitteeOrAbove(BasePermission):
    """Allow Committee, Coordinator, Admin, and SuperAdmin roles."""
    message = "Access denied. Committee role or above required."

    def has_permission(self, request, view) -> bool:
        return get_role_category(request.user) in (
            ROLE_COMMITTEE, ROLE_COORDINATOR, ROLE_ADMIN, ROLE_SUPERADMIN
        )


class IsAdminOnly(BasePermission):
    """Allow Admin or SuperAdmin role."""
    message = "Access denied. Administrator role required."

    def has_permission(self, request, view) -> bool:
        return get_role_category(request.user) in (ROLE_ADMIN, ROLE_SUPERADMIN)


class IsOwnerOrCommitteeOrAbove(BasePermission):
    """
    Allows:
      1. Committee, Coordinator and Admin to update/review any Kaizen.
      2. Initiators to edit/update their OWN editable drafts (status = 'draft' or 'rework').
    """
    message = "Access denied. You do not have permission to modify this Kaizen."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return True  # Fallback handled in view or authentication
        return True

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return True
        category = get_role_category(request.user)
        if category in (ROLE_COMMITTEE, ROLE_COORDINATOR, ROLE_ADMIN):
            return True
        # Initiators can only edit their own draft or rework records
        return obj.created_by == request.user and getattr(obj, 'is_editable', True)


# ─── Granular permission strings (for Role.permissions JSONField) ─────────────

PERM_KAIZEN_CREATE          = 'kaizen.create'
PERM_KAIZEN_DELETE_DRAFT    = 'kaizen.delete_draft'
PERM_KAIZEN_VIEW_ALL        = 'kaizen.view_all'
PERM_KAIZEN_COMMITTEE_UPDATE = 'kaizen.committee_update'
PERM_KAIZEN_IMPACT_CLOSURE  = 'kaizen.impact_closure'
PERM_KAIZEN_REGISTER        = 'kaizen.register'
PERM_KAIZEN_AWARDS          = 'kaizen.awards'
PERM_KAIZEN_FLOWCHART       = 'kaizen.flowchart'
PERM_REDFLAG_ALL            = 'redflag.all'
PERM_FIVES_ALL              = 'fives.all'
PERM_SAFETY_ALL             = 'safety.all'
PERM_PPSR_ALL               = 'ppsr.all'


# ─── Default permissions per role category ────────────────────────────────────

ROLE_PERMISSIONS: dict[str, dict[str, bool]] = {
    ROLE_INITIATOR: {
        PERM_KAIZEN_CREATE:       True,
        PERM_KAIZEN_DELETE_DRAFT: True,
        PERM_KAIZEN_AWARDS:       True,
        PERM_KAIZEN_FLOWCHART:    True,
        # everything else is False
    },
    ROLE_COMMITTEE: {
        PERM_KAIZEN_DELETE_DRAFT: False,
        PERM_KAIZEN_COMMITTEE_UPDATE: True,
        PERM_KAIZEN_IMPACT_CLOSURE:   True,
        PERM_KAIZEN_REGISTER:         True,
        PERM_KAIZEN_AWARDS:           True,
        PERM_KAIZEN_FLOWCHART:        True,
    },
    ROLE_COORDINATOR: {
        PERM_KAIZEN_CREATE:           True,
        PERM_KAIZEN_DELETE_DRAFT:     True,
        PERM_KAIZEN_VIEW_ALL:         True,
        PERM_KAIZEN_COMMITTEE_UPDATE: True,
        PERM_KAIZEN_IMPACT_CLOSURE:   True,
        PERM_KAIZEN_REGISTER:         True,
        PERM_KAIZEN_AWARDS:           True,
        PERM_KAIZEN_FLOWCHART:        True,
        PERM_REDFLAG_ALL:             True,
        PERM_FIVES_ALL:               True,
        PERM_SAFETY_ALL:              True,
        PERM_PPSR_ALL:                True,
    },
    ROLE_ADMIN: {
        # Admin has all permissions — checked via is_superuser/is_staff shortcut
    },
}

