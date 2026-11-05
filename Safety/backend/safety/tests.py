import json
from django.test import TestCase, Client
from django.contrib.auth.models import Group, User
from safety.models import SafetyObservation, NearMissReport, AccidentReport, SafetyIncident

class SafetyDeskAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        # Create RBAC groups
        for name in ['Operator', 'Safety Coordinator', 'Doctor', 'Committee Reviewer', 'Manager BI Desk']:
            Group.objects.get_or_create(name=name)

        # Create Doctor user
        self.doctor_user = User.objects.create_user(username='doctor1', password='password123')
        self.doctor_user.groups.add(Group.objects.get(name='Doctor'))

        # Create Operator user
        self.operator_user = User.objects.create_user(username='operator1', password='password123')
        self.operator_user.groups.add(Group.objects.get(name='Operator'))

    def test_health_check(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['framework'], 'django')

    def test_observations_flow(self):
        # 1. Create observation
        payload = {
            "srNo": "101",
            "date": "05-Nov-26",
            "shift": "A",
            "raisedBy": "Ramesh K",
            "minifactory": "MF1",
            "line": "Line 1",
            "station": "Conveyor 3",
            "legend": "Unsafe condition",
            "beforeCondition": "Conveyor roller guard loose"
        }
        res = self.client.post(
            '/api/safety/observations',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        obs_data = res.json()['data']
        obs_id = obs_data['id']
        self.assertEqual(obs_data['beforeCondition'], "Conveyor roller guard loose")

        # 2. Verify in list
        res_list = self.client.get('/api/safety/observations')
        self.assertEqual(res_list.status_code, 200)
        self.assertTrue(any(o['id'] == obs_id for o in res_list.json()['data']))

        # 3. Update observation (Coordinator action)
        update_payload = {
            "category": "A",
            "ica": "Tightened bolt and scheduled reinforcement bracket",
            "status": "In-Progress",
            "coordinatorName": "Vikram Sen"
        }
        res_update = self.client.put(
            f'/api/safety/observations/{obs_id}',
            data=json.dumps(update_payload),
            content_type='application/json'
        )
        self.assertEqual(res_update.status_code, 200)
        updated = res_update.json()['data']
        self.assertEqual(updated['category'], "A")
        self.assertEqual(updated['status'], "In-Progress")

    def test_near_miss_flow(self):
        payload = {
            "srNo": "201",
            "incidentDate": "05-Nov-26",
            "incidentTime": "14:00",
            "incidentType": "PD",
            "deptPlant": "MF2",
            "incidentReportedBy": "Suresh",
            "exactLocation": "Bay 4 aisle",
            "briefDescription": "Pallet stack tipped slightly onto bollard",
            "correctiveActionRecommended": "Stack height limited to 3 pallets"
        }
        res = self.client.post(
            '/api/safety/nearmiss',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        nm_data = res.json()['data']
        self.assertEqual(nm_data['exactLocation'], "Bay 4 aisle")

    def test_accident_report_flow(self):
        payload = {
            "recordNo": "CR/99",
            "division": "Pierburg",
            "accidentDate": "05-11-2026",
            "accidentRepDate": "05/11/2026",
            "department": "Assembly 2",
            "accidentTime": "11:30 AM",
            "nameOfInjured": "Deepak Verma",
            "ticketNo": "TS999",
            "divDepartment": "PIERBURG",
            "ageGender": "28/M",
            "agency": "Minor abrasion on palm",
            "exactSite": "Line 2 unloading chute",
            "bodyPartInjured": "RIGHT PALM",
            "natureOfInjury": "ABRASION",
            "treatmentGivenOHC": "FIRST AID ANTISEPTIC DRESSING",
            "medicalOfficerName": "Dr. ARJUN CHOUDHARY"
        }
        # Provide Doctor persona role header
        res = self.client.post(
            '/api/safety/accidents',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_PERSONA_ROLE='doctor'
        )
        self.assertEqual(res.status_code, 200)
        acc_data = res.json()['data']
        self.assertEqual(acc_data['recordNo'], "CR/99")
        self.assertEqual(acc_data['bodyPartInjured'], "RIGHT PALM")

    def test_safety_incidents_overview(self):
        res = self.client.get('/api/safetyincidents')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertIsInstance(data['data'], list)
