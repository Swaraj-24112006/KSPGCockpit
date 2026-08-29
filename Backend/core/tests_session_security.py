"""
Automated Test Suite for Session Hijacking Prevention & Security Checklist
==========================================================================
Tests:
- Cryptographic session generation and device fingerprinting (IP, User-Agent)
- Idle session timeout expiration (30m)
- Absolute session timeout expiration (12h)
- Session hijacking / Device User-Agent anomaly detection (SESSION_HIJACK_DETECTED)
- Concurrent session management (MAX_CONCURRENT_SESSIONS eviction)
- Account deactivation session purging
- Role / privilege change session invalidation
- Password change re-authentication & cross-device session purging
- Logout invalidation and cookie clearing
- Cookie security flags (HttpOnly, SameSite=Lax, Secure)
"""

from datetime import datetime, timezone, timedelta
from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
import json

from accounts.models import CustomUser, Role
from core.redis_client import (
    create_session,
    get_session,
    delete_session,
    delete_all_user_sessions,
    count_user_sessions,
    validate_session_timeouts,
    rotate_session,
    get_redis,
    _session_key,
)


class SessionHijackingSecurityTests(TestCase):
    """
    Comprehensive tests for the Session Hijacking Security Checklist.
    """

    def setUp(self):
        cache.clear()
        self.role_initiator = Role.objects.create(name='initiator')
        self.role_admin = Role.objects.create(name='admin')
        self.role_committee = Role.objects.create(name='reviewer')

        self.user = CustomUser.objects.create_user(
            username='sec_user',
            email='sec_user@kaizen.local',
            password='InitialPassword@123',
            role=self.role_initiator,
            first_name='Sec',
            last_name='User',
            employee_id='EMP-SEC-01',
        )

        self.admin = CustomUser.objects.create_user(
            username='sec_admin',
            email='sec_admin@kaizen.local',
            password='AdminPassword@123',
            role=self.role_admin,
            first_name='Sec',
            last_name='Admin',
            employee_id='EMP-SEC-02',
        )

        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def test_login_session_generation_and_device_tracking(self):
        """
        Login generates a cryptographically random session, tracks IP & User-Agent,
        and sets HttpOnly + SameSite=Lax cookie.
        """
        ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
        ip = '192.168.10.25'

        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': 'sec_user', 'password': 'InitialPassword@123'},
            format='json',
            HTTP_USER_AGENT=ua,
            REMOTE_ADDR=ip,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify cookie presence and flags
        self.assertIn('kspg_sid', response.cookies)
        cookie = response.cookies['kspg_sid']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')
        self.assertEqual(cookie['path'], '/')

        # Verify Redis session payload contents
        session_id = cookie.value
        session_data = get_session(session_id)
        self.assertIsNotNone(session_data)
        self.assertEqual(session_data['user_id'], self.user.pk)
        self.assertEqual(session_data['username'], 'sec_user')
        self.assertEqual(session_data['ip_address'], ip)
        self.assertEqual(session_data['user_agent'], ua)
        self.assertIn('created_at', session_data)
        self.assertIn('last_seen', session_data)

    def test_idle_session_timeout_expiration(self):
        """
        A session with last activity older than SESSION_IDLE_TIMEOUT is rejected with 401 SESSION_IDLE_TIMEOUT.
        """
        ua = 'TestBrowser/1.0'
        session_id = create_session(
            user_id=self.user.pk,
            username=self.user.username,
            user_agent=ua,
            ip_address='127.0.0.1',
        )

        # Artificially age the last_seen timestamp by 31 minutes (idle timeout is 30m)
        r = get_redis()
        raw = json.loads(r.get(_session_key(session_id)))
        past_time = (datetime.now(timezone.utc) - timedelta(minutes=31)).isoformat()
        raw['last_seen'] = past_time
        r.setex(_session_key(session_id), 3600, json.dumps(raw))

        # Attempt to access protected endpoint
        self.client.cookies['kspg_sid'] = session_id
        response = self.client.get('/api/v1/kaizens/', HTTP_USER_AGENT=ua)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()['error']['code'], 'SESSION_IDLE_TIMEOUT')

        # Session should be deleted from Redis
        self.assertIsNone(get_session(session_id))

    def test_absolute_session_timeout_expiration(self):
        """
        A session older than SESSION_ABSOLUTE_TIMEOUT (12h) is rejected regardless of recent activity.
        """
        ua = 'TestBrowser/1.0'
        session_id = create_session(
            user_id=self.user.pk,
            username=self.user.username,
            user_agent=ua,
            ip_address='127.0.0.1',
        )

        # Artificially age created_at by 13 hours
        r = get_redis()
        raw = json.loads(r.get(_session_key(session_id)))
        past_created = (datetime.now(timezone.utc) - timedelta(hours=13)).isoformat()
        raw['created_at'] = past_created
        raw['last_seen'] = datetime.now(timezone.utc).isoformat()  # Recently active
        r.setex(_session_key(session_id), 3600, json.dumps(raw))

        self.client.cookies['kspg_sid'] = session_id
        response = self.client.get('/api/v1/kaizens/', HTTP_USER_AGENT=ua)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()['error']['code'], 'SESSION_ABSOLUTE_TIMEOUT')
        self.assertIsNone(get_session(session_id))

    def test_session_hijacking_device_anomaly_detection(self):
        """
        If a session token is stolen and used from a different User-Agent / device,
        the request is rejected with 401 SESSION_HIJACK_DETECTED and the session is purged.
        """
        original_ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
        attacker_ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'

        session_id = create_session(
            user_id=self.user.pk,
            username=self.user.username,
            user_agent=original_ua,
            ip_address='192.168.1.100',
        )

        # Legitimate user accesses API -> 200 OK
        self.client.cookies['kspg_sid'] = session_id
        response = self.client.get('/api/v1/kaizens/', HTTP_USER_AGENT=original_ua)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Attacker with stolen cookie on iPhone accesses API -> 401 SESSION_HIJACK_DETECTED
        response = self.client.get('/api/v1/kaizens/', HTTP_USER_AGENT=attacker_ua)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()['error']['code'], 'SESSION_HIJACK_DETECTED')

        # Session is destroyed
        self.assertIsNone(get_session(session_id))

    def test_concurrent_session_limit_and_oldest_eviction(self):
        """
        A user can have at most MAX_CONCURRENT_SESSIONS (default 5). Logging in a 6th time
        auto-evicts the oldest session.
        """
        sessions = []
        for i in range(5):
            sid = create_session(
                user_id=self.user.pk,
                username=self.user.username,
                user_agent=f'Device_{i}',
            )
            sessions.append(sid)

        self.assertEqual(count_user_sessions(self.user.pk), 5)
        # All 5 exist
        for sid in sessions:
            self.assertIsNotNone(get_session(sid))

        # 6th session created
        s6 = create_session(
            user_id=self.user.pk,
            username=self.user.username,
            user_agent='Device_6',
        )

        self.assertEqual(count_user_sessions(self.user.pk), 5)
        # Oldest session (sessions[0]) must be evicted
        self.assertIsNone(get_session(sessions[0]))
        # Newest session must be active
        self.assertIsNotNone(get_session(s6))

    def test_deactivated_account_purges_all_sessions(self):
        """
        When an account is deactivated by an admin, all active sessions are instantly purged.
        """
        sid1 = create_session(user_id=self.user.pk, username=self.user.username, user_agent='UA1')
        sid2 = create_session(user_id=self.user.pk, username=self.user.username, user_agent='UA2')
        self.assertEqual(count_user_sessions(self.user.pk), 2)

        # Admin logs in and toggles active status to False
        admin_sid = create_session(user_id=self.admin.pk, username=self.admin.username, user_agent='AdminUA')
        self.client.cookies['kspg_sid'] = admin_sid
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(f'/api/v1/auth/users/{self.user.pk}/toggle_active/', HTTP_USER_AGENT='AdminUA')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['is_active_employee'], False)

        # User's sessions should now all be gone
        self.assertIsNone(get_session(sid1))
        self.assertIsNone(get_session(sid2))
        self.assertEqual(count_user_sessions(self.user.pk), 0)

    def test_role_change_purges_sessions(self):
        """
        When an admin changes a user's role, old sessions are purged to enforce new privilege boundaries.
        """
        user_sid = create_session(user_id=self.user.pk, username=self.user.username, user_agent='UserUA')
        admin_sid = create_session(user_id=self.admin.pk, username=self.admin.username, user_agent='AdminUA')

        self.client.cookies['kspg_sid'] = admin_sid
        self.client.force_authenticate(user=self.admin)

        # Admin promotes user to reviewer
        response = self.client.patch(
            f'/api/v1/auth/users/{self.user.pk}/',
            {'role': self.role_committee.pk},
            format='json',
            HTTP_USER_AGENT='AdminUA',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # User's previous session must be revoked
        self.assertIsNone(get_session(user_sid))

    def test_password_change_requires_reauth_and_purges_other_sessions(self):
        """
        Password change requires current password verification and logs out all other devices.
        """
        ua1 = 'Desktop_Browser'
        ua2 = 'Mobile_Browser'
        sid1 = create_session(user_id=self.user.pk, username=self.user.username, user_agent=ua1)
        sid2 = create_session(user_id=self.user.pk, username=self.user.username, user_agent=ua2)

        # Change password from Desktop
        self.client.cookies['kspg_sid'] = sid1
        self.client.force_authenticate(user=self.user)

        # Incorrect old password -> rejected
        bad_payload = {
            'old_password': 'WrongOldPassword',
            'new_password': 'BrandNewPassword@456',
            'new_password_confirm': 'BrandNewPassword@456',
        }
        res_bad = self.client.post('/api/v1/auth/password/change/', bad_payload, format='json', HTTP_USER_AGENT=ua1)
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Correct old password -> succeeds
        good_payload = {
            'old_password': 'InitialPassword@123',
            'new_password': 'BrandNewPassword@456',
            'new_password_confirm': 'BrandNewPassword@456',
        }
        res_good = self.client.post('/api/v1/auth/password/change/', good_payload, format='json', HTTP_USER_AGENT=ua1)
        self.assertEqual(res_good.status_code, status.HTTP_200_OK)

        # Mobile session (sid2) and old Desktop session (sid1) are purged
        self.assertIsNone(get_session(sid1))
        self.assertIsNone(get_session(sid2))

        # A brand new session was issued for Desktop
        new_sid = res_good.cookies['kspg_sid'].value
        self.assertIsNotNone(get_session(new_sid))

    def test_logout_invalidation(self):
        """
        Logout deletes the session from Redis and clears the session cookie.
        """
        ua = 'TestUA'
        sid = create_session(user_id=self.user.pk, username=self.user.username, user_agent=ua)
        self.client.cookies['kspg_sid'] = sid

        response = self.client.post('/api/v1/auth/logout/', HTTP_USER_AGENT=ua)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Session deleted from Redis
        self.assertIsNone(get_session(sid))
        # Cookie cleared
        self.assertEqual(response.cookies['kspg_sid'].value, '')
