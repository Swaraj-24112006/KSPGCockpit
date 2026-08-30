"""
Integration & Unit Tests for PPSR API Views & Routes (Phase 4)
==============================================================
Tests all CRUD endpoints, filters, custom actions, summary aggregation,
photo uploads, review meetings, feedback notes, and award leaderboard.
"""

from decimal import Decimal
import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from ppsr.models import (
    PpsrReport,
    ContainmentAction,
    PpsrMeetingLog,
    CommitteeFeedback,
    CftMember,
    CftRating,
)


class PpsrViewsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create sample reports
        self.report1 = PpsrReport.objects.create(
            ppsr_no='BE-2026-001',
            title='Vacuum Pump Oil Leakage',
            problem_statement='Oil leakage detected at high RPM test bench.',
            status='Open',
            plant='Plant A',
            line_station='MF1 Vacuum Line',
            lead_owner='Alice Johnson',
            committee_decision='In Review',
            repeat_case='no',
            std_status_mf='Pending',
            week='WK-28',
            jira_number='KSPG-101',
            prod_qty_before=1000,
            rejected_qty_before=50,
            cust_demand_qty_month=5000,
            per_set_rejection_cost=Decimal('20.00'),
            cost_save_per_month=Decimal('5000.00'),
            cost_save_per_annum=Decimal('60000.00'),
        )
        self.report2 = PpsrReport.objects.create(
            ppsr_no='BE-2026-002',
            title='EGR Valve Flange Distortion',
            problem_statement='Flange out of flatness spec after welding.',
            status='In-Progress',
            plant='Plant B',
            line_station='MF2 EGR Line',
            lead_owner='Bob Smith',
            committee_decision='In Review',
            repeat_case='yes',
            std_status_mf='Completed',
            week='WK-29',
            jira_number='KSPG-102',
            cost_save_per_month=Decimal('3000.00'),
            cost_save_per_annum=Decimal('36000.00'),
        )

        # Create child action
        ContainmentAction.objects.create(
            report=self.report1,
            no=1,
            action='100% inspection of sealing ring',
            responsible='Alice',
            date='2026-09-01',
            status='implemented'
        )

        # Create CFT member and rating
        self.member = CftMember.objects.create(
            name='Dr. Brown',
            role='Quality Head',
            department='QA',
            is_active=True
        )
        CftRating.objects.create(
            member=self.member,
            report=self.report1,
            score=5
        )

    # ------------------------------------------------------------------------
    # Task 4.1 Tests — CRUD & Soft Delete
    # ------------------------------------------------------------------------
    def test_list_reports(self):
        response = self.client.get('/api/ppsr/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check pagination results
        results = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['ppsr_no'], 'BE-2026-002')

    def test_create_report(self):
        payload = {
            'title': 'Smart Sensor Pin Misalignment',
            'problem_statement': 'Connector pins bent during assembly.',
            'plant': 'Plant C',
            'line_station': 'MF3 BPV Line',
            'lead_owner': 'Charlie Davis',
        }
        response = self.client.post('/api/ppsr/reports/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['ppsr_no'].startswith('BE-'))
        self.assertEqual(response.data['title'], 'Smart Sensor Pin Misalignment')

    def test_retrieve_report(self):
        response = self.client.get(f'/api/ppsr/reports/{self.report1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ppsr_no'], 'BE-2026-001')
        self.assertEqual(len(response.data['containment_actions']), 1)

    def test_soft_delete_report(self):
        response = self.client.delete(f'/api/ppsr/reports/{self.report1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report1.refresh_from_db()
        self.assertEqual(self.report1.status, 'Archived')

        # Verify excluded from normal list
        list_resp = self.client.get('/api/ppsr/reports/')
        results = list_resp.data['results'] if 'results' in list_resp.data else list_resp.data
        report_ids = [r['id'] for r in results]
        self.assertNotIn(str(self.report1.id), report_ids)

    # ------------------------------------------------------------------------
    # Task 4.2 Tests — Register Spreadsheet Filters
    # ------------------------------------------------------------------------
    def test_filters(self):
        # Filter by status
        resp = self.client.get('/api/ppsr/reports/?status=In-Progress')
        results = resp.data['results'] if 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['ppsr_no'], 'BE-2026-002')

        # Filter by plant
        resp = self.client.get('/api/ppsr/reports/?plant=Plant A')
        results = resp.data['results'] if 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['ppsr_no'], 'BE-2026-001')

        # Filter by search
        resp = self.client.get('/api/ppsr/reports/?search=KSPG-102')
        results = resp.data['results'] if 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'EGR Valve Flange Distortion')

    # ------------------------------------------------------------------------
    # Task 4.3 Tests — Committee Decision Action
    # ------------------------------------------------------------------------
    def test_decision_action_approved(self):
        payload = {
            'committee_decision': 'Approved',
            'steering_committee_sign': 'Steering Committee Chair',
            'committee_decision_date': '2026-09-10',
        }
        response = self.client.patch(f'/api/ppsr/reports/{self.report1.id}/decision/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report1.refresh_from_db()
        self.assertEqual(self.report1.committee_decision, 'Approved')
        self.assertEqual(self.report1.status, 'Closed')
        self.assertEqual(self.report1.steering_committee_sign, 'Steering Committee Chair')

    def test_decision_action_rework(self):
        payload = {
            'committee_decision': 'Re-work Needed',
        }
        response = self.client.patch(f'/api/ppsr/reports/{self.report1.id}/decision/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report1.refresh_from_db()
        self.assertEqual(self.report1.committee_decision, 'Re-work Needed')
        self.assertEqual(self.report1.status, 'In-Progress')

    # ------------------------------------------------------------------------
    # Task 4.4 Tests — Spreadsheet Metrics Action
    # ------------------------------------------------------------------------
    def test_metrics_action(self):
        payload = {
            'prod_qty_before': 1000,
            'rejected_qty_before': 100,  # 10%
            'prod_qty_after': 1000,
            'rejected_qty_after': 10,    # 1%
            'cust_demand_qty_month': 4000,
            'per_set_rejection_cost': '10.00',
        }
        response = self.client.patch(f'/api/ppsr/reports/{self.report1.id}/metrics/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report1.refresh_from_db()
        self.assertEqual(self.report1.pct_before, 10.0)
        self.assertEqual(self.report1.pct_after, 1.0)
        self.assertEqual(self.report1.qty_month_saved_rej_pct, 360)
        self.assertEqual(self.report1.cost_save_per_month, Decimal('3600.00'))

    # ------------------------------------------------------------------------
    # Task 4.5 Tests — Dashboard Summary
    # ------------------------------------------------------------------------
    def test_summary_action(self):
        response = self.client.get('/api/ppsr/reports/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_count'], 2)
        self.assertEqual(response.data['open_count'], 1)
        self.assertEqual(response.data['in_progress_count'], 1)
        self.assertEqual(response.data['total_cost_save_per_month'], 8000.0)
        self.assertEqual(response.data['total_cost_save_per_annum'], 96000.0)
        self.assertEqual(response.data['repeat_cases_count'], 1)
        self.assertEqual(response.data['std_completed_count'], 1)

    # ------------------------------------------------------------------------
    # Task 4.6 Tests — Sheet Inspect Endpoint
    # ------------------------------------------------------------------------
    def test_sheet_inspect_endpoint(self):
        response = self.client.get(f'/api/ppsr/reports/{self.report1.id}/sheet/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.report1.id))
        self.assertEqual(response.data['ppsr_no'], 'BE-2026-001')
        self.assertIn('containment_actions', response.data)

    # ------------------------------------------------------------------------
    # Task 4.7 Tests — Photo Upload Endpoint
    # ------------------------------------------------------------------------
    def test_photo_upload_endpoint(self):
        file = io.BytesIO()
        image = Image.new('RGB', (100, 100), color='blue')
        image.save(file, 'jpeg')
        file.seek(0)

        uploaded_file = SimpleUploadedFile('test_sketch.jpg', file.read(), content_type='image/jpeg')
        response = self.client.post(
            f'/api/ppsr/reports/{self.report1.id}/photo/',
            {'photo_type': 'sketch', 'file': uploaded_file},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('photo_url', response.data)
        self.report1.refresh_from_db()
        self.assertTrue(bool(self.report1.sketch_photo))

    # ------------------------------------------------------------------------
    # Task 4.8 Tests — Meeting Logs ViewSet
    # ------------------------------------------------------------------------
    def test_meetings_list_and_create(self):
        # Create meeting
        payload = {
            'meeting_date': '2026-09-08',
            'chairperson': 'General Manager',
            'attendees': 'Alice, Bob, Dr. Brown',
            'key_discussion_points': 'Reviewed weekly 8D progress.',
            'discussed_ppsr_ids': [str(self.report1.id), str(self.report2.id)],
        }
        create_resp = self.client.post('/api/ppsr/meetings/', payload, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)

        # List meetings and verify nested summary
        list_resp = self.client.get('/api/ppsr/meetings/')
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        results = list_resp.data['results'] if 'results' in list_resp.data else list_resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(len(results[0]['discussed_ppsrs']), 2)
        ppsr_nos = [p['ppsr_no'] for p in results[0]['discussed_ppsrs']]
        self.assertIn('BE-2026-001', ppsr_nos)
        self.assertIn('BE-2026-002', ppsr_nos)

    # ------------------------------------------------------------------------
    # Task 4.9 Tests — Feedback Endpoints
    # ------------------------------------------------------------------------
    def test_feedback_actions(self):
        # Add feedback to report
        fb_payload = {
            'step_number': 2,
            'step_title': 'Step 2 Containment',
            'reviewer_name': 'Committee Member 1',
            'feedback_type': 'revision_needed',
            'comment': 'Check boundary samples.',
            'resolved': False,
        }
        post_resp = self.client.post(f'/api/ppsr/reports/{self.report1.id}/feedback/', fb_payload, format='json')
        self.assertEqual(post_resp.status_code, status.HTTP_201_CREATED)
        feedback_id = post_resp.data['id']

        # Get feedback list for report
        get_resp = self.client.get(f'/api/ppsr/reports/{self.report1.id}/feedback/')
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_resp.data), 1)

        # Toggle resolved
        patch_resp = self.client.patch(
            f'/api/ppsr/reports/{self.report1.id}/feedback/{feedback_id}/',
            {'resolved': True},
            format='json'
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(patch_resp.data['resolved'])

    # ------------------------------------------------------------------------
    # Task 4.10 & 4.11 Tests — CFT Members & Ratings
    # ------------------------------------------------------------------------
    def test_cft_members_and_ratings(self):
        # List active members
        members_resp = self.client.get('/api/ppsr/cft-members/')
        self.assertEqual(members_resp.status_code, status.HTTP_200_OK)

        # Add member inline
        add_member_resp = self.client.post(
            '/api/ppsr/cft-members/',
            {'name': 'Eng. Dave', 'role': 'Production Lead', 'department': 'MF2'},
            format='json'
        )
        self.assertEqual(add_member_resp.status_code, status.HTTP_201_CREATED)
        new_member_id = add_member_resp.data['id']

        # Rate report
        rating_payload = {
            'member_id': new_member_id,
            'report_id': str(self.report2.id),
            'score': 4,
        }
        rate_resp = self.client.post('/api/ppsr/cft-ratings/', rating_payload, format='json')
        self.assertEqual(rate_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(rate_resp.data['score'], 4)

        # Overwrite rating (update_or_create)
        update_rating_payload = {
            'member_id': new_member_id,
            'report_id': str(self.report2.id),
            'score': 5,
        }
        overwrite_resp = self.client.post('/api/ppsr/cft-ratings/', update_rating_payload, format='json')
        self.assertEqual(overwrite_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(overwrite_resp.data['score'], 5)

    # ------------------------------------------------------------------------
    # Task 4.12 Tests — Awards Leaderboard Endpoint
    # ------------------------------------------------------------------------
    def test_awards_leaderboard_endpoint(self):
        resp = self.client.get('/api/ppsr/awards/leaderboard/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('leaderboard', resp.data)
        self.assertIn('categories', resp.data)
        self.assertEqual(resp.data['total_evaluated'], 1)
        self.assertEqual(resp.data['leaderboard'][0]['ppsr_no'], 'BE-2026-001')
        self.assertEqual(resp.data['leaderboard'][0]['total_score'], 5)
