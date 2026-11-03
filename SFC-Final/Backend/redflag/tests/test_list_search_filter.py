from datetime import timedelta
from django.test import TestCase
from django.contrib.auth.models import User, Group
from django.utils import timezone
from rest_framework.test import APIClient

from redflag.models import (
    Department, Plant, Line, Station, ProductModel, Employee,
    Attachment, RedFlag, StageHistory, RedFlagConfig
)
from redflag.enums import (
    AttachmentKind, Status, RedFlagType, Severity, Category5M, QaCustodianStatus
)
from redflag.permissions import GROUP_QUALITY_CUSTODIAN


class ListSearchFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Seed master data
        self.prod_dept = Department.objects.create(code="PROD", name="Production", can_originate=True, can_be_target=True)
        self.qa_dept = Department.objects.create(code="QA", name="Quality Assurance", can_originate=True, can_be_target=True)
        self.maint_dept = Department.objects.create(code="MAINT", name="Maintenance", can_originate=True, can_be_target=True)

        self.plant1 = Plant.objects.create(code="MF1", name="Assembly 1", default_quarantine_location="Bay 1")
        self.plant2 = Plant.objects.create(code="MF2", name="Machining", default_quarantine_location="Bay 2")

        self.line1 = Line.objects.create(plant=self.plant1, name="Line Alpha")
        self.line2 = Line.objects.create(plant=self.plant2, name="Line Beta")

        self.station1 = Station.objects.create(line=self.line1, name="ST-01 Torquing")
        self.station2 = Station.objects.create(line=self.line2, name="ST-02 Milling")

        self.model1 = ProductModel.objects.create(name="Model K-100")
        self.model2 = ProductModel.objects.create(name="Model K-200")

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
            plant=self.plant1
        )

        # Employees
        self.user1 = User.objects.create_user(username="op1", password="password123")
        self.emp1 = Employee.objects.create(
            user=self.user1,
            employee_code="OP01",
            full_name="Ramesh Pawar",
            designation="Operator",
            department=self.prod_dept,
            plant=self.plant1
        )

        self.user2 = User.objects.create_user(username="op2", password="password123")
        self.emp2 = Employee.objects.create(
            user=self.user2,
            employee_code="OP02",
            full_name="Vijay Shinde",
            designation="Machinist",
            department=self.maint_dept,
            plant=self.plant2
        )

        RedFlagConfig.get_config()

        # Create attachments
        self.att1 = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/pending/T0_EVIDENCE/att1.jpg',
            uploaded_by=self.user1
        )
        self.att2 = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/pending/T0_EVIDENCE/att2.jpg',
            uploaded_by=self.user2
        )
        self.att3 = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/pending/T0_EVIDENCE/att3.jpg',
            uploaded_by=self.user1
        )

        now = timezone.now()
        # Flag 1: Open, Plant 1, Severity Critical, Category Method
        self.flag1 = RedFlag.objects.create(
            sr_no=1,
            red_flag_no="RF-MF1-001",
            status=Status.OPEN,
            raised_at=now - timedelta(days=2),
            raised_by=self.emp1,
            raised_by_name=self.emp1.label,
            raised_by_department=self.prod_dept,
            raised_by_department_name=self.prod_dept.name,
            target_department=self.maint_dept,
            target_department_name=self.maint_dept.name,
            target_person=self.emp2,
            target_person_name=self.emp2.label,
            plant=self.plant1,
            plant_name=self.plant1.code,
            line=self.line1,
            line_name=self.line1.name,
            station=self.station1,
            station_name=self.station1.name,
            model=self.model1,
            model_name=self.model1.name,
            red_flag_type=RedFlagType.QUALITY,
            severity=Severity.CRITICAL,
            category_5m=Category5M.METHOD,
            description="Misaligned bracket causing assembly jam",
            evidence_photo=self.att1,
            qa_custodian=self.qa_emp,
            qa_custodian_name=self.qa_emp.label,
            target_date=(now + timedelta(days=5)).date(),
        )

        # Flag 2: Contained, Plant 2, Severity Moderate, Category Machine
        self.flag2 = RedFlag.objects.create(
            sr_no=2,
            red_flag_no="RF-MF2-002",
            status=Status.CONTAINED,
            raised_at=now - timedelta(days=1),
            raised_by=self.emp2,
            raised_by_name=self.emp2.label,
            raised_by_department=self.maint_dept,
            raised_by_department_name=self.maint_dept.name,
            target_department=self.prod_dept,
            target_department_name=self.prod_dept.name,
            target_person=self.emp1,
            target_person_name=self.emp1.label,
            plant=self.plant2,
            plant_name=self.plant2.code,
            line=self.line2,
            line_name=self.line2.name,
            station=self.station2,
            station_name=self.station2.name,
            model=self.model2,
            model_name=self.model2.name,
            red_flag_type=RedFlagType.MACHINE,
            severity=Severity.MODERATE,
            category_5m=Category5M.MACHINE,
            description="Hydraulic pressure dropping intermittently",
            evidence_photo=self.att2,
            qa_custodian=self.qa_emp,
            qa_custodian_name=self.qa_emp.label,
            target_date=(now + timedelta(days=7)).date(),
        )

        # Flag 3: Soft-deleted flag
        self.flag3 = RedFlag.objects.create(
            sr_no=3,
            red_flag_no="RF-MF1-003",
            status=Status.OPEN,
            raised_at=now,
            raised_by=self.emp1,
            raised_by_name=self.emp1.label,
            raised_by_department=self.prod_dept,
            raised_by_department_name=self.prod_dept.name,
            target_department=self.prod_dept,
            target_department_name=self.prod_dept.name,
            target_person=self.emp1,
            target_person_name=self.emp1.label,
            plant=self.plant1,
            plant_name=self.plant1.code,
            line=self.line1,
            line_name=self.line1.name,
            station=self.station1,
            station_name=self.station1.name,
            model=self.model1,
            model_name=self.model1.name,
            red_flag_type=RedFlagType.QUALITY,
            severity=Severity.MAJOR,
            category_5m=Category5M.MAN,
            description="Deleted defect",
            evidence_photo=self.att3,
            qa_custodian=self.qa_emp,
            qa_custodian_name=self.qa_emp.label,
            target_date=(now + timedelta(days=5)).date(),
            deleted_at=now,
            deleted_by=self.user1
        )

        self.client.force_authenticate(user=self.user1)

    def test_soft_deleted_flags_are_excluded(self):
        response = self.client.get('/api/redflags')
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data')
        self.assertEqual(len(data), 2)
        flag_nos = [f['redFlagNo'] for f in data]
        self.assertIn('RF-MF1-001', flag_nos)
        self.assertIn('RF-MF2-002', flag_nos)
        self.assertNotIn('RF-MF1-003', flag_nos)

    def test_search_q_parameter(self):
        # Search by number
        resp = self.client.get('/api/redflags?q=MF1-001')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF1-001')

        # Search by description
        resp = self.client.get('/api/redflags?q=hydraulic')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF2-002')

        # Search by line name
        resp = self.client.get('/api/redflags?q=Alpha')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF1-001')

    def test_filters(self):
        # Filter by status
        resp = self.client.get('/api/redflags?status=Open')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF1-001')

        # Filter by plant
        resp = self.client.get('/api/redflags?plant=MF2')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF2-002')

        # Filter by target department
        resp = self.client.get('/api/redflags?targetDepartment=Maintenance')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF1-001')

        # Filter by severity
        resp = self.client.get('/api/redflags?severity=Critical (Line Stop)')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF1-001')

        # Filter by stage awaitingContainment (= Open)
        resp = self.client.get('/api/redflags?stage=awaitingContainment')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF1-001')

        # Filter by stage awaitingQuality (= Contained)
        resp = self.client.get('/api/redflags?stage=awaitingQuality')
        self.assertEqual(len(resp.json()['data']), 1)
        self.assertEqual(resp.json()['data'][0]['redFlagNo'], 'RF-MF2-002')

    def test_constant_query_count(self):
        """
        Query count should be completely constant regardless of row count,
        ensured via select_related, prefetch_related, and role caching.
        """
        # Baseline query count with 2 flags:
        # Query 1: SELECT redflag (with all select_related FKs + root_cause + closure)
        # Query 2: SELECT stage_history (prefetched)
        # Query 3: SELECT containment_attempts (prefetched)
        # Query 4: SELECT sustenance_checks (prefetched)
        # Query 5: SELECT escalation_links (prefetched)
        # Query 6: SELECT user_groups (cached for all subsequent evaluations)
        with self.assertNumQueries(6):
            response = self.client.get('/api/redflags')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()['data']), 2)

        # Create another flag
        now = timezone.now()
        RedFlag.objects.create(
            sr_no=4,
            red_flag_no="RF-MF1-004",
            status=Status.OPEN,
            raised_at=now,
            raised_by=self.emp1,
            raised_by_name=self.emp1.label,
            raised_by_department=self.prod_dept,
            raised_by_department_name=self.prod_dept.name,
            target_department=self.prod_dept,
            target_department_name=self.prod_dept.name,
            target_person=self.emp1,
            target_person_name=self.emp1.label,
            plant=self.plant1,
            plant_name=self.plant1.code,
            line=self.line1,
            line_name=self.line1.name,
            station=self.station1,
            station_name=self.station1.name,
            model=self.model1,
            model_name=self.model1.name,
            red_flag_type=RedFlagType.SAFETY,
            severity=Severity.MODERATE,
            category_5m=Category5M.ENVIRONMENT,
            description="Oil spill near station",
            evidence_photo=self.att1,
            qa_custodian=self.qa_emp,
            qa_custodian_name=self.qa_emp.label,
            target_date=(now + timedelta(days=3)).date(),
        )

        # Clear cached roles to simulate a fresh request
        if hasattr(self.user1, '_cached_roles'):
            del self.user1._cached_roles

        # Query count with 3 flags MUST STILL BE EXACTLY 6 (constant query count)!
        with self.assertNumQueries(6):
            response = self.client.get('/api/redflags')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()['data']), 3)
