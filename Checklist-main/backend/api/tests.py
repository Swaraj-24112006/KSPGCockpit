from django.test import TestCase, Client
from .models import Minifactory, Line, Station, ChecklistSubmission, DeviationLog
from .initial_seed import seed_clean_hierarchy, clear_complete_database


class TPMAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        seed_clean_hierarchy()

    def test_01_config_endpoint(self):
        res = self.client.get('/api/config')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('module', data)
        self.assertIn('routes', data)
        self.assertIn('server', data)

    def test_02_health_endpoint(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('status', data)
        self.assertIn('storage', data)

    def test_03_minifactories_and_master_structure(self):
        res = self.client.get('/api/minifactories')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('minifactories', data)
        self.assertEqual(len(data['minifactories']), 3)

        res_struct = self.client.get('/api/master/structure')
        self.assertEqual(res_struct.status_code, 200)
        self.assertTrue(res_struct.json()['success'])

    def test_04_master_machine_crud(self):
        # Create machine
        payload = {
            'number': 'M-99',
            'name': 'Test CNC Milling Station',
            'minifactoryId': 'MF1',
            'lineId': 'MF1-LINE1',
            'lineName': 'Machining Line 1',
            'operatorName': 'John Doe',
            'operatorId': 'OP-999',
        }
        res = self.client.post('/api/master/machines', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data['success'])
        st_id = data['station']['id']

        # Save dynamic checklist template
        chk_payload = {
            'stationId': st_id,
            'machineCheckpoints': [
                {
                    'id': 'm1',
                    'sn': 1,
                    'checkPoint': 'Check coolant level',
                    'model': 'CNC',
                    'standard': 'Above Min mark',
                    'freq': 'Per shift',
                    'photoRequired': True,
                    'status': 'PENDING',
                    'photos': [],
                }
            ],
            'pokayokeCheckpoints': [],
        }
        res_chk = self.client.post('/api/master/checklists', data=chk_payload, content_type='application/json')
        self.assertEqual(res_chk.status_code, 200)

        # Get dynamic checklist template
        res_get = self.client.get(f'/api/master/checklists/{st_id}')
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(len(res_get.json()['template']['machineCheckpoints']), 1)

        # Delete machine
        res_del = self.client.delete(f'/api/master/machines/{st_id}')
        self.assertEqual(res_del.status_code, 200)

    def test_05_checklist_submission_flow(self):
        # Create station first
        self.client.post('/api/master/machines', data={
            'id': 'st-test-sub',
            'number': '101',
            'name': 'Assembly Station',
            'minifactoryId': 'MF1',
            'lineId': 'MF1-LINE1',
        }, content_type='application/json')

        submission_payload = {
            'minifactoryId': 'MF1',
            'lineId': 'MF1-LINE1',
            'stationId': 'st-test-sub',
            'stationNumber': '101',
            'lineName': 'Machining Line 1',
            'operatorName': 'Alice',
            'operatorId': 'OP-101',
            'shift': 'Shift 1',
            'overallStatus': 'DEVIATION',
            'timeTakenSeconds': 85,
            'machineCheckpoints': [],
            'pokayokeCheckpoints': [],
            'deviations': [
                {
                    'id': 'dev-test-1',
                    'sn': 1,
                    'problemDescription': 'Oil leak near cylinder',
                    'owner': 'Maintenance',
                    'countermeasure': 'Replace seal',
                    'status': 'Open',
                }
            ],
        }
        res = self.client.post('/api/checklists/submit', data=submission_payload, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertIn('submissionId', data)

        # Check submissions query
        res_subs = self.client.get('/api/submissions')
        self.assertEqual(res_subs.status_code, 200)
        self.assertEqual(res_subs.json()['total'], 1)

        # Check deviations query
        res_devs = self.client.get('/api/deviations')
        self.assertEqual(res_devs.status_code, 200)
        self.assertEqual(res_devs.json()['total'], 1)

        # Patch deviation
        res_patch = self.client.patch('/api/deviations/dev-test-1', data={'status': 'Resolved'}, content_type='application/json')
        self.assertEqual(res_patch.status_code, 200)
        self.assertEqual(res_patch.json()['deviation']['status'], 'Resolved')

        # Admin audit
        res_audit = self.client.get('/api/admin/audit')
        self.assertEqual(res_audit.status_code, 200)
        self.assertEqual(res_audit.json()['summary']['totalSubmissions'], 1)

        # Clear all
        res_clear = self.client.post('/api/master/clear-all')
        self.assertEqual(res_clear.status_code, 200)
        self.assertEqual(ChecklistSubmission.objects.count(), 0)
