"""
Tests for Kaizen Unpaginated Fetch & All-Kaizens Retrieval (Fix for 50+ Kaizens Limit).
Ensures that all Kaizens in the database are returned to the Committee Review Board
and Kaizen Spreadsheet, without truncating earlier Kaizens.
"""

from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from kaizens.models import Kaizen
from core.redis_client import create_session


class KaizenFullFetchPaginationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role_initiator = Role.objects.create(name='initiator')
        self.user = CustomUser.objects.create_user(
            username='initiator_test',
            email='initiator_test@kaizen.local',
            password='Password@123',
            role=self.role_initiator,
            first_name='Test',
            last_name='Initiator',
            employee_id='EMP-TEST',
        )

        session_id = create_session(self.user.id, self.user.username)
        self.client.cookies['kspg_sid'] = session_id
        self.client.force_authenticate(user=self.user)

        # Bulk create 60 kaizens with unique sr_no and titles
        kaizens_to_create = []
        for i in range(1, 61):
            kaizens_to_create.append(
                Kaizen(
                    sr_no=f"KZ-2026-{i:04d}",
                    title=f"Kaizen Improvement #{i}",
                    problem_before=f"Problem description for kaizen #{i}",
                    counter_measure_after=f"Counter measure for kaizen #{i}",
                    area="Assembly",
                    mini_factory="MF1",
                    location="Station 1",
                    machine="M-01",
                    month="August",
                    suggestion_date=date.today(),
                    status="submitted",
                    classification="pending",
                    created_by=self.user,
                )
            )
        Kaizen.objects.bulk_create(kaizens_to_create)

    def test_default_fetch_returns_all_60_kaizens_unpaginated(self):
        """GET /api/v1/kaizens/ must return all 60 kaizens so the Review Board shows everything."""
        res = self.client.get('/api/v1/kaizens/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should return an unpaginated list with all 60 items
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 60)

        # Verify both earliest (#1) and newest (#60) are present
        sr_nos = [k.get('srNo') or k.get('sr_no') for k in data]
        self.assertIn("KZ-2026-0001", sr_nos, "Earliest kaizen KZ-2026-0001 must be present!")
        self.assertIn("KZ-2026-0060", sr_nos, "Latest kaizen KZ-2026-0060 must be present!")

    def test_all_flag_returns_all_60_kaizens(self):
        """GET /api/v1/kaizens/?all=true must return all 60 kaizens."""
        res = self.client.get('/api/v1/kaizens/?all=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 60)

    def test_explicit_pagination_still_works_when_page_param_passed(self):
        """When ?page=1 is explicitly requested, it should paginate."""
        res = self.client.get('/api/v1/kaizens/?page=1&page_size=20')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('results', data)
        self.assertEqual(data['count'], 60)
        self.assertEqual(len(data['results']), 20)
