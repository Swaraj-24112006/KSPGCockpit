"""
End-to-End Tests for PPSR Committee Review Workflow
===================================================
Validates that:
1. PPSR submitted by an initiator is retrieved in full detail by the committee
2. Committee reviews and saves decision, spreadsheet metrics, and sign-offs
3. Subsequent fetches (simulating re-login) retain 100% of both initiator
   details and committee review metrics.
"""

from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.core.cache import cache

from accounts.models import CustomUser, Role
from ppsr.models import PpsrReport
from core.redis_client import create_session


class PpsrCommitteeReviewE2ETestCase(TestCase):
    """End-to-end test suite for PPSR Committee Review workflow."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

        self.initiator_role, _ = Role.objects.get_or_create(name='initiator')
        self.committee_role, _ = Role.objects.get_or_create(name='committee')

        self.initiator = CustomUser.objects.create_user(
            username='e2e_initiator',
            email='e2e_init@example.com',
            password='Password@123',
            role=self.initiator_role,
            first_name='Initiator',
            last_name='User',
            employee_id='EMP-E2E-01',
        )

        self.committee = CustomUser.objects.create_user(
            username='e2e_committee',
            email='e2e_comm@example.com',
            password='Password@123',
            role=self.committee_role,
            first_name='Committee',
            last_name='Reviewer',
            employee_id='EMP-E2E-02',
        )

    def _auth_client(self, user):
        client = APIClient()
        session_key = create_session(user.id, user.username)
        client.cookies['kspg_sid'] = session_key
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {session_key}')
        client.force_authenticate(user=user)
        return client

    def test_ppsr_committee_review_end_to_end_lifecycle(self):
        # 1. Initiator submits PPSR
        initiator_client = self._auth_client(self.initiator)
        payload = {
            'title': 'Valve Leakage at High Temperature Test',
            'problem_statement': 'Valve seat sealing failed at 180C endurance cycle causing pressure drop.',
            'plant': 'Pune Assembly & Paint Complex',
            'line_station': 'Station-4 Valve Press',
            'lead_owner': 'Initiator User',
            'cause_localization_approach': 'both',
            'facts_analysis': {
                'whatIs': 'Seal ring extrusion',
                'whatIsNot': 'Flange body crack',
            },
            'containment_actions': [
                {
                    'no': 1,
                    'action': '100% leak check on all finished batch pallets',
                    'responsible': 'Amit S.',
                    'date': '2026-09-15',
                    'status': 'implemented'
                }
            ],
            'five_whys': {
                'column1': ['Seal ring extruded', 'Groove clearance too loose at 180C'],
                'column2': [],
                'column3': []
            },
            'psq_tree_data': {
                'id': 'root',
                'name': 'Valve Seat Leakage',
            },
            'corrective_actions': [
                {
                    'no': 1,
                    'measure': 'Recalibrate CNC groove tooling offset',
                    'responsible': 'Suresh K.',
                    'deadline': '2026-09-20',
                    'status': 'completed'
                }
            ],
            'effectiveness_evidence': 'Zero leakage recorded across 5 consecutive test batches.',
            'standardization_items': [
                {
                    'no': 1,
                    'measure': 'Update Standard Operating Procedure SOP-VALVE-042',
                    'responsible': 'Priya M.',
                    'date': '2026-09-22',
                    'status': 'completed'
                }
            ],
            'read_across_items': [
                {
                    'no': 1,
                    'proposal': 'Apply revised groove offset to Line 2',
                    'responsible': 'Rajesh Patil',
                    'deadline': '2026-09-30'
                }
            ],
        }

        create_res = initiator_client.post('/api/v1/ppsr/reports/', payload, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        report_id = create_res.data['id']

        # 2. Committee logs in and lists reports
        committee_client = self._auth_client(self.committee)
        list_res = committee_client.get('/api/v1/ppsr/reports/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)

        results = list_res.data.get('results') if isinstance(list_res.data, dict) else list_res.data
        report_data = next((r for r in results if str(r.get('id')) == str(report_id)), None)
        self.assertIsNotNone(report_data)

        # Verify all initiator fields are in list response
        self.assertEqual(report_data.get('problem_statement'), payload['problem_statement'])
        self.assertEqual(report_data.get('problemStatement'), payload['problem_statement'])
        self.assertEqual(len(report_data.get('containment_actions', [])), 1)
        self.assertEqual(len(report_data.get('corrective_actions', [])), 1)
        self.assertEqual(report_data.get('facts_analysis', {}).get('whatIs'), 'Seal ring extrusion')
        self.assertEqual(report_data.get('psq_tree_data', {}).get('name'), 'Valve Seat Leakage')

        # 3. Committee reviews and audits report
        review_patch = {
            'status': 'Closed',
            'committeeDecision': 'Approved',
            'committeeDecisionDate': '2026-09-15',
            'steeringCommitteeSign': 'Dr. Rajesh Patil (Steering Committee Head)',
            'jiraNumber': 'KSPG-2026-999',
            'week': 'WK-38',
            'coach': 'Dr. Rajesh Patil',
            'cft': 'Chassis & Powertrain Quality CFT',
            'stdStatusMF': 'Completed',
            'stdDate': '2026-09-22',
            'responsibility': 'Amit S. / Priya M.',
            'ppsrEndDate': '2026-09-25',
            'prodQtyBefore': 2000,
            'rejectedQtyBefore': 80,
            'pctBefore': 4.0,
            'prodQtyAfter': 2000,
            'rejectedQtyAfter': 2,
            'pctAfter': 0.1,
            'custDemandQtyMonth': 8000,
            'custDemandQtyAnnum': 96000,
            'qtyMonthBeforeRejPct': 320,
            'qtyMonthAfterRejPct': 8,
            'qtyMonthSavedRejPct': 312,
            'perSetRejectionCost': 350.00,
            'costSavePerMonth': 109200.00,
            'costSavePerAnnum': 1310400.00,
            'remarks': 'End to End committee audit approved successfully.',
            'effectivityText': '100% defect-free output verified.',
        }

        patch_res = committee_client.patch(f'/api/v1/ppsr/reports/{report_id}/', review_patch, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        # 4. Committee re-logs in and fetches list again
        relogin_client = self._auth_client(self.committee)
        relogin_res = relogin_client.get('/api/v1/ppsr/reports/')
        self.assertEqual(relogin_res.status_code, status.HTTP_200_OK)

        results2 = relogin_res.data.get('results') if isinstance(relogin_res.data, dict) else relogin_res.data
        final_report = next((r for r in results2 if str(r.get('id')) == str(report_id)), None)
        self.assertIsNotNone(final_report)

        # Verify committee metrics AND initiator details persist
        self.assertEqual(final_report.get('status'), 'Closed')
        self.assertEqual(final_report.get('committeeDecision'), 'Approved')
        self.assertEqual(final_report.get('committee_decision'), 'Approved')
        self.assertEqual(final_report.get('jiraNumber'), 'KSPG-2026-999')
        self.assertEqual(final_report.get('coach'), 'Dr. Rajesh Patil')
        self.assertEqual(float(final_report.get('costSavePerMonth')), 109200.0)
        self.assertEqual(float(final_report.get('costSavePerAnnum')), 1310400.0)
        self.assertEqual(final_report.get('remarks'), 'End to End committee audit approved successfully.')
        self.assertEqual(final_report.get('steeringCommitteeSign'), 'Dr. Rajesh Patil (Steering Committee Head)')

        self.assertEqual(final_report.get('problemStatement'), payload['problem_statement'])
        self.assertEqual(final_report.get('factsAnalysis', {}).get('whatIs'), 'Seal ring extrusion')
        self.assertEqual(len(final_report.get('containmentActionsList', [])), 1)
        self.assertEqual(len(final_report.get('correctiveActionsList', [])), 1)
        self.assertEqual(final_report.get('psqTreeData', {}).get('name'), 'Valve Seat Leakage')
