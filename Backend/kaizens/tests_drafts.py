"""
Tests for Kaizen Save Draft, Edit Draft, Strict Submission, Timestamps and RBAC Ownership.
"""

from datetime import date
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from kaizens.models import Kaizen, KaizenBenefit
from core.redis_client import create_session


class KaizenDraftWorkflowTests(TestCase):
    """
    Test suite for Kaizen draft lifecycle:
    1. Saving a draft with partial data.
    2. Auto-populating created_by, sr_no, status='draft', and timestamps.
    3. Listing user's drafts via /drafts/.
    4. Updating existing draft (Continue Editing).
    5. Strict validation failure when submitting incomplete draft (422).
    6. Successful submission when all compulsory fields are completed.
    7. Ownership security: Initiator cannot modify or submit another user's draft.
    """

    def setUp(self):
        # Create roles
        self.role_initiator = Role.objects.create(name='initiator')
        self.role_committee = Role.objects.create(name='reviewer')
        self.role_coordinator = Role.objects.create(name='kaizen_lead')

        # Create test users
        self.initiator1 = CustomUser.objects.create_user(
            username='initiator1',
            email='initiator1@kaizen.local',
            password='Password@123',
            role=self.role_initiator,
            first_name='Initiator',
            last_name='One',
            employee_id='EMP-001',
        )
        self.initiator2 = CustomUser.objects.create_user(
            username='initiator2',
            email='initiator2@kaizen.local',
            password='Password@123',
            role=self.role_initiator,
            first_name='Initiator',
            last_name='Two',
            employee_id='EMP-002',
        )
        self.committee1 = CustomUser.objects.create_user(
            username='reviewer1',
            email='reviewer1@kaizen.local',
            password='Password@123',
            role=self.role_committee,
            first_name='Reviewer',
            last_name='One',
            employee_id='EMP-003',
        )

        self.client = APIClient()

    def _login_user(self, user):
        """Helper to create session and attach kspg_sid cookie & auth headers."""
        session_id = create_session(user.id, user.username)
        self.client.cookies['kspg_sid'] = session_id
        self.client.force_authenticate(user=user)

    def test_save_draft_with_partial_fields(self):
        """Initiator can save a draft with partial fields (no strict validation required)."""
        self._login_user(self.initiator1)

        payload = {
            'title': 'Partial Draft Kaizen',
            'problem_before': 'Minor issue',
            'area': 'Assembly Line A',
            'status': 'draft',
        }

        response = self.client.post('/api/v1/kaizens/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.data['data']
        self.assertEqual(data['status'], 'draft')
        self.assertEqual(data['title'], 'Partial Draft Kaizen')
        self.assertTrue(data['sr_no'].startswith('KZ-'))
        self.assertIsNotNone(data.get('created_at'))

        # Verify in DB
        kaizen = Kaizen.objects.get(pk=data['id'])
        self.assertEqual(kaizen.created_by, self.initiator1)
        self.assertEqual(kaizen.status, 'draft')
        self.assertIsNone(kaizen.submitted_at)

    def test_get_user_drafts_endpoint(self):
        """GET /api/v1/kaizens/drafts/ only returns the logged-in user's drafts."""
        # Create draft for initiator1
        k1 = Kaizen.objects.create(
            sr_no='KZ-DRAFT-01',
            title='Initiator 1 Draft',
            problem_before='Problem 1',
            counter_measure_after='Solution 1',
            area='Area A',
            mini_factory='MF1',
            status='draft',
            created_by=self.initiator1,
        )
        # Create draft for initiator2
        k2 = Kaizen.objects.create(
            sr_no='KZ-DRAFT-02',
            title='Initiator 2 Draft',
            problem_before='Problem 2',
            counter_measure_after='Solution 2',
            area='Area B',
            mini_factory='MF2',
            status='draft',
            created_by=self.initiator2,
        )

        self._login_user(self.initiator1)
        response = self.client.get('/api/v1/kaizens/drafts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data['data']
        draft_ids = [d['id'] for d in results]
        self.assertIn(k1.id, draft_ids)
        self.assertNotIn(k2.id, draft_ids)

    def test_continue_editing_and_update_draft(self):
        """Initiator can update an existing draft and timestamps update automatically."""
        k = Kaizen.objects.create(
            sr_no='KZ-DRAFT-03',
            title='Initial Draft Title',
            problem_before='Short prob',
            area='Area A',
            mini_factory='MF1',
            status='draft',
            created_by=self.initiator1,
        )

        self._login_user(self.initiator1)

        update_payload = {
            'title': 'Updated Complete Title For Kaizen',
            'counter_measure_after': 'New countermeasure added during editing',
            'location': 'Station 4 West',
            'status': 'draft',
        }

        response = self.client.patch(f'/api/v1/kaizens/{k.id}/', update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        k.refresh_from_db()
        self.assertEqual(k.title, 'Updated Complete Title For Kaizen')
        self.assertEqual(k.location, 'Station 4 West')
        self.assertEqual(k.status, 'draft')

    def test_submit_incomplete_draft_fails_strict_validation(self):
        """Submitting an incomplete draft returns 422 with missing compulsory field errors."""
        k = Kaizen.objects.create(
            sr_no='KZ-DRAFT-04',
            title='Draft Missing Photos and Benefits',
            problem_before='Problem statement description is long enough here',
            counter_measure_after='Countermeasure statement is also long enough here',
            area='Assembly Line A',
            mini_factory='MF1',
            location='Bay 2',
            suggestion_date=date.today(),
            idea_by='Worker John',
            status='draft',
            created_by=self.initiator1,
        )

        self._login_user(self.initiator1)
        response = self.client.post(f'/api/v1/kaizens/{k.id}/submit/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        details = response.data.get('details') or response.data.get('error', {}).get('details', {})
        self.assertIn('benefits', details)
        self.assertIn('photo_before', details)
        self.assertIn('photo_after', details)

        # Status must remain draft
        k.refresh_from_db()
        self.assertEqual(k.status, 'draft')
        self.assertIsNone(k.submitted_at)

    def test_submit_fully_completed_draft_succeeds(self):
        """Submitting a fully completed Kaizen succeeds, updates status to 'submitted', and sets submitted_at timestamp."""
        k = Kaizen.objects.create(
            sr_no='KZ-DRAFT-05',
            title='Complete Valid Kaizen Implementation',
            problem_before='Before condition causing severe bottleneck at station 3',
            counter_measure_after='Implemented ergonomic feeder tray and pneumatic lock',
            area='Assembly Line A',
            mini_factory='MF1',
            location='Bay 2 West',
            suggestion_date=date.today(),
            idea_by='Worker John',
            photo_before='http://localhost/media/before.jpg',
            photo_after='http://localhost/media/after.jpg',
            status='draft',
            created_by=self.initiator1,
        )
        KaizenBenefit.objects.create(
            kaizen=k,
            productivity=True,
            quality=True,
        )

        self._login_user(self.initiator1)
        response = self.client.post(f'/api/v1/kaizens/{k.id}/submit/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        k.refresh_from_db()
        self.assertEqual(k.status, 'submitted')
        self.assertIsNotNone(k.submitted_at)

    def test_initiator_cannot_modify_or_submit_other_users_draft(self):
        """An initiator cannot edit or submit a draft created by another user (403)."""
        k = Kaizen.objects.create(
            sr_no='KZ-DRAFT-06',
            title='Initiator 2 Draft Secret',
            problem_before='Secret issue',
            area='Area B',
            mini_factory='MF2',
            status='draft',
            created_by=self.initiator2,
        )

        # Login as initiator1
        self._login_user(self.initiator1)

        # Attempt to patch
        patch_res = self.client.patch(f'/api/v1/kaizens/{k.id}/', {'title': 'Hacked Title'}, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to submit
        submit_res = self.client.post(f'/api/v1/kaizens/{k.id}/submit/', {}, format='json')
        self.assertEqual(submit_res.status_code, status.HTTP_403_FORBIDDEN)
