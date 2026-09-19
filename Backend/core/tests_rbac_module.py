"""
Unit Tests for Per-Module RBAC and require_module_role
======================================================
Verifies:
1. require_module_role respects module_code and does not leak global roles.
2. If John is coordinator in Kaizen and initiator in PPSR:
   - John can access Kaizen coordinator endpoints.
   - John CANNOT access PPSR coordinator endpoints (403 Forbidden).
   - John CAN access PPSR initiator endpoints.
3. If John attempts to access an unassigned module (e.g. TPM):
   - Rejected with 403 Forbidden (no UserModuleRole entry).
4. SuperAdmin bypasses module checks globally across all modules.
5. Anonymous requests are rejected.
6. Helper get_user_module_role and CustomUser.get_module_role return module-specific roles.
"""

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from accounts.models import CustomUser, Role, UserModuleRole
from core.rbac import (
    require_module_role,
    get_user_module_role,
    get_role_category,
    ROLE_COORDINATOR,
    ROLE_INITIATOR,
    ROLE_SUPERADMIN,
)


class DummyKaizenCoordinatorView(APIView):
    permission_classes = [require_module_role('kaizen', 'coordinator', 'admin')]

    def get(self, request):
        return Response({'success': True, 'module': 'kaizen', 'action': 'coordinate'})


class DummyPpsrCoordinatorView(APIView):
    permission_classes = [require_module_role('ppsr', 'coordinator', 'admin')]

    def get(self, request):
        return Response({'success': True, 'module': 'ppsr', 'action': 'coordinate'})


class DummyPpsrInitiatorView(APIView):
    permission_classes = [require_module_role('ppsr', 'initiator', 'coordinator', 'admin')]

    def get(self, request):
        return Response({'success': True, 'module': 'ppsr', 'action': 'initiate'})


class DummyTpmCoordinatorView(APIView):
    permission_classes = [require_module_role('tpm', 'coordinator', 'admin')]

    def get(self, request):
        return Response({'success': True, 'module': 'tpm', 'action': 'coordinate'})


class ModuleRBACTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        # Roles
        self.role_initiator, _ = Role.objects.get_or_create(name='initiator')
        self.role_superadmin, _ = Role.objects.get_or_create(name='superadmin')

        # User John: Primary role is initiator, but module roles are:
        # Kaizen: coordinator
        # PPSR: initiator
        # TPM: none
        self.john = CustomUser.objects.create_user(
            username='john_doe',
            email='john@kspg.test',
            password='Password@123',
            employee_id='EMP-JHN-01',
            first_name='John',
            last_name='Doe',
            role=self.role_initiator,
        )

        UserModuleRole.objects.create(
            user=self.john,
            module_code='kaizen',
            role_name='coordinator',
            mini_factory='MF1',
        )
        UserModuleRole.objects.create(
            user=self.john,
            module_code='ppsr',
            role_name='initiator',
            mini_factory='MF1',
        )

        # SuperAdmin User
        self.superadmin = CustomUser.objects.create_superuser(
            username='super_boss',
            email='boss@kspg.test',
            password='Password@123',
            employee_id='EMP-SUP-01',
            first_name='Super',
            last_name='Admin',
            role=self.role_superadmin,
        )

    def test_module_role_resolution_helpers(self):
        """Verify get_user_module_role and CustomUser.get_module_role correctly isolate roles."""
        self.assertEqual(get_user_module_role(self.john, 'kaizen'), 'coordinator')
        self.assertEqual(self.john.get_module_role('kaizen'), 'coordinator')

        self.assertEqual(get_user_module_role(self.john, 'ppsr'), 'initiator')
        self.assertEqual(self.john.get_module_role('ppsr'), 'initiator')

        self.assertIsNone(get_user_module_role(self.john, 'tpm'))
        self.assertIsNone(self.john.get_module_role('tpm'))

        # SuperAdmin resolves to superadmin across any module
        self.assertEqual(get_user_module_role(self.superadmin, 'kaizen'), ROLE_SUPERADMIN)
        self.assertEqual(get_user_module_role(self.superadmin, 'ppsr'), ROLE_SUPERADMIN)
        self.assertEqual(get_user_module_role(self.superadmin, 'tpm'), ROLE_SUPERADMIN)
        self.assertEqual(self.superadmin.get_module_role('tpm'), ROLE_SUPERADMIN)

        # Scoped category lookup
        self.assertEqual(get_role_category(self.john, module_code='kaizen'), ROLE_COORDINATOR)
        self.assertEqual(get_role_category(self.john, module_code='ppsr'), ROLE_INITIATOR)

    def test_john_can_access_kaizen_coordinator_view(self):
        """John is assigned coordinator in Kaizen -> Access Granted."""
        request = self.factory.get('/dummy/kaizen/coord/')
        force_authenticate(request, user=self.john)
        view = DummyKaizenCoordinatorView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['action'], 'coordinate')

    def test_john_cannot_access_ppsr_coordinator_view(self):
        """John is initiator in PPSR -> Attempting coordinator action returns 403 Forbidden."""
        request = self.factory.get('/dummy/ppsr/coord/')
        force_authenticate(request, user=self.john)
        view = DummyPpsrCoordinatorView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        error_msg = response.data.get('detail') or response.data.get('error', {}).get('message', '')
        self.assertIn("This action requires one of the following roles in 'ppsr'", error_msg)

    def test_john_can_access_ppsr_initiator_view(self):
        """John is initiator in PPSR -> Initiator action returns 200 OK."""
        request = self.factory.get('/dummy/ppsr/init/')
        force_authenticate(request, user=self.john)
        view = DummyPpsrInitiatorView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['action'], 'initiate')

    def test_john_rejected_on_unassigned_tpm_module(self):
        """John has no TPM assignment -> DRF immediately returns 403 Forbidden."""
        request = self.factory.get('/dummy/tpm/coord/')
        force_authenticate(request, user=self.john)
        view = DummyTpmCoordinatorView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        error_msg = response.data.get('detail') or response.data.get('error', {}).get('message', '')
        self.assertIn("You do not have an assigned role for the 'tpm' module", error_msg)

    def test_superadmin_bypasses_tpm_module_without_assignment(self):
        """SuperAdmin has global bypass -> Granted access to TPM coordinator view without an entry in UserModuleRole."""
        request = self.factory.get('/dummy/tpm/coord/')
        force_authenticate(request, user=self.superadmin)
        view = DummyTpmCoordinatorView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['action'], 'coordinate')

    def test_anonymous_rejected(self):
        """Unauthenticated user is rejected with 401 Unauthorized or 403 Forbidden."""
        request = self.factory.get('/dummy/kaizen/coord/')
        view = DummyKaizenCoordinatorView.as_view()
        response = view(request)
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
