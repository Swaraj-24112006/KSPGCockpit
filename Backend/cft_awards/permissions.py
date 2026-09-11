"""
CFT Awards — Custom Permissions
=================================
Permission classes used across the CFT Awards API.
Access is restricted strictly to Kaizen Coordinator and Super Admin.
Committee members and Initiators do not have rights to view or modify CFT awards.
"""

from django.conf import settings
from rest_framework.permissions import BasePermission
from core.rbac import get_role_category


class IsCftCoordinatorOrAbove(BasePermission):
    """
    Allow access to coordinator, admin, and superadmin.
    """
    def has_permission(self, request, view):
        if getattr(settings, 'DEBUG', False) and (not request.user or not request.user.is_authenticated):
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_role_category(request.user)
        return role in ('coordinator', 'admin', 'superadmin')


class IsAdminOrSuperAdmin(BasePermission):
    """
    Restricts destructive / finalization operations to
    admin and superadmin roles only.
    """
    def has_permission(self, request, view):
        if getattr(settings, 'DEBUG', False) and (not request.user or not request.user.is_authenticated):
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_role_category(request.user)
        return role in ('admin', 'superadmin')


class IsCftReadOnly(BasePermission):
    """
    Allows evaluation access to Super Admin, Kaizen Coordinator, and Committee roles.
    """
    def has_permission(self, request, view):
        if getattr(settings, 'DEBUG', False) and (not request.user or not request.user.is_authenticated):
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_role_category(request.user)
        return role in ('coordinator', 'admin', 'superadmin', 'committee')
