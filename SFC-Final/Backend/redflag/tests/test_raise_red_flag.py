import base64
import io
import threading
from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from PIL import Image

from redflag.models import (
    Department, Plant, Line, Station, ProductModel, Employee,
    Attachment, RedFlag, StageHistory, RedFlagAuditLog, RedFlagSequence,
    RedFlagConfig
)
from redflag.enums import AttachmentKind, Status, QaCustodianStatus
from redflag.permissions import GROUP_PLANT_HEAD, GROUP_QUALITY_CUSTODIAN
from redflag.services.raise_red_flag import _next_sr_no, raise_red_flag


def create_dummy_image_data_url(format='JPEG'):
    img = Image.new('RGB', (100, 100), color='red')
    buf = io.BytesIO()
    img.save(buf, format=format)
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    mime = 'jpeg' if format.upper() == 'JPEG' else format.lower()
    return f"data:image/{mime};base64,{b64}"


class RaiseRedFlagTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Seed master data
        self.prod_dept = Department.objects.create(code="PROD", name="Production", can_originate=True, can_be_target=True)
        self.qa_dept = Department.objects.create(code="QA", name="Quality Assurance", can_originate=True, can_be_target=True)

        self.plant = Plant.objects.create(code="MF1", name="Assembly & Testing", default_quarantine_location="Bay 1")
        self.line = Line.objects.create(plant=self.plant, name="Line 01")
        self.station = Station.objects.create(line=self.line, name="ST-01 Torquing")
        self.model = ProductModel.objects.create(name="Model K-2026")

        # QA custodian employee
        self.qa_user = User.objects.create_user(username="qa_custodian", password="password123")
        self.qa_group, _ = Group.objects.get_or_create(name=GROUP_QUALITY_CUSTODIAN)
        self.qa_user.groups.add(self.qa_group)
        self.qa_emp = Employee.objects.create(
            user=self.qa_user,
            employee_code="QA001",
            full_name="Suresh Kumar",
            designation="Quality Custodian",
            department=self.qa_dept,
            plant=self.plant
        )
        self.plant.default_qa_custodian = self.qa_emp
        self.plant.save()

        # Initiator user
        self.initiator_user = User.objects.create_user(username="initiator", password="password123")
        self.initiator_emp = Employee.objects.create(
            user=self.initiator_user,
            employee_code="OP001",
            full_name="Ramesh Pawar",
            designation="Line Operator",
            department=self.prod_dept,
            plant=self.plant
        )

        # Target person
        self.target_user = User.objects.create_user(username="target_person", password="password123")
        self.target_emp = Employee.objects.create(
            user=self.target_user,
            employee_code="TG001",
            full_name="Vijay Shinde",
            designation="Machine Operator",
            department=self.prod_dept,
            plant=self.plant
        )

        # Plant Head
        self.ph_user = User.objects.create_user(username="plant_head", password="password123")
        self.ph_group, _ = Group.objects.get_or_create(name=GROUP_PLANT_HEAD)
        self.ph_user.groups.add(self.ph_group)
        self.ph_emp = Employee.objects.create(
            user=self.ph_user,
            employee_code="PH001",
            full_name="Ashok Patel",
            designation="Plant Head",
            department=self.prod_dept,
            plant=self.plant
        )

        # Config
        RedFlagConfig.get_config()

        # Pre-created Attachment
        self.attachment = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/pending/T0_EVIDENCE/test.jpg',
            original_name='test.jpg',
            content_type='image/jpeg',
            size_bytes=1024,
            width=100,
            height=100,
            sha256='abc123sha',
            uploaded_by=self.initiator_user
        )

    def test_raising_without_t0_photo_returns_422(self):
        self.client.force_authenticate(user=self.initiator_user)
        payload = {
            'description': 'Loose bolt observed at ST-01',
            'plant': str(self.plant.id),
            'line': str(self.line.id),
            'station': str(self.station.id),
            'model': str(self.model.id),
            'redFlagType': 'Quality',
            'severity': 'Critical (Line Stop)',
            'category5M': 'Method',
            'targetDepartment': str(self.prod_dept.id),
            'targetPerson': str(self.target_emp.id),
            # Missing evidence photo!
        }
        response = self.client.post('/api/redflags', data=payload, format='json')
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertFalse(data.get('success'))
        self.assertIn('evidencePhoto', data.get('details', {}))

    def test_raising_with_svg_photo_returns_422(self):
        self.client.force_authenticate(user=self.initiator_user)
        payload = {
            'description': 'Defect with SVG',
            'plant': str(self.plant.id),
            'line': str(self.line.id),
            'station': str(self.station.id),
            'model': str(self.model.id),
            'redFlagType': 'Quality',
            'severity': 'Moderate (Rework)',
            'category5M': 'Machine',
            'targetDepartment': str(self.prod_dept.id),
            'targetPerson': str(self.target_emp.id),
            'evidencePhoto': '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
        }
        response = self.client.post('/api/redflags', data=payload, format='json')
        self.assertEqual(response.status_code, 422)
        self.assertFalse(response.json().get('success'))

    def test_successful_raise_creates_flag_and_audit(self):
        self.client.force_authenticate(user=self.initiator_user)
        payload = {
            'description': 'Misaligned bracket causing assembly jam',
            'plant': str(self.plant.id),
            'line': str(self.line.id),
            'station': str(self.station.id),
            'model': str(self.model.id),
            'redFlagType': 'Quality',
            'redFlagSubType': 'Assembly Jam',
            'severity': 'Critical (Line Stop)',
            'category5M': 'Method',
            'targetDepartment': str(self.prod_dept.id),
            'targetPerson': str(self.target_emp.id),
            'evidenceAttachmentId': str(self.attachment.id),
            'raisedTimestamp': '2026-11-01 10:30',
        }
        response = self.client.post('/api/redflags', data=payload, format='json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data.get('success'))
        flag_data = data.get('data')

        self.assertEqual(flag_data['redFlagNo'], 'RF-MF1-001')
        self.assertEqual(flag_data['status'], 'Open')
        self.assertEqual(flag_data['containmentStatus'], 'Pending')
        self.assertEqual(flag_data['qaCustodianStatus'], 'Review Pending')
        self.assertEqual(flag_data['raisedBy'], 'Ramesh Pawar (Line Operator)')
        self.assertEqual(flag_data['targetPerson'], 'Vijay Shinde (Machine Operator)')
        self.assertEqual(flag_data['qaCustodian'], 'Suresh Kumar (Quality Custodian)')
        self.assertEqual(flag_data['mfName'], 'MF1')
        self.assertEqual(flag_data['lineAreaName'], 'Line 01')
        self.assertEqual(flag_data['stationName'], 'ST-01 Torquing')
        self.assertEqual(flag_data['modelName'], 'Model K-2026')
        self.assertEqual(flag_data['rowVersion'], 1)
        self.assertIn('editDetails', flag_data['allowedActions'])

        # Verify DB state
        flag = RedFlag.objects.get(red_flag_no='RF-MF1-001')
        self.assertEqual(flag.sr_no, 1)
        self.assertEqual(flag.evidence_photo.id, self.attachment.id)

        # StageHistory check
        history = StageHistory.objects.filter(red_flag=flag)
        self.assertEqual(history.count(), 1)
        h = history.first()
        self.assertEqual(h.stage, 'Detection')
        self.assertEqual(h.event, 'RAISED')
        self.assertEqual(h.completed_by_name, 'Ramesh Pawar (Line Operator)')

        # RedFlagAuditLog check
        audit = RedFlagAuditLog.objects.filter(red_flag=flag)
        self.assertEqual(audit.count(), 1)
        self.assertEqual(audit.first().action, 'RAISED')

    def test_initiator_cannot_override_raised_by(self):
        """Regular initiator cannot impersonate another employee as raised_by."""
        self.client.force_authenticate(user=self.initiator_user)
        payload = {
            'description': 'Attempting impersonation',
            'plant': str(self.plant.id),
            'line': str(self.line.id),
            'station': str(self.station.id),
            'model': str(self.model.id),
            'redFlagType': 'Quality',
            'severity': 'Moderate (Rework)',
            'category5M': 'Man',
            'targetDepartment': str(self.prod_dept.id),
            'targetPerson': str(self.target_emp.id),
            'evidenceAttachmentId': str(self.attachment.id),
            'raised_by': str(self.target_emp.id),  # Client attempts override
        }
        response = self.client.post('/api/redflags', data=payload, format='json')
        self.assertEqual(response.status_code, 201)
        flag_data = response.json().get('data')
        # Must still be initiator's employee profile
        self.assertEqual(flag_data['raisedBy'], 'Ramesh Pawar (Line Operator)')

    def test_plant_head_can_override_raised_by(self):
        """Plant Head has admin authority to raise on behalf of another employee."""
        self.client.force_authenticate(user=self.ph_user)
        payload = {
            'description': 'Raised on behalf of shopfloor operator',
            'plant': str(self.plant.id),
            'line': str(self.line.id),
            'station': str(self.station.id),
            'model': str(self.model.id),
            'redFlagType': 'Quality',
            'severity': 'Major (Quarantine)',
            'category5M': 'Material',
            'targetDepartment': str(self.prod_dept.id),
            'targetPerson': str(self.target_emp.id),
            'evidenceAttachmentId': str(self.attachment.id),
            'raised_by': str(self.initiator_emp.id),  # Plant Head assigns to operator
        }
        response = self.client.post('/api/redflags', data=payload, format='json')
        self.assertEqual(response.status_code, 201)
        flag_data = response.json().get('data')
        self.assertEqual(flag_data['raisedBy'], 'Ramesh Pawar (Line Operator)')


class ConcurrencySequenceTests(TransactionTestCase):
    """Test that concurrent sequence generation never produces duplicates."""
    def test_concurrent_sequence_generation_never_duplicates(self):
        RedFlagSequence.objects.get_or_create(name='redflag', defaults={'last_value': 0})
        numbers = []
        errors = []
        lock = threading.Lock()

        def worker():
            from django.db import connection
            try:
                for _ in range(5):
                    val = _next_sr_no()
                    with lock:
                        numbers.append(val)
            except Exception as e:
                with lock:
                    errors.append(e)
            finally:
                connection.close()

        threads = [threading.Thread(target=worker) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(errors, [])
        self.assertEqual(len(numbers), 20)
        # Verify all numbers are unique
        self.assertEqual(len(set(numbers)), 20)
