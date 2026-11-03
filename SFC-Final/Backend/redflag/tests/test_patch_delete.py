from datetime import timedelta
from django.test import TestCase
from django.contrib.auth.models import User, Group
from django.utils import timezone
from rest_framework.test import APIClient

from redflag.models import (
    Department, Plant, Line, Station, ProductModel, Employee,
    Attachment, RedFlag, RedFlagAuditLog, RedFlagConfig
)
from redflag.enums import AttachmentKind, Status, RedFlagType, Severity, Category5M
from redflag.permissions import GROUP_PLANT_HEAD, GROUP_QUALITY_CUSTODIAN


class PatchDeleteTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Seed master data
        self.prod_dept = Department.objects.create(code="PROD", name="Production", can_originate=True, can_be_target=True)
        self.qa_dept = Department.objects.create(code="QA", name="Quality Assurance", can_originate=True, can_be_target=True)
        self.maint_dept = Department.objects.create(code="MAINT", name="Maintenance", can_originate=True, can_be_target=True)

        self.plant = Plant.objects.create(code="MF1", name="Assembly 1", default_quarantine_location="Bay 1")
        self.line = Line.objects.create(plant=self.plant, name="Line 01")
        self.station = Station.objects.create(line=self.line, name="ST-01 Torquing")
        self.model = ProductModel.objects.create(name="Model K-100")

        # QA custodian
        self.qa_user = User.objects.create_user(username="qa_user", password="password123")
        self.qa_group, _ = Group.objects.get_or_create(name=GROUP_QUALITY_CUSTODIAN)
        self.qa_user.groups.add(self.qa_group)
        self.qa_emp = Employee.objects.create(
            user=self.qa_user,
            employee_code="QA01",
            full_name="Suresh Kumar",
            designation="Quality Custodian",
            department=self.qa_dept,
            plant=self.plant
        )

        # Plant Head
        self.ph_user = User.objects.create_user(username="ph_user", password="password123")
        self.ph_group, _ = Group.objects.get_or_create(name=GROUP_PLANT_HEAD)
        self.ph_user.groups.add(self.ph_group)
        self.ph_emp = Employee.objects.create(
            user=self.ph_user,
            employee_code="PH01",
            full_name="Ashok Patel",
            designation="Plant Head",
            department=self.prod_dept,
            plant=self.plant
        )

        # Raiser
        self.raiser_user = User.objects.create_user(username="raiser_user", password="password123")
        self.raiser_emp = Employee.objects.create(
            user=self.raiser_user,
            employee_code="OP01",
            full_name="Ramesh Pawar",
            designation="Operator",
            department=self.prod_dept,
            plant=self.plant
        )

        # Target person
        self.target_user = User.objects.create_user(username="target_user", password="password123")
        self.target_emp = Employee.objects.create(
            user=self.target_user,
            employee_code="TG01",
            full_name="Vijay Shinde",
            designation="Machinist",
            department=self.maint_dept,
            plant=self.plant
        )

        # Unrelated user
        self.other_user = User.objects.create_user(username="other_user", password="password123")
        self.other_emp = Employee.objects.create(
            user=self.other_user,
            employee_code="OTH01",
            full_name="Other Employee",
            designation="Store Clerk",
            department=self.prod_dept,
            plant=self.plant
        )

        RedFlagConfig.get_config()

        self.att = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/pending/T0_EVIDENCE/att.jpg',
            uploaded_by=self.raiser_user
        )

        now = timezone.now()
        self.flag = RedFlag.objects.create(
            sr_no=1,
            red_flag_no="RF-MF1-001",
            status=Status.OPEN,
            row_version=1,
            raised_at=now,
            raised_by=self.raiser_emp,
            raised_by_name=self.raiser_emp.label,
            raised_by_department=self.prod_dept,
            raised_by_department_name=self.prod_dept.name,
            target_department=self.maint_dept,
            target_department_name=self.maint_dept.name,
            target_person=self.target_emp,
            target_person_name=self.target_emp.label,
            plant=self.plant,
            plant_name=self.plant.code,
            line=self.line,
            line_name=self.line.name,
            station=self.station,
            station_name=self.station.name,
            model=self.model,
            model_name=self.model.name,
            red_flag_type=RedFlagType.QUALITY,
            severity=Severity.CRITICAL,
            category_5m=Category5M.METHOD,
            description="Initial defect description",
            evidence_photo=self.att,
            qa_custodian=self.qa_emp,
            qa_custodian_name=self.qa_emp.label,
            target_date=(now + timedelta(days=5)).date(),
        )

    def test_patch_with_stale_row_version_returns_409(self):
        self.client.force_authenticate(user=self.raiser_user)
        payload = {
            'rowVersion': 999,  # Stale row version! DB is 1
            'description': 'Updated description',
        }
        response = self.client.patch(f'/api/redflags/{self.flag.id}', data=payload, format='json')
        self.assertEqual(response.status_code, 409)
        data = response.json()
        self.assertFalse(data.get('success'))
        self.assertIn('rowVersion', data.get('error', '') + str(data.get('details', '')))

    def test_permitted_patch_updates_and_writes_audit_diff(self):
        self.client.force_authenticate(user=self.raiser_user)
        payload = {
            'rowVersion': 1,
            'description': 'Updated description by raiser',
            'severity': 'Moderate (Rework)',
        }
        response = self.client.patch(f'/api/redflags/{self.flag.id}', data=payload, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data')

        self.assertEqual(data['redFlagDescription'], 'Updated description by raiser')
        self.assertEqual(data['severity'], 'Moderate (Rework)')
        self.assertEqual(data['rowVersion'], 2)  # Version incremented!

        # Check DB
        self.flag.refresh_from_db()
        self.assertEqual(self.flag.row_version, 2)
        self.assertEqual(self.flag.description, 'Updated description by raiser')

        # Check Audit Log diff
        audit = RedFlagAuditLog.objects.filter(red_flag=self.flag, action='EDITED').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor, self.raiser_user)
        self.assertIn('description', audit.changes)
        self.assertEqual(audit.changes['description'], ['Initial defect description', 'Updated description by raiser'])
        self.assertIn('severity', audit.changes)
        self.assertEqual(audit.changes['severity'], ['Critical (Line Stop)', 'Moderate (Rework)'])

    def test_unauthorized_user_patch_returns_403(self):
        """Unrelated user who is not raiser, QA custodian, or Plant Head cannot edit."""
        self.client.force_authenticate(user=self.other_user)
        payload = {
            'rowVersion': 1,
            'description': 'Unauthorized edit attempt',
        }
        response = self.client.patch(f'/api/redflags/{self.flag.id}', data=payload, format='json')
        self.assertEqual(response.status_code, 403)

    def test_non_plant_head_cannot_edit_identity_fields(self):
        """Raiser is permitted to edit description, but NOT identity fields like raisedBy."""
        self.client.force_authenticate(user=self.raiser_user)
        payload = {
            'rowVersion': 1,
            'raisedBy': str(self.other_emp.id),
        }
        response = self.client.patch(f'/api/redflags/{self.flag.id}', data=payload, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertIn('Plant Head', response.json().get('error', ''))

    def test_plant_head_can_edit_identity_fields(self):
        """Plant Head can edit identity fields."""
        self.client.force_authenticate(user=self.ph_user)
        payload = {
            'rowVersion': 1,
            'raised_by': str(self.other_emp.id),
        }
        response = self.client.patch(f'/api/redflags/{self.flag.id}', data=payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.flag.refresh_from_db()
        self.assertEqual(self.flag.raised_by.id, self.other_emp.id)
        self.assertEqual(self.flag.raised_by_name, self.other_emp.label)

    def test_non_plant_head_delete_returns_403(self):
        # Raiser cannot delete
        self.client.force_authenticate(user=self.raiser_user)
        resp = self.client.delete(f'/api/redflags/{self.flag.id}', data={'reason': 'Mistake'}, format='json')
        self.assertEqual(resp.status_code, 403)

        # QA custodian cannot delete
        self.client.force_authenticate(user=self.qa_user)
        resp = self.client.delete(f'/api/redflags/{self.flag.id}', data={'reason': 'Mistake'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_plant_head_delete_without_reason_returns_400(self):
        self.client.force_authenticate(user=self.ph_user)
        resp = self.client.delete(f'/api/redflags/{self.flag.id}', data={'reason': ''}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('reason', resp.json().get('error', ''))

    def test_plant_head_delete_with_reason_soft_deletes_and_audits(self):
        self.client.force_authenticate(user=self.ph_user)
        resp = self.client.delete(
            f'/api/redflags/{self.flag.id}',
            data={'reason': 'Duplicate flag raised erroneously by trainee'},
            format='json'
        )
        self.assertEqual(resp.status_code, 200)

        # Verify soft-delete in DB
        self.flag.refresh_from_db()
        self.assertIsNotNone(self.flag.deleted_at)
        self.assertEqual(self.flag.deleted_by, self.ph_user)

        # Verify Audit Log
        audit = RedFlagAuditLog.objects.filter(red_flag=self.flag, action='DELETED').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor, self.ph_user)
        self.assertIn('reason', audit.changes)
        self.assertEqual(audit.changes['reason'], ['', 'Duplicate flag raised erroneously by trainee'])

        # Flag is now 404 for standard GET
        get_resp = self.client.get(f'/api/redflags/{self.flag.id}')
        self.assertEqual(get_resp.status_code, 404)

