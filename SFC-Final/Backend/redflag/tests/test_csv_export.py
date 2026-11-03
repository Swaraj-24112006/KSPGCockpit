import csv
import io
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from redflag.models import (
    Department, Plant, Line, Station, ProductModel, Employee,
    Attachment, RedFlag, RedFlagConfig
)
from redflag.enums import AttachmentKind, Status, RedFlagType, Severity, Category5M


class CSVExportTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.dept = Department.objects.create(code="PROD", name="Production")
        self.plant = Plant.objects.create(code="MF1", name="Assembly")
        self.line = Line.objects.create(plant=self.plant, name="Line 01")
        self.station = Station.objects.create(line=self.line, name="ST-01 Torquing")
        self.model = ProductModel.objects.create(name="Model K")

        self.user = User.objects.create_user(username="user1", password="password123")
        self.emp = Employee.objects.create(
            user=self.user,
            employee_code="E01",
            full_name="Ramesh Pawar",
            designation="Operator",
            department=self.dept,
            plant=self.plant
        )

        RedFlagConfig.get_config()

        self.att = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/pending/T0_EVIDENCE/att.jpg',
            uploaded_by=self.user
        )

        now = timezone.now()
        # Create a flag with a formula injection attack in description
        self.flag = RedFlag.objects.create(
            sr_no=1,
            red_flag_no="RF-MF1-001",
            status=Status.OPEN,
            raised_at=now,
            raised_by=self.emp,
            raised_by_name=self.emp.label,
            raised_by_department=self.dept,
            raised_by_department_name=self.dept.name,
            target_department=self.dept,
            target_department_name=self.dept.name,
            target_person=self.emp,
            target_person_name=self.emp.label,
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
            description="=cmd|' /C calc'!A0",  # Formula injection payload!
            evidence_photo=self.att,
            qa_custodian=self.emp,
            qa_custodian_name=self.emp.label,
            target_date=(now + timedelta(days=5)).date(),
        )

        self.client.force_authenticate(user=self.user)

    def test_csv_export_has_bom_and_correct_headers(self):
        response = self.client.get('/api/redflags/export.csv')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn('attachment; filename="SFC_RedFlags_Master_', response['Content-Disposition'])

        content = response.content
        # Must start with UTF-8 BOM
        self.assertTrue(content.startswith(b'\xef\xbb\xbf'))

        # Decode excluding BOM
        csv_text = content[3:].decode('utf-8')
        reader = csv.reader(io.StringIO(csv_text))
        rows = list(reader)

        expected_headers = [
            "Sr No", "Red Flag No", "Raised Date", "Raised By", "Originating Dept",
            "Target Dept", "Target Person", "Plant Area", "Station", "Model",
            "Type", "5M Category", "Severity", "Description", "Quarantined WIP",
            "QA Custodian", "Status", "Sustenance Start", "M1 Audit", "M2 Audit", "M3 Audit", "Sustenance Achieved"
        ]
        self.assertEqual(rows[0], expected_headers)

        # Check row values
        data_row = rows[1]
        self.assertEqual(data_row[0], '1')  # Sr No
        self.assertEqual(data_row[1], 'RF-MF1-001')  # Red Flag No
        self.assertEqual(data_row[3], 'Ramesh Pawar (Operator)')  # Raised By
        self.assertEqual(data_row[7], 'Line 01')  # Plant Area
        self.assertEqual(data_row[8], 'ST-01 Torquing')  # Station
        self.assertEqual(data_row[9], 'Model K')  # Model
        self.assertEqual(data_row[10], 'Quality')  # Type
        self.assertEqual(data_row[11], 'Method')  # 5M Category
        self.assertEqual(data_row[12], 'Critical (Line Stop)')  # Severity

        # Formula injection MUST be sanitized with leading single quote!
        self.assertEqual(data_row[13], "'=cmd|' /C calc'!A0")
        self.assertEqual(data_row[16], 'Open')  # Status
        self.assertEqual(data_row[21], 'NO')  # Sustenance Achieved
