import json
from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from redflag.models import Department, Plant, Line, Station, ProductModel, Employee, RedFlagConfig
from redflag.permissions import GROUP_PLANT_HEAD, GROUP_QUALITY_CUSTODIAN

class BootstrapEndpointsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Seed master data
        self.dept = Department.objects.create(code="PROD", name="Production", can_originate=True, can_be_target=True)
        self.plant = Plant.objects.create(code="MF1", name="Assembly & Testing", default_quarantine_location="Bay 1")
        self.line = Line.objects.create(plant=self.plant, name="Line 01")
        self.station = Station.objects.create(line=self.line, name="ST-01 Torquing")
        self.model = ProductModel.objects.create(name="Model K-2026")

        # Create user + employee
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.qa_group, _ = Group.objects.get_or_create(name=GROUP_QUALITY_CUSTODIAN)
        self.user.groups.add(self.qa_group)

        self.employee = Employee.objects.create(
            user=self.user,
            employee_code="EMP999",
            full_name="Sunil Deshmukh",
            designation="Quality Custodian",
            department=self.dept,
            plant=self.plant
        )

        # Trigger default config
        RedFlagConfig.get_config()

    def test_unauthenticated_requests_return_401(self):
        resp_me = self.client.get('/api/redflags/me')
        self.assertEqual(resp_me.status_code, 401)

        resp_lookups = self.client.get('/api/redflags/lookups')
        self.assertEqual(resp_lookups.status_code, 401)

    def test_me_endpoint_returns_documented_shape(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/redflags/me')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        user_info = data.get('data')

        self.assertEqual(user_info['userId'], self.user.id)
        self.assertEqual(user_info['employeeId'], str(self.employee.id))
        self.assertEqual(user_info['label'], "Sunil Deshmukh (Quality Custodian)")
        self.assertEqual(user_info['department'], "Production")
        self.assertIn("Initiator", user_info['roles'])
        self.assertIn("Quality Custodian", user_info['roles'])
        self.assertTrue(user_info['isQualityCustodian'])
        self.assertFalse(user_info['isPlantHead'])

    def test_lookups_endpoint_returns_documented_shape(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/redflags/lookups')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        lookups = data.get('data')

        self.assertIn('plants', lookups)
        self.assertIn('models', lookups)
        self.assertIn('departments', lookups)
        self.assertIn('employees', lookups)
        self.assertIn('enums', lookups)
        self.assertIn('config', lookups)

        # Check plant with nested lines & stations
        self.assertEqual(len(lookups['plants']), 1)
        p = lookups['plants'][0]
        self.assertEqual(p['code'], "MF1")
        self.assertEqual(p['defaultQuarantineLocation'], "Bay 1")
        self.assertEqual(len(p['lines']), 1)
        self.assertEqual(len(p['lines'][0]['stations']), 1)

        # Check employee lookup does NOT expose email or phone
        emp = lookups['employees'][0]
        self.assertIn('id', emp)
        self.assertIn('label', emp)
        self.assertIn('department', emp)
        self.assertNotIn('email', emp)
        self.assertNotIn('phone', emp)

        # Check enums structure {value, label}
        self.assertIn('severity', lookups['enums'])
        self.assertTrue(any(e['value'] == 'Critical (Line Stop)' for e in lookups['enums']['severity']))

        # Check config
        self.assertEqual(lookups['config']['containmentSlaMinutes'], 120)

