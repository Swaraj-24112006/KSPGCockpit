import io
import uuid
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User, Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from redflag.models import (
    Plant, Line, Station, ProductModel, Department, Employee,
    Attachment, RedFlag, StageHistory, RedFlagAuditLog, RedFlagConfig
)
from redflag.enums import (
    Status, RedFlagType, Severity, Category5M, Repetitive,
    AttachmentKind, ContainmentStatus, CheckStatus
)
from redflag.permissions import (
    GROUP_QUALITY_CUSTODIAN, GROUP_PLANT_HEAD, GROUP_TARGET_PERSON
)
from redflag.storage import presign

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


class Phase7HardeningTests(APITestCase):
    def setUp(self):
        # 1. Groups
        self.g_qa, _ = Group.objects.get_or_create(name=GROUP_QUALITY_CUSTODIAN)
        self.g_ph, _ = Group.objects.get_or_create(name=GROUP_PLANT_HEAD)
        self.g_tp, _ = Group.objects.get_or_create(name=GROUP_TARGET_PERSON)

        # 2. Master records
        self.dept_prod = Department.objects.create(name='Production', code='PROD', can_originate=True, can_be_target=True)
        self.dept_maint = Department.objects.create(name='Maintenance', code='MAINT', can_originate=True, can_be_target=True)
        self.dept_qa = Department.objects.create(name='Quality Assurance', code='QA', can_originate=True, can_be_target=True)

        self.plant = Plant.objects.create(code='MF1', name='Plant MF1', is_active=True)
        self.line = Line.objects.create(plant=self.plant, name='Line 1', is_active=True)
        self.station = Station.objects.create(line=self.line, name='Station ST-1', is_active=True)
        self.model = ProductModel.objects.create(name='Model A', is_active=True)

        self.config = RedFlagConfig.get_config()

        # 3. Users & Employees
        self.user_initiator = User.objects.create_user(username='initiator_user', password='pass_init_123')
        self.emp_initiator = Employee.objects.create(
            user=self.user_initiator, full_name='John Initiator', employee_code='EMP001',
            department=self.dept_prod, plant=self.plant, email='john@company.com'
        )

        self.user_target = User.objects.create_user(username='target_user', password='pass_target_123')
        self.user_target.groups.add(self.g_tp)
        self.emp_target = Employee.objects.create(
            user=self.user_target, full_name='Bob Target', employee_code='EMP002',
            department=self.dept_maint, plant=self.plant, email='bob@company.com'
        )

        self.user_qa = User.objects.create_user(username='qa_custodian', password='pass_qa_123')
        self.user_qa.groups.add(self.g_qa)
        self.emp_qa = Employee.objects.create(
            user=self.user_qa, full_name='Alice QA', employee_code='EMP003',
            department=self.dept_qa, plant=self.plant, email='alice@company.com'
        )

        self.user_plant_head = User.objects.create_user(username='plant_head', password='pass_ph_123')
        self.user_plant_head.groups.add(self.g_ph)
        self.emp_plant_head = Employee.objects.create(
            user=self.user_plant_head, full_name='Charlie Head', employee_code='EMP004',
            department=self.dept_prod, plant=self.plant, email='charlie@company.com'
        )

        # Baseline attachment
        self.att = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE, bucket='redflag-evidence',
            object_key='test/t0.jpg', original_name='t0.jpg',
            content_type='image/jpeg', size_bytes=1024, width=400, height=300,
            sha256='a'*64, uploaded_by=self.user_initiator
        )

        # Baseline flag
        self.flag = RedFlag.objects.create(
            sr_no=999, red_flag_no='RF-MF1-999', status=Status.OPEN,
            raised_at=timezone.now(), target_date=timezone.localdate() + timedelta(days=5),
            raised_by=self.emp_initiator, raised_by_name=self.emp_initiator.full_name,
            raised_by_department=self.dept_prod, raised_by_department_name=self.dept_prod.name,
            target_department=self.dept_maint, target_department_name=self.dept_maint.name,
            target_person=self.emp_target, target_person_name=self.emp_target.full_name,
            qa_custodian=self.emp_qa, qa_custodian_name=self.emp_qa.full_name,
            plant=self.plant, plant_name=self.plant.name,
            line=self.line, line_name=self.line.name,
            station=self.station, station_name=self.station.name,
            model=self.model, model_name=self.model.name,
            red_flag_type=RedFlagType.QUALITY, severity=Severity.MAJOR,
            category_5m=Category5M.MACHINE, description='Harden test defect',
            evidence_photo=self.att
        )

    # =========================================================================
    # 1. Security Review & Permission Matrix
    # =========================================================================
    def test_anonymous_requests_receive_401_unauthorized(self):
        """
        Unauthenticated anonymous requests must receive HTTP 401 across all protected endpoints.
        """
        protected_endpoints = [
            ('GET', '/api/redflags/me'),
            ('GET', '/api/redflags/lookups'),
            ('GET', '/api/redflags/'),
            ('POST', '/api/redflags/'),
            ('GET', f'/api/redflags/{self.flag.id}'),
            ('PATCH', f'/api/redflags/{self.flag.id}'),
            ('DELETE', f'/api/redflags/{self.flag.id}'),
            ('POST', f'/api/redflags/{self.flag.id}/containment'),
            ('POST', f'/api/redflags/{self.flag.id}/containment/approve'),
            ('POST', f'/api/redflags/{self.flag.id}/containment/reject'),
            ('POST', f'/api/redflags/{self.flag.id}/root-cause'),
            ('POST', f'/api/redflags/{self.flag.id}/sustenance/start'),
            ('POST', f'/api/redflags/{self.flag.id}/sustenance/checks/1'),
            ('POST', f'/api/redflags/{self.flag.id}/close'),
            ('GET', '/api/redflags/analytics/dashboard'),
            ('GET', '/api/redflags/analytics/executive'),
            ('GET', '/api/redflags/analytics/summary'),
            ('GET', f'/api/redflags/{self.flag.id}/presentation'),
            ('POST', f'/api/redflags/{self.flag.id}/escalate-ppsr'),
            ('POST', f'/api/redflags/{self.flag.id}/convert-kaizen'),
            ('POST', f'/api/redflags/{self.flag.id}/link-fives'),
        ]

        for method, url in protected_endpoints:
            if method == 'GET':
                resp = self.client.get(url)
            elif method == 'POST':
                resp = self.client.post(url, {})
            elif method == 'PATCH':
                resp = self.client.patch(url, {})
            elif method == 'DELETE':
                resp = self.client.delete(url, {})

            self.assertEqual(
                resp.status_code, status.HTTP_401_UNAUTHORIZED,
                f"Endpoint {method} {url} returned {resp.status_code} instead of 401 for anonymous caller."
            )

    def test_wrong_role_receives_403_forbidden(self):
        """
        Authenticated requests from users lacking required roles must receive HTTP 403 Forbidden.
        """
        # Initiator attempting privileged QA / Plant Head actions
        self.client.force_authenticate(user=self.user_initiator)

        # 1. Only Plant Head can delete
        r_del = self.client.delete(f'/api/redflags/{self.flag.id}', {'reason': 'test'})
        self.assertEqual(r_del.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Only QA Custodian or Plant Head can approve containment
        r_app = self.client.post(f'/api/redflags/{self.flag.id}/containment/approve', {'notes': 'test'})
        self.assertEqual(r_app.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Only QA Custodian or Plant Head can start sustenance
        r_sus = self.client.post(f'/api/redflags/{self.flag.id}/sustenance/start', {'notes': 'test'})
        self.assertEqual(r_sus.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Only QA Custodian or Plant Head can close
        r_close = self.client.post(f'/api/redflags/{self.flag.id}/close', {'sign_off_production_head': True})
        self.assertEqual(r_close.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 2. Object-Level UUID & Soft-Deletion Checks
    # =========================================================================
    def test_soft_deleted_flags_return_404_on_all_endpoints(self):
        """
        Soft-deleted flags must not be accessible; detail/action endpoints must return 404.
        """
        self.flag.deleted_at = timezone.now()
        self.flag.deleted_by = self.user_plant_head
        self.flag.save()

        self.client.force_authenticate(user=self.user_plant_head)
        endpoints = [
            ('GET', f'/api/redflags/{self.flag.id}'),
            ('PATCH', f'/api/redflags/{self.flag.id}'),
            ('POST', f'/api/redflags/{self.flag.id}/containment'),
            ('POST', f'/api/redflags/{self.flag.id}/containment/approve'),
            ('POST', f'/api/redflags/{self.flag.id}/root-cause'),
            ('POST', f'/api/redflags/{self.flag.id}/close'),
            ('GET', f'/api/redflags/{self.flag.id}/presentation'),
        ]
        for method, url in endpoints:
            if method == 'GET':
                r = self.client.get(url)
            elif method == 'PATCH':
                r = self.client.patch(url, {'rowVersion': 1})
            else:
                r = self.client.post(url, {})
            self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND, f"{method} {url} did not return 404 for deleted flag")

    def test_malformed_non_uuid_returns_400_or_404_without_500(self):
        """
        Malformed non-UUID strings in URL paths must return 400 or 404, never 500.
        """
        self.client.force_authenticate(user=self.user_qa)
        resp = self.client.get('/api/redflags/not-a-valid-uuid')
        self.assertIn(resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])

    # =========================================================================
    # 3. File Upload Security (SVG, Polyglot, Oversized)
    # =========================================================================
    @patch('redflag.storage.upload_to_minio', return_value='test/mock_key.jpg')
    def test_file_upload_rejects_svg_and_polyglot(self, mock_upload):
        """
        File uploads reject SVG and invalid/corrupt polyglot payloads.
        """
        self.client.force_authenticate(user=self.user_initiator)

        # 1. Direct SVG file
        svg_content = b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert('xss')</script></svg>"
        svg_file = SimpleUploadedFile("exploit.svg", svg_content, content_type="image/svg+xml")
        r1 = self.client.post('/api/redflags/attachments', {'file': svg_file})
        self.assertEqual(r1.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn('SVG', str(r1.json()))

        # 2. SVG disguised as PNG with image/png mime type
        svg_disguised = SimpleUploadedFile("exploit.png", svg_content, content_type="image/png")
        r2 = self.client.post('/api/redflags/attachments', {'file': svg_disguised})
        self.assertEqual(r2.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

        # 3. Corrupt / Polyglot file (fake PNG header with invalid trailing data)
        polyglot = SimpleUploadedFile("bad.png", b"\x89PNG\r\n\x1a\nmalicious_payload_non_image", content_type="image/png")
        r3 = self.client.post('/api/redflags/attachments', {'file': polyglot})
        self.assertEqual(r3.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

    # =========================================================================
    # 4. Privacy: Lookups Expose No Contact Details
    # =========================================================================
    def test_lookups_expose_no_contact_details(self):
        """
        The /api/redflags/lookups endpoint must never leak personal contact details
        such as email, phone, or passwords.
        """
        self.client.force_authenticate(user=self.user_initiator)
        resp = self.client.get('/api/redflags/lookups')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()['data']

        employees = data.get('employees', [])
        self.assertTrue(len(employees) > 0)
        for emp in employees:
            self.assertNotIn('email', emp)
            self.assertNotIn('phone', emp)
            self.assertNotIn('mobile', emp)
            self.assertNotIn('password', emp)
            # Allowed fields only
            self.assertEqual(set(emp.keys()), {'id', 'label', 'department'})

    # =========================================================================
    # 5. Append-Only Immutability on StageHistory & RedFlagAuditLog
    # =========================================================================
    def test_history_and_audit_tables_are_append_only(self):
        """
        StageHistory and RedFlagAuditLog models cannot be modified or deleted via ORM.
        """
        # Create StageHistory
        sh = StageHistory.objects.create(
            red_flag=self.flag, stage='Detection', event='RAISED',
            completed_at=timezone.now(), completed_by=self.emp_initiator,
            completed_by_name=self.emp_initiator.full_name, sign_off_role='Initiator'
        )
        # Attempt update
        sh.notes = "Attempted edit"
        with self.assertRaises(ValueError):
            sh.save()
        # Attempt delete
        with self.assertRaises(ValueError):
            sh.delete()

        # Create RedFlagAuditLog
        al = RedFlagAuditLog.objects.create(
            red_flag=self.flag, actor=self.user_initiator, action='CREATED', changes={}
        )
        # Attempt update
        al.action = "TAMPERED"
        with self.assertRaises(ValueError):
            al.save()
        # Attempt delete
        with self.assertRaises(ValueError):
            al.delete()

    # =========================================================================
    # 6. Operations: Request ID & Health Check Endpoint
    # =========================================================================
    def test_request_id_middleware_and_security_headers(self):
        """
        RequestIDMiddleware returns X-Request-ID and security headers on responses.
        """
        self.client.force_authenticate(user=self.user_initiator)

        # 1. System generates a Request ID if not provided
        r1 = self.client.get('/api/redflags/me')
        self.assertIn('X-Request-ID', r1.headers)
        self.assertEqual(r1.headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(r1.headers['X-Frame-Options'], 'DENY')

        # 2. Provided X-Request-ID is preserved
        custom_id = str(uuid.uuid4())
        r2 = self.client.get('/api/redflags/me', HTTP_X_REQUEST_ID=custom_id)
        self.assertEqual(r2.headers.get('X-Request-ID'), custom_id)

    @patch('redflag.storage.get_s3_client')
    def test_health_check_endpoint(self, mock_s3_client):
        """
        GET /api/redflags/health returns 200 with database and MinIO status.
        """
        mock_client = MagicMock()
        mock_client.list_buckets.return_value = {'Buckets': []}
        mock_s3_client.return_value = mock_client

        resp = self.client.get('/api/redflags/health')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        payload = resp.json()
        data = payload.get('data', payload)
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['database']['status'], 'connected')
        self.assertEqual(data['minio']['status'], 'connected')

    # =========================================================================
    # 7. Demo Data Command Verification
    # =========================================================================
    @patch('redflag.management.commands.seed_redflag_demo.upload_to_minio')
    def test_seed_redflag_demo_command(self, mock_upload):
        """
        seed_redflag_demo creates the 4 records with genuine history and audit rows.
        """
        mock_upload.side_effect = lambda raw, mime, kind: f"demo/{uuid.uuid4().hex}_{kind.lower()}.png"
        call_command('seed_redflag_demo', '--force')

        # Verify 4 records created
        self.assertTrue(RedFlag.objects.filter(red_flag_no='RF-MF1-001').exists())
        self.assertTrue(RedFlag.objects.filter(red_flag_no='RF-MF2-002').exists())
        self.assertTrue(RedFlag.objects.filter(red_flag_no='RF-MF1-003').exists())
        self.assertTrue(RedFlag.objects.filter(red_flag_no='RF-MF3-004').exists())

        f1 = RedFlag.objects.get(red_flag_no='RF-MF1-001')
        self.assertEqual(f1.status, Status.UNDER_SUSTENANCE)
        self.assertTrue(f1.stage_history.filter(stage='Detection').exists())
        self.assertTrue(f1.stage_history.filter(stage='Containment').exists())
        self.assertTrue(f1.audit_logs.exists())

        f2 = RedFlag.objects.get(red_flag_no='RF-MF2-002')
        self.assertEqual(f2.status, Status.CLOSED)
        self.assertTrue(f2.sustenance_achieved)
        self.assertTrue(f2.stage_history.filter(stage='Effectiveness').exists())
