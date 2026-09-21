"""
Automated RBAC Tests for PPSR Module
====================================
Tests granular role permissions across:
- Initiator: Can fill form / create report; forbidden from committee operations & awards.
- Committee: Can review reports, set decisions/metrics, log meetings; forbidden from creating/deleting reports.
- Coordinator / SuperAdmin: Unrestricted access to all PPSR operations.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.core.cache import cache

from accounts.models import CustomUser, Role
from ppsr.models import PpsrReport, PpsrMeetingLog, CftMember
from core.redis_client import create_session


class PpsrRBACTestCase(TestCase):
    """Test suite for Role-Based Access Control in PPSR."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

        # Create base roles
        self.initiator_role, _ = Role.objects.get_or_create(name='initiator')
        self.committee_role, _ = Role.objects.get_or_create(name='committee')
        self.coordinator_role, _ = Role.objects.get_or_create(name='coordinator')

        # Create test users
        self.initiator_user = CustomUser.objects.create_user(
            username='rbac_initiator',
            email='init@example.com',
            password='Password@123',
            role=self.initiator_role,
            first_name='Init',
            last_name='User',
            employee_id='EMP-RBAC-01',
        )

        self.committee_user = CustomUser.objects.create_user(
            username='rbac_committee',
            email='comm@example.com',
            password='Password@123',
            role=self.committee_role,
            first_name='Comm',
            last_name='Reviewer',
            employee_id='EMP-RBAC-02',
        )

        self.coordinator_user = CustomUser.objects.create_user(
            username='rbac_coordinator',
            email='coord@example.com',
            password='Password@123',
            role=self.coordinator_role,
            first_name='Coord',
            last_name='Admin',
            employee_id='EMP-RBAC-03',
        )

        self.superadmin_user = CustomUser.objects.create_superuser(
            username='rbac_superadmin',
            email='super@example.com',
            password='Password@123',
            first_name='Super',
            last_name='Admin',
            employee_id='EMP-RBAC-00',
        )

        # Baseline PPSR report
        self.report = PpsrReport.objects.create(
            ppsr_no='KSPG-RBAC-01',
            title='Overheating Cylinder Block',
            problem_statement='Thermal trip at Station 2 during pressure test',
            plant='Pune Plant',
            line_station='St-2',
            lead_owner='Init User',
            status='Open',
        )

    def _auth_client(self, user):
        client = APIClient()
        session_key = create_session(user.id, user.username)
        client.cookies['kspg_sid'] = session_key
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {session_key}')
        client.force_authenticate(user=user)
        return client

    # ─── 1. Initiator Permissions ──────────────────────────────────────────

    def test_initiator_can_create_report(self):
        """Initiator role is authorized to submit new PPSR forms."""
        client = self._auth_client(self.initiator_user)
        payload = {
            'title': 'New Initiator Problem Report',
            'problem_statement': 'Burr formation on flange surface',
            'plant': 'Pune Assembly',
            'line_station': 'L-01',
            'lead_owner': 'Init User',
        }
        res = client.post('/api/ppsr/reports/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_initiator_forbidden_from_committee_decision(self):
        """Initiator role is rejected with HTTP 403 on committee decision endpoint."""
        client = self._auth_client(self.initiator_user)
        payload = {
            'status': 'Approved',
            'reviewer_name': 'Unauthorized Initiator',
            'comments': 'Should be rejected',
        }
        res = client.patch(f'/api/ppsr/reports/{self.report.id}/decision/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_initiator_forbidden_from_committee_metrics(self):
        """Initiator role is rejected with HTTP 403 on committee spreadsheet metrics."""
        client = self._auth_client(self.initiator_user)
        payload = {
            'prod_qty_before': 500,
            'rejected_qty_before': 10,
        }
        res = client.patch(f'/api/ppsr/reports/{self.report.id}/metrics/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_initiator_forbidden_from_meetings(self):
        """Initiator role cannot create or view committee meeting logs."""
        client = self._auth_client(self.initiator_user)
        payload = {
            'meeting_date': '2026-09-20',
            'chairperson': 'Should Fail',
            'attendees': ['Unauthorized'],
        }
        res = client.post('/api/ppsr/meetings/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_initiator_forbidden_from_cft_awards(self):
        """Initiator cannot access CFT member management or leaderboard."""
        client = self._auth_client(self.initiator_user)
        res = client.get('/api/ppsr/cft-members/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res_board = client.get('/api/ppsr/awards/leaderboard/')
        self.assertEqual(res_board.status_code, status.HTTP_403_FORBIDDEN)

    # ─── 2. Committee Permissions ──────────────────────────────────────────

    def test_committee_can_record_decision(self):
        """Committee member can record review decisions."""
        client = self._auth_client(self.committee_user)
        payload = {
            'status': 'In-Progress',
            'reviewer_name': 'Comm Reviewer',
            'comments': 'Approved containment and moving to root cause',
        }
        res = client.patch(f'/api/ppsr/reports/{self.report.id}/decision/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_committee_can_update_metrics(self):
        """Committee member can update spreadsheet review metrics."""
        client = self._auth_client(self.committee_user)
        payload = {
            'prod_qty_before': 1000,
            'rejected_qty_before': 25,
            'per_set_rejection_cost': 50,
        }
        res = client.patch(f'/api/ppsr/reports/{self.report.id}/metrics/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_committee_can_create_meeting(self):
        """Committee member can log committee review meetings."""
        client = self._auth_client(self.committee_user)
        payload = {
            'meeting_date': '2026-09-20',
            'chairperson': 'Comm Reviewer',
            'attendees': 'Comm Reviewer, Plant Manager',
            'key_discussion_points': 'Reviewed 8D steps for thermal failure.',
        }
        res = client.post('/api/ppsr/meetings/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_committee_forbidden_from_creating_report(self):
        """Committee-only role cannot initiate new PPSR forms."""
        client = self._auth_client(self.committee_user)
        payload = {
            'title': 'Committee Initiated Report',
            'problem_statement': 'Should be rejected',
            'plant': 'Pune Plant',
            'line_station': 'L-02',
            'lead_owner': 'Comm Reviewer',
        }
        res = client.post('/api/ppsr/reports/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_committee_forbidden_from_deleting_report(self):
        """Committee member cannot delete reports."""
        client = self._auth_client(self.committee_user)
        res = client.delete(f'/api/ppsr/reports/{self.report.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_committee_forbidden_from_cft_awards(self):
        """Committee member cannot manage CFT members."""
        client = self._auth_client(self.committee_user)
        res = client.get('/api/ppsr/cft-members/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ─── 3. Coordinator & SuperAdmin Permissions ───────────────────────────

    def test_coordinator_has_full_access(self):
        """Coordinator has full access to all PPSR operations."""
        client = self._auth_client(self.coordinator_user)

        # 1. Can create report
        create_res = client.post('/api/ppsr/reports/', {
            'title': 'Coordinator Report',
            'problem_statement': 'Crack detected',
            'plant': 'Plant 1',
            'line_station': 'Line-1',
            'lead_owner': 'Coord Admin',
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        created_id = create_res.data['id']

        # 2. Can record decision
        dec_res = client.patch(f'/api/ppsr/reports/{created_id}/decision/', {
            'status': 'Closed',
            'reviewer_name': 'Coord Admin',
        }, format='json')
        self.assertEqual(dec_res.status_code, status.HTTP_200_OK)

        # 3. Can update metrics
        met_res = client.patch(f'/api/ppsr/reports/{created_id}/metrics/', {
            'prod_qty_before': 100,
            'rejected_qty_before': 2,
        }, format='json')
        self.assertEqual(met_res.status_code, status.HTTP_200_OK)

        # 4. Can access CFT members and leaderboard
        cft_res = client.get('/api/ppsr/cft-members/')
        self.assertEqual(cft_res.status_code, status.HTTP_200_OK)

        board_res = client.get('/api/ppsr/awards/leaderboard/')
        self.assertEqual(board_res.status_code, status.HTTP_200_OK)

        # 5. Can delete report
        del_res = client.delete(f'/api/ppsr/reports/{created_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)

    def test_superadmin_has_full_access(self):
        """SuperAdmin bypasses all module restrictions globally."""
        client = self._auth_client(self.superadmin_user)

        res = client.patch(f'/api/ppsr/reports/{self.report.id}/decision/', {
            'status': 'Approved',
            'reviewer_name': 'Super Admin',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
