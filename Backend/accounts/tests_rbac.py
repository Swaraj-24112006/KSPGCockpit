"""
RBAC Automated Tests — Role Hierarchy, Privilege Escalation, and Permission Validation
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import CustomUser, Role
from kaizens.models import Kaizen
from core.rbac import (
    get_role_category,
    ROLE_INITIATOR,
    ROLE_COORDINATOR,
    ROLE_COMMITTEE,
    ROLE_ADMIN,
)


class RBACTests(TestCase):
    def setUp(self):
        # 1. Setup Roles
        self.role_initiator, _ = Role.objects.get_or_create(name='initiator')
        self.role_lead, _ = Role.objects.get_or_create(name='kaizen_lead')
        self.role_reviewer, _ = Role.objects.get_or_create(name='reviewer')
        self.role_admin, _ = Role.objects.get_or_create(name='admin')

        # 2. Setup Users
        self.user_initiator = CustomUser.objects.create_user(
            username='test_initiator',
            employee_id='EMP-T01',
            password='Password@123',
            role=self.role_initiator,
        )
        self.user_coordinator = CustomUser.objects.create_user(
            username='test_coordinator',
            employee_id='EMP-T02',
            password='Password@123',
            role=self.role_lead,
        )
        self.user_committee = CustomUser.objects.create_user(
            username='test_committee',
            employee_id='EMP-T03',
            password='Password@123',
            role=self.role_reviewer,
        )
        self.user_admin = CustomUser.objects.create_user(
            username='test_admin',
            employee_id='EMP-T04',
            password='Password@123',
            role=self.role_admin,
            is_staff=True,
            is_superuser=True,
        )

        # 3. Setup Kaizen sample
        import datetime
        self.kaizen = Kaizen.objects.create(
            sr_no='KZN-TEST-001',
            title='Test Kaizen Sheet',
            month='August',
            suggestion_date=datetime.date.today(),
            mini_factory='MF1',
            area='Assembly Line 1',
            location='Pune Plant 1',
            idea_by='Test Operator',
            problem_before='Manual assembly delay',
            counter_measure_after='Installed magnetic jig',
            created_by=self.user_initiator,
            status='pending',
        )

        self.client = APIClient()

    def _auth(self, user):
        from core.redis_client import create_session
        session_id = create_session(user_id=user.id, username=user.username)
        self.client.cookies['kspg_sid'] = session_id
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_role_category_mapping(self):
        """Verify role categories map correctly in the hierarchy."""
        self.assertEqual(get_role_category(self.user_initiator), ROLE_INITIATOR)
        self.assertEqual(get_role_category(self.user_coordinator), ROLE_COORDINATOR)
        self.assertEqual(get_role_category(self.user_committee), ROLE_COMMITTEE)
        self.assertEqual(get_role_category(self.user_admin), ROLE_ADMIN)

    def test_privilege_escalation_initiator_blocked_from_review_update(self):
        """Privilege Escalation Test: Initiator cannot perform committee updates."""
        self._auth(self.user_initiator)
        response = self.client.patch(
            f'/api/v1/kaizens/{self.kaizen.id}/',
            {'status': 'Approved', 'remark': 'Attempting unauthorized approval'},
            format='json'
        )
        # Should be forbidden for initiator
        self.assertEqual(response.status_code, 403)

    def test_committee_member_can_update_status(self):
        """Committee member is authorized to review and update kaizens."""
        self._auth(self.user_committee)
        response = self.client.patch(
            f'/api/v1/kaizens/{self.kaizen.id}/',
            {'status': 'approved', 'remark': 'Approved by committee in review'},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.kaizen.refresh_from_db()
        self.assertEqual(self.kaizen.status, 'approved')

    def test_coordinator_can_perform_admin_actions(self):
        """Coordinator has full administrative control over Kaizens."""
        self._auth(self.user_coordinator)
        response = self.client.patch(
            f'/api/v1/kaizens/{self.kaizen.id}/',
            {'cost_save': 50000},
            format='json'
        )
        self.assertEqual(response.status_code, 200)

    def test_direct_api_access_destroy_blocked_for_unauthorized_roles(self):
        """Direct API Access: Deleting kaizens requires Coordinator or Admin."""
        # Committee member attempt
        self._auth(self.user_committee)
        response = self.client.delete(f'/api/v1/kaizens/{self.kaizen.id}/')
        self.assertEqual(response.status_code, 403)
