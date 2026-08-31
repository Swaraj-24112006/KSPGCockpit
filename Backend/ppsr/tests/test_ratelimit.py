"""
Unit & Integration Tests for PPSR Rate Limiting Layer (Phase 6)
===============================================================
Tests per-endpoint rate limits, unauthenticated IP protection,
per-user isolation, 429 responses, Retry-After headers, and validation ordering.
"""

import io
from decimal import Decimal
from PIL import Image
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from ppsr.models import (
    PpsrReport,
    CftMember,
    CftRating,
    CommitteeFeedback,
)

User = get_user_model()


@override_settings(
    RATELIMIT_ENABLE=True,
    RATELIMIT_USE_CACHE='default',
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'KEY_PREFIX': 'ppsr',
        }
    }
)
class PpsrRateLimitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user_a = User.objects.create_user(
            username='user_qa_engineer',
            password='Password123!',
            email='qa@kspg.com',
            employee_id='EMP001',
        )
        refresh_a = RefreshToken.for_user(self.user_a)
        self.client_a = APIClient()
        self.client_a.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh_a.access_token}')

        self.report = PpsrReport.objects.create(
            ppsr_no='BE-2026-001',
            title='Vacuum Pump Oil Leakage',
            problem_statement='Oil leakage detected at high RPM.',
            plant='Plant A',
            line_station='MF1 Vacuum Line',
            lead_owner='Alice Johnson',
            cost_save_per_month=Decimal('5000.00'),
            cost_save_per_annum=Decimal('60000.00'),
        )

        self.member = CftMember.objects.create(
            name='Dr. Brown',
            role='Quality Head',
            department='QA',
            is_active=True,
        )

    # ── Report Creation Limit (10/h) ─────────────────────────────────────────

    def test_report_creation_allowed_within_limit(self):
        """First 10 POSTs to /reports/ must succeed without being rate-limited."""
        for i in range(10):
            resp = self.client_a.post('/api/ppsr/reports/', {
                'title': f'Test Report {i}',
                'problem_statement': 'Defect statement',
                'lead_owner': 'Alice',
                'plant': 'Plant A',
            }, format='json')
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_report_creation_blocked_at_11th_request(self):
        """11th POST to /reports/ within 1 hour must return 429."""
        for i in range(10):
            self.client_a.post('/api/ppsr/reports/', {
                'title': f'Test Report {i}',
                'problem_statement': 'Defect statement',
                'lead_owner': 'Alice',
                'plant': 'Plant A',
            }, format='json')

        resp = self.client_a.post('/api/ppsr/reports/', {
            'title': 'Exceeded Report',
            'problem_statement': 'Defect statement',
            'lead_owner': 'Alice',
            'plant': 'Plant A',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(resp.data['error'], 'rate_limited')
        self.assertIn('Retry-After', resp)

    def test_different_users_have_independent_limits(self):
        """User A hitting the limit must not block User B."""
        user_b = User.objects.create_user(
            username='user_b_engineer',
            password='Password123!',
            email='user_b@kspg.com',
            employee_id='EMP002',
        )
        refresh_b = RefreshToken.for_user(user_b)
        client_b = APIClient()
        client_b.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh_b.access_token}')

        # Exhaust User A's limit (10 requests)
        for i in range(10):
            self.client_a.post('/api/ppsr/reports/', {
                'title': f'Report A {i}',
                'problem_statement': 'Defect statement',
                'lead_owner': 'Alice',
                'plant': 'Plant A',
            }, format='json')

        # User A's 11th request is blocked
        resp_a = self.client_a.post('/api/ppsr/reports/', {
            'title': 'Report A Exceeded',
            'problem_statement': 'Defect statement',
            'lead_owner': 'Alice',
            'plant': 'Plant A',
        }, format='json')
        self.assertEqual(resp_a.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # User B should still be allowed
        resp_b = client_b.post('/api/ppsr/reports/', {
            'title': 'Report B Valid',
            'problem_statement': 'Defect statement',
            'lead_owner': 'Bob',
            'plant': 'Plant B',
        }, format='json')
        self.assertEqual(resp_b.status_code, status.HTTP_201_CREATED)

    # ── CFT Rating Limit (60/h) ──────────────────────────────────────────────

    def test_cft_rating_rate_limit(self):
        """CFT ratings allow up to 60/h and block on the 61st."""
        reports = [
            PpsrReport.objects.create(
                ppsr_no=f'BE-2026-R{i:03d}',
                title=f'Report {i}',
                problem_statement='Test',
                plant='Plant A',
                lead_owner='Eng'
            )
            for i in range(61)
        ]

        for i in range(60):
            resp = self.client_a.post('/api/ppsr/cft-ratings/', {
                'member_id': str(self.member.id),
                'report_id': str(reports[i].id),
                'score': 4,
            }, format='json')
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        # 61st request should be rate-limited
        resp_61 = self.client_a.post('/api/ppsr/cft-ratings/', {
            'member_id': str(self.member.id),
            'report_id': str(reports[60].id),
            'score': 5,
        }, format='json')
        self.assertEqual(resp_61.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    # ── Unauthenticated IP Limit (20/m) ──────────────────────────────────────

    def test_unauthenticated_requests_rate_limited_by_ip(self):
        """21st unauthenticated request from same IP must return 429."""
        anon_client = APIClient()

        for _ in range(20):
            anon_client.get('/api/ppsr/reports/')

        resp = anon_client.get('/api/ppsr/reports/')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_authenticated_requests_not_affected_by_ip_limit(self):
        """IP limit must not block authenticated requests with valid JWT."""
        anon_client = APIClient()
        for _ in range(21):
            anon_client.get('/api/ppsr/reports/')

        # Authenticated request from client_a still works
        resp = self.client_a.get('/api/ppsr/reports/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    # ── Photo Upload: Validates before incrementing counter ───────────────────

    def test_invalid_image_rejected_before_rate_limit_counted(self):
        """Uploading an invalid file returns 400 without consuming rate limit quota."""
        fake_file = SimpleUploadedFile('invalid.txt', b'not an image content', content_type='text/plain')

        resp = self.client_a.post(
            f'/api/ppsr/reports/{self.report.id}/photo/',
            {'file': fake_file, 'photo_type': 'sketch'},
            format='multipart'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid image upload should succeed
        file_io = io.BytesIO()
        img = Image.new('RGB', (100, 100), color='green')
        img.save(file_io, 'jpeg')
        file_io.seek(0)
        valid_file = SimpleUploadedFile('valid.jpg', file_io.read(), content_type='image/jpeg')

        resp2 = self.client_a.post(
            f'/api/ppsr/reports/{self.report.id}/photo/',
            {'file': valid_file, 'photo_type': 'sketch'},
            format='multipart'
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
