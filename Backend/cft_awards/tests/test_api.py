"""
CFT Awards — API Endpoint Tests
================================
Tests for CFT Evaluation Session API endpoints.
"""

from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from cft_awards.models import CFTEvaluationSession, CftMember, AwardCategory
from kaizens.models import Kaizen, KaizenBenefit
from accounts.models import Role
from core.redis_client import create_session


User = get_user_model()


class CFTEvaluationSessionAPITests(APITestCase):
    def setUp(self):
        self.role, _ = Role.objects.get_or_create(name='admin')
        self.user = User.objects.create_user(
            username='cft_lead',
            password='Password123!',
            employee_id='EMP-CFT-LEAD-01',
            role=self.role,
        )
        session_id = create_session(self.user.id, self.user.username)
        self.client.cookies['kspg_sid'] = session_id
        self.client.force_authenticate(user=self.user)



    def test_get_or_create_session_endpoint(self):
        url = reverse('cft_awards:session-get-or-create')
        payload = {
            'month': 'August',
            'year': 2026,
            'openedByName': 'CFT Committee Lead',
        }

        # First request creates the session
        res1 = self.client.post(url, data=payload, format='json')
        self.assertIn(res1.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertTrue(res1.data['success'])
        self.assertEqual(res1.data['data']['month'], 'August')
        self.assertEqual(res1.data['data']['year'], 2026)
        self.assertEqual(res1.data['data']['status'], 'OPEN')
        self.assertTrue(len(res1.data['data']['members']) > 0)
        session_id = res1.data['data']['id']

        # Second request returns the exact same session (persists exactly one)
        res2 = self.client.post(url, data=payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data['success'])
        self.assertFalse(res2.data['created'])
        self.assertEqual(res2.data['data']['id'], session_id)
        self.assertEqual(CFTEvaluationSession.objects.filter(month='August', year=2026).count(), 1)

    def test_update_session_attendance_endpoint(self):
        session = CFTEvaluationSession.objects.create(
            month='September',
            year=2026,
            opened_by=self.user,
            status='OPEN',
        )
        url = reverse('cft_awards:session-update-attendance', kwargs={'pk': session.id})
        res = self.client.post(url, data={'present_member_ids': [1, 2, 3]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['data']['presentIds'], [1, 2, 3])


    def test_get_session_by_id_endpoint(self):
        session = CFTEvaluationSession.objects.create(
            month='November',
            year=2026,
            opened_by=self.user,
            status='OPEN',
        )
        url = reverse('cft_awards:session-detail', kwargs={'pk': session.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['data']['month'], 'November')
        self.assertEqual(res.data['data']['year'], 2026)

    def test_cft_members_crud_endpoints(self):
        list_url = reverse('cft_awards:member-list')
        
        # 1. GET /api/v1/cft/members/
        get_res = self.client.get(list_url)
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertTrue(get_res.data['success'])

        # 2. POST /api/v1/cft/members/
        post_payload = {
            'name': 'Pooja Sharma',
            'role': 'Quality Auditor',
            'department': 'Quality',
            'mini_factory': 'MF1',
        }
        post_res = self.client.post(list_url, data=post_payload, format='json')
        self.assertEqual(post_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(post_res.data['success'])
        member_id = post_res.data['data']['id']
        self.assertEqual(post_res.data['data']['name'], 'Pooja Sharma')

        # 3. PATCH /api/v1/cft/members/{id}/
        detail_url = reverse('cft_awards:member-detail', kwargs={'pk': member_id})
        patch_res = self.client.patch(detail_url, data={'role': 'Senior Quality Auditor'}, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertTrue(patch_res.data['success'])
        self.assertEqual(patch_res.data['data']['role'], 'Senior Quality Auditor')

    def test_session_attendance_endpoints_and_persistence(self):
        # 1. Create session via get-or-create
        url = reverse('cft_awards:session-get-or-create')
        res = self.client.post(url, data={'month': 'December', 'year': 2026}, format='json')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        session_id = res.data['data']['id']

        members = res.data['data']['members']
        self.assertTrue(len(members) >= 2)
        m1_id = members[0]['id']

        # 2. Update attendance with only m1 present
        attendance_update_url = reverse('cft_awards:session-update-attendance', kwargs={'pk': session_id})
        update_res = self.client.post(attendance_update_url, data={'present_member_ids': [m1_id]}, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertTrue(update_res.data['success'])
        self.assertEqual(update_res.data['present_member_ids'], [m1_id])

        # 3. GET /api/v1/cft/sessions/{id}/attendance/
        attendance_get_url = reverse('cft_awards:session-attendance', kwargs={'pk': session_id})
        get_att_res = self.client.get(attendance_get_url)
        self.assertEqual(get_att_res.status_code, status.HTTP_200_OK)
        self.assertTrue(get_att_res.data['success'])
        self.assertEqual(get_att_res.data['present_member_ids'], [m1_id])

        # 4. Refreshing the session via GET or get-or-create preserves the updated attendance
        reload_res = self.client.post(url, data={'month': 'December', 'year': 2026}, format='json')
        self.assertEqual(reload_res.status_code, status.HTTP_200_OK)
        self.assertEqual(reload_res.data['data']['presentIds'], [m1_id])

    def test_update_session_attendance_rejects_empty_roster(self):
        session = CFTEvaluationSession.objects.create(
            month='January',
            year=2027,
            opened_by=self.user,
            status='OPEN',
        )
        url = reverse('cft_awards:session-update-attendance', kwargs={'pk': session.id})
        res = self.client.post(url, data={'present_member_ids': []}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data['success'])

    def test_award_category_list_api(self):
        url = reverse('cft_awards:category-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['count'], 6)
        first_cat = res.data['data'][0]
        self.assertIn('key', first_cat)
        self.assertIn('title', first_cat)
        self.assertIn('winnerCount', first_cat)
        self.assertIn('badgeBg', first_cat)

    def test_session_eligible_kaizens_api_and_filters(self):
        session = CFTEvaluationSession.objects.create(
            month='August',
            year=2026,
            opened_by=self.user,
            status='OPEN',
        )

        k1 = Kaizen.objects.create(
            sr_no='KZ-AUG-01',
            title='Hydraulic Pressure Regulator Adjustment',
            status='approved',
            month='August',
            mini_factory='MF1',
            area='Pump Assembly',
            created_by=self.user,
        )
        KaizenBenefit.objects.create(kaizen=k1, productivity=True, safety=True)

        k2 = Kaizen.objects.create(
            sr_no='KZ-AUG-02',
            title='EGR Line Sensor Fixture',
            status='closed',
            month='August',
            mini_factory='MF2',
            area='EGR Cell',
            created_by=self.user,
        )
        KaizenBenefit.objects.create(kaizen=k2, quality=True)

        # Ineligible Kaizen (different month and status draft)
        Kaizen.objects.create(
            sr_no='KZ-JUL-99',
            title='Draft Suggestion',
            status='draft',
            month='July',
            created_by=self.user,
        )

        url = reverse('cft_awards:session-eligible-kaizens', kwargs={'pk': session.id})

        # 1. Fetch all eligible for session
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['total'], 2)
        sr_nos = [item['sr_no'] for item in res.data['data']]
        self.assertIn('KZ-AUG-01', sr_nos)
        self.assertIn('KZ-AUG-02', sr_nos)
        self.assertNotIn('KZ-JUL-99', sr_nos)

        # 2. Search query filter
        search_res = self.client.get(url, {'search': 'Hydraulic'})
        self.assertEqual(search_res.status_code, status.HTTP_200_OK)
        self.assertEqual(search_res.data['total'], 1)
        self.assertEqual(search_res.data['data'][0]['sr_no'], 'KZ-AUG-01')

        # 3. Category filter
        cat_res = self.client.get(url, {'category': 'MF2'})
        self.assertEqual(cat_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cat_res.data['total'], 1)
        self.assertEqual(cat_res.data['data'][0]['sr_no'], 'KZ-AUG-02')

        # 4. Benefit filter ('s' for safety)
        benefit_res = self.client.get(url, {'benefit': 's'})
        self.assertEqual(benefit_res.status_code, status.HTTP_200_OK)
        self.assertEqual(benefit_res.data['total'], 1)
        self.assertEqual(benefit_res.data['data'][0]['sr_no'], 'KZ-AUG-01')

        # 5. Pagination
        page_res = self.client.get(url, {'page': 1, 'page_size': 1})
        self.assertEqual(page_res.status_code, status.HTTP_200_OK)
        self.assertEqual(page_res.data['total'], 2)
        self.assertEqual(page_res.data['count'], 1)
        self.assertEqual(page_res.data['page'], 1)
        self.assertEqual(page_res.data['total_pages'], 2)

    def test_cft_awards_rbac_restrictions(self):
        """
        Verify that only Super Admin and Kaizen Coordinator can access CFT Awards.
        Initiator and Committee roles must receive 403 Forbidden.
        """
        initiator_role, _ = Role.objects.get_or_create(name='initiator')
        initiator_user = User.objects.create_user(
            username='cft_initiator_test',
            password='Password123!',
            employee_id='EMP-INIT-TEST-01',
            role=initiator_role,
        )

        committee_role, _ = Role.objects.get_or_create(name='cft_member')
        committee_user = User.objects.create_user(
            username='cft_committee_test',
            password='Password123!',
            employee_id='EMP-COMM-TEST-01',
            role=committee_role,
        )

        coordinator_role, _ = Role.objects.get_or_create(name='kaizen_lead')
        coordinator_user = User.objects.create_user(
            username='cft_coord_test',
            password='Password123!',
            employee_id='EMP-COORD-TEST-01',
            role=coordinator_role,
        )

        url = reverse('cft_awards:session-list')

        # 1. Initiator is forbidden (403)
        self.client.force_authenticate(user=initiator_user)
        res_init = self.client.get(url)
        self.assertEqual(res_init.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Committee is forbidden (403)
        self.client.force_authenticate(user=committee_user)
        res_comm = self.client.get(url)
        self.assertEqual(res_comm.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Coordinator is allowed (200)
        self.client.force_authenticate(user=coordinator_user)
        res_coord = self.client.get(url)
        self.assertEqual(res_coord.status_code, status.HTTP_200_OK)


