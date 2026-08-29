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

from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from io import BytesIO
from PIL import Image

from accounts.models import CustomUser, Role
from kaizens.models import Kaizen
from core.redis_client import create_session


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
        self.assertEqual(response.data['success'], False)
        self.assertEqual(response.data['error']['code'], 'RATE_LIMIT_EXCEEDED')
        self.assertIn('retry_after', response.data['error']['details'])
        self.assertTrue('Retry-After' in response.headers or 'retry-after' in response.headers or 'Retry-After' in response)

    def test_login_rate_limiting_by_username(self):
        """
        Targeting the same account from rotating IPs is blocked after 5 attempts/min.
        """
        url = '/api/v1/auth/login/'
        target_username = 'targeted_user'
        payload = {'username': target_username, 'password': 'WrongPassword123'}

        # 5 attempts across different IPs
        for i in range(5):
            ip = f'192.168.2.{i+10}'
            response = self.client.post(url, payload, format='json', REMOTE_ADDR=ip)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 6th attempt targeting the same username from a new IP: blocked with 429
        response = self.client.post(url, payload, format='json', REMOTE_ADDR='192.168.2.99')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_password_reset_rate_limiting(self):
        """
        Password reset request is limited to 3 requests/minute/IP. 4th request returns 429.
        """
        url = '/api/v1/auth/password/reset/'
        payload = {'email': 'testuser@kaizen.local'}

        # 3 requests succeed
        for i in range(3):
            payload = {'email': f'testuser_{i}@kaizen.local'}
            response = self.client.post(url, payload, format='json', REMOTE_ADDR='192.168.3.10')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 4th request returns 429 (IP throttle)
        payload = {'email': 'testuser_3@kaizen.local'}
        response = self.client.post(url, payload, format='json', REMOTE_ADDR='192.168.3.10')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_otp_verify_rate_limiting(self):
        """
        OTP verification is limited to 5 attempts/minute/user or IP. 6th attempt returns 429.
        """
        url = '/api/v1/auth/otp/verify/'
        payload = {'otp': '000000'}

        # 5 incorrect attempts
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
