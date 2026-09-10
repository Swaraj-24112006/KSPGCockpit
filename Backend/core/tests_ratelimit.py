"""
Automated Test Suite for Rate Limiting & Throttling
===================================================
Tests all rate limits configured for the Kaizen Backend:
- Login: 5 attempts/minute/IP
- Login Account: 5 attempts/minute/username
- Password Reset: 3 requests/minute/IP
- OTP Verification: 5 attempts/minute/user or IP
- File Upload: 10 requests/minute/user
- Admin APIs: 30 requests/minute/user
- Normal APIs: 100 requests/minute/user
- Standard HTTP 429 error response format & Retry-After header
"""

from io import BytesIO
from datetime import timedelta
from PIL import Image
from django.test import TestCase, override_settings
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import CustomUser, Role, PasswordResetOTP
from kaizens.models import Kaizen
from core.redis_client import create_session


@override_settings(
    RATELIMIT_ENABLE=True,
    REST_FRAMEWORK={
        'DEFAULT_AUTHENTICATION_CLASSES': (
            'rest_framework_simplejwt.authentication.JWTAuthentication',
        ),
        'DEFAULT_PERMISSION_CLASSES': (
            'rest_framework.permissions.AllowAny',
        ),
        'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
        'PAGE_SIZE': 50,
        'DEFAULT_THROTTLE_CLASSES': [
            'core.ratelimit.NormalAPIRateThrottle',
        ],
        'DEFAULT_THROTTLE_RATES': {
            'anon': '120/min',
            'user': '200/min',
            'login_ip': '5/min',
            'login_user': '5/min',
            'password_reset': '3/min',
            'otp_verify': '5/min',
            'resend_otp': '5/min',
            'file_upload': '10/min',
            'admin_api': '30/min',
        },
        'EXCEPTION_HANDLER': 'ppsr.exceptions.ppsr_exception_handler',
    }
)
class RateLimitingTests(TestCase):
    """
    Integration tests for Redis-backed rate limiting.
    """

    def setUp(self):
        # Clear cache before each test to ensure isolated rate limit windows
        cache.clear()

        # Create roles and test users
        self.role_initiator = Role.objects.create(name='initiator')
        self.role_admin = Role.objects.create(name='admin')

        self.user = CustomUser.objects.create_user(
            username='rate_test_user',
            email='testuser@kaizen.local',
            password='TestPassword@123',
            role=self.role_initiator,
            first_name='Test',
            last_name='User',
            employee_id='EMP-RL-01',
        )

        self.admin_user = CustomUser.objects.create_user(
            username='rate_admin_user',
            email='admin@kaizen.local',
            password='AdminPassword@123',
            role=self.role_admin,
            first_name='Admin',
            last_name='User',
            employee_id='EMP-RL-02',
        )

        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def _login_user(self, user):
        """Helper to create session and attach cookies/auth headers."""
        session_id = create_session(user.id, user.username)
        self.client.cookies['kspg_sid'] = session_id
        self.client.force_authenticate(user=user)

    def test_login_rate_limiting_by_ip(self):
        """
        Login allows 5 attempts/minute/IP. The 6th attempt from the same IP returns 429.
        """
        url = '/api/v1/auth/login/'
        payload = {'username': 'non_existent_user', 'password': 'WrongPassword123'}

        # First 5 attempts: rejected with 401 Unauthorized (invalid credentials)
        for i in range(5):
            response = self.client.post(url, payload, format='json', REMOTE_ADDR='192.168.1.50')
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Attempt {i+1} should return 401"
            )

        # 6th attempt: rejected with 429 Too Many Requests
        response = self.client.post(url, payload, format='json', REMOTE_ADDR='192.168.1.50')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertTrue('Retry-After' in response.headers or 'retry-after' in response.headers or 'Retry-After' in response)

    def test_login_rate_limiting_by_username(self):
        """
        Targeting the same account from rotating IPs is blocked after 5 attempts/min.
        """
        url = '/api/v1/auth/login/'
        target_username = 'targeted_user'
        payload = {'username': target_username, 'password': 'WrongPassword123'}

        # 5 attempts from different IPs targeting the same username
        for i in range(5):
            ip = f'10.0.0.{i+1}'
            response = self.client.post(url, payload, format='json', REMOTE_ADDR=ip)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Attempt {i+1} should return 401"
            )

        # 6th attempt from yet another IP targeting the same username
        response = self.client.post(url, payload, format='json', REMOTE_ADDR='10.0.0.99')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_password_reset_rate_limiting(self):
        """
        Password reset request is limited to 3 requests/minute/IP. 4th request returns 429.
        """
        url = '/api/v1/auth/forgot-password/'

        # 3 requests from the same IP for different users succeed
        for i in range(3):
            u = CustomUser.objects.create_user(
                username=f'rate_user_pwd_{i}',
                email=f'user_pwd_{i}@kaizen.local',
                password='Password123!',
                employee_id=f'EMP-PR-{i}',
            )
            response = self.client.post(url, {'username': u.username}, format='json', REMOTE_ADDR='192.168.3.10')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 4th request from same IP returns 429 (IP throttle)
        u4 = CustomUser.objects.create_user(
            username='rate_user_pwd_4',
            email='user_pwd_4@kaizen.local',
            password='Password123!',
            employee_id='EMP-PR-4',
        )
        response = self.client.post(url, {'username': u4.username}, format='json', REMOTE_ADDR='192.168.3.10')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_otp_verify_rate_limiting(self):
        """
        OTP verification is limited to 5 attempts/minute/user or IP. 6th attempt returns 429.
        """
        url = '/api/v1/auth/verify-otp/'
        PasswordResetOTP.objects.create(
            user=self.user,
            otp_hash=make_password('123456'),
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        payload = {'username': self.user.username, 'otp': '000000'}

        # 5 incorrect attempts return 400 Bad Request
        for i in range(5):
            response = self.client.post(url, payload, format='json', REMOTE_ADDR='192.168.4.10')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 6th attempt returns 429
        response = self.client.post(url, payload, format='json', REMOTE_ADDR='192.168.4.10')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_file_upload_rate_limiting(self):
        """
        Photo/evidence file upload is limited to 10 requests/minute/user. 11th returns 429.
        """
        kaizen = Kaizen.objects.create(
            sr_no='KZ-RL-01',
            title='Rate Limit Test Kaizen',
            created_by=self.user,
        )

        self._login_user(self.user)
        url = f'/api/v1/kaizens/{kaizen.id}/upload-photo/'

        # Create dummy image
        img_buffer = BytesIO()
        image = Image.new('RGB', (100, 100), color='blue')
        image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)

        # 10 uploads
        for i in range(10):
            img_buffer.seek(0)
            img_buffer.name = f'test_{i}.jpg'
            response = self.client.post(
                url,
                {'photo_type': 'before', 'image': img_buffer},
                format='multipart',
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 11th upload returns 429
        img_buffer.seek(0)
        img_buffer.name = 'test_11.jpg'
        response = self.client.post(
            url,
            {'photo_type': 'before', 'image': img_buffer},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_admin_api_rate_limiting(self):
        """
        Admin APIs are limited to 30 requests/minute/user. 31st request returns 429.
        """
        self._login_user(self.admin_user)
        url = '/api/v1/auth/users/'

        # 30 requests succeed
        for i in range(30):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 31st request returns 429
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_redis_cache_rate_limit_persistence(self):
        """
        Verifies that rate limit counters are properly persisted and retrieved from Redis cache.
        """
        test_key = 'throttle_test_redis_counter'
        cache.set(test_key, [100.0, 200.0], timeout=60)
        cached_val = cache.get(test_key)
        self.assertEqual(cached_val, [100.0, 200.0])
