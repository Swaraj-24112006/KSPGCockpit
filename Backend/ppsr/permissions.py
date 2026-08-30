"""
PPSR Permissions — Role-Based Access Control (RBAC)
===================================================
Custom DRF permissions for PPSR authors, reviewers, coordinators, and admins.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsPpsrAuthorOrAdmin(BasePermission):
    """
    Allow access if user is authenticated, and write access if author or admin.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
