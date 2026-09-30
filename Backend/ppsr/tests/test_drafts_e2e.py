"""
End-to-End Tests for PPSR Save Draft Feature
==============================================
Tests the complete lifecycle of PPSR drafts:
1. Creating drafts with incomplete / partial form data
2. Automatic temporary DRAFT- prefix assignment
3. Strict exclusion of drafts from the main PPSR register / list API
4. Listing drafts via /api/ppsr/reports/drafts/
5. Progressive updating of drafts across multiple steps
6. Submitting a draft (Draft -> Open) which assigns a formal PPSR number
7. Verification that submitted draft now appears in the register and leaves drafts
8. Deletion of drafts
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from ppsr.models import PpsrReport


class PpsrDraftsE2ETestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_minimal_draft(self):
        """A draft can be saved with only partial / minimal fields without failing validation."""
        payload = {
            'title': 'Rough Draft for Oil Leakage',
            'status': 'Draft',
            'lastSavedStep': 1,
            'plant': 'Pune Assembly & Paint Complex',
        }
        res = self.client.post('/api/ppsr/reports/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        data = res.data
        self.assertEqual(data['status'], 'Draft')
        self.assertTrue(data['ppsrNo'].startswith('DRAFT-'))
        self.assertEqual(data['lastSavedStep'], 1)

    def test_draft_excluded_from_main_register_and_included_in_drafts_endpoint(self):
        """Drafts must NOT appear in normal reports list, only in /drafts/ endpoint."""
        # 1. Create one Open report and one Draft
        self.client.post('/api/ppsr/reports/', {
            'title': 'Active Submitted Report',
            'problemStatement': 'Valid problem statement',
            'leadOwner': 'John Doe',
            'plant': 'Plant 1',
            'status': 'Open',
        }, format='json')

        draft_res = self.client.post('/api/ppsr/reports/', {
            'title': 'Incomplete Draft Report',
            'status': 'Draft',
            'lastSavedStep': 2,
        }, format='json')
        draft_id = draft_res.data['id']

        # 2. Query normal reports endpoint
        list_res = self.client.get('/api/ppsr/reports/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        returned_reports = list_res.data.get('results', list_res.data)
        # Should contain Active Submitted Report but NOT Incomplete Draft Report
        titles = [r['title'] for r in returned_reports]
        self.assertIn('Active Submitted Report', titles)
        self.assertNotIn('Incomplete Draft Report', titles)

        # 3. Query drafts endpoint
        drafts_res = self.client.get('/api/ppsr/reports/drafts/')
        self.assertEqual(drafts_res.status_code, status.HTTP_200_OK)
        drafts_list = drafts_res.data if isinstance(drafts_res.data, list) else drafts_res.data.get('results', [])
        draft_titles = [d['title'] for d in drafts_list]
        self.assertIn('Incomplete Draft Report', draft_titles)
        self.assertNotIn('Active Submitted Report', draft_titles)

    def test_update_draft_progress(self):
        """Updating a draft should save its progress (fields and lastSavedStep)."""
        create_res = self.client.post('/api/ppsr/reports/', {
            'title': 'Draft Step 1',
            'status': 'Draft',
            'lastSavedStep': 1,
        }, format='json')
        draft_id = create_res.data['id']

        # Update draft on Step 3
        update_res = self.client.patch(f'/api/ppsr/reports/{draft_id}/', {
            'title': 'Draft Step 3 with RCA',
            'problemStatement': 'Detailed facts recorded',
            'lastSavedStep': 3,
            'rootCauseAnalysis': 'Contaminated seal material',
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['lastSavedStep'], 3)
        self.assertEqual(update_res.data['title'], 'Draft Step 3 with RCA')
        self.assertEqual(update_res.data['status'], 'Draft')

    def test_submit_draft_end_to_end(self):
        """Submitting a draft (status: Open) assigns real PPSR number and moves to register."""
        create_res = self.client.post('/api/ppsr/reports/', {
            'title': 'Almost Done Draft',
            'status': 'Draft',
            'lastSavedStep': 4,
        }, format='json')
        draft_id = create_res.data['id']
        temp_ppsr_no = create_res.data['ppsrNo']
        self.assertTrue(temp_ppsr_no.startswith('DRAFT-'))

        # Submit the draft
        submit_res = self.client.patch(f'/api/ppsr/reports/{draft_id}/', {
            'status': 'Open',
            'title': 'Finalized PPSR Report',
            'problemStatement': 'Complete description of defect',
            'leadOwner': 'Jane Smith',
            'plant': 'Pune Assembly & Paint Complex',
        }, format='json')
        self.assertEqual(submit_res.status_code, status.HTTP_200_OK)
        new_ppsr_no = submit_res.data['ppsrNo']
        # The temporary DRAFT- prefix should be replaced with official PPSR number format
        self.assertFalse(new_ppsr_no.startswith('DRAFT-'))
        self.assertEqual(submit_res.data['status'], 'Open')

        # Now verify it appears in normal reports list
        list_res = self.client.get('/api/ppsr/reports/')
        returned = list_res.data.get('results', list_res.data)
        list_ids = [r['id'] for r in returned]
        self.assertIn(draft_id, list_ids)

        # And verify it has been removed from drafts
        drafts_res = self.client.get('/api/ppsr/reports/drafts/')
        drafts_list = drafts_res.data if isinstance(drafts_res.data, list) else drafts_res.data.get('results', [])
        draft_ids = [d['id'] for d in drafts_list]
        self.assertNotIn(draft_id, draft_ids)

    def test_delete_draft(self):
        """Initiator can delete an unwanted draft."""
        create_res = self.client.post('/api/ppsr/reports/', {
            'title': 'Draft to delete',
            'status': 'Draft',
        }, format='json')
        draft_id = create_res.data['id']

        del_res = self.client.delete(f'/api/ppsr/reports/{draft_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertFalse(PpsrReport.objects.filter(id=draft_id).exists())
