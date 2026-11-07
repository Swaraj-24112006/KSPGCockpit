"""
SuperAdmin Test Matrix — Baseline & Regression Tests for SuperAdmin APIs
========================================================================
Test Matrix:
Feature                         Endpoint                                Expect
------------------------------------------------------------------------
0. SuperAdmin Check & 403       ensure_superadmin.py & …/users/         is_superadmin is True, non-SA get 403
1. List, search, filters, p2    GET /api/v1/auth/superadmin/users/      paginated, filters apply
2. Create                       POST …/users/                           200/201, appears in list
3. Edit profile                 PATCH …/users/<id>/                     updated fields in response
4. Profile detail               GET …/users/<id>/                       full object
5. Enable/disable               POST …/toggle-status/                   status flips, sessions revoked
6. Change mini-factory          POST …/change-mini-factory/             MF updated on user and roles
7. Reset temp password          POST …/reset-temp-password/             returns temp password
8. Assign or revoke module role POST …/assign-module-role/              role set or removed
9. Delete                       DELETE …/users/<id>/                    user gone, audit row written
10. Summary, audit logs         GET …/summary/, …/audit-logs/           correct shapes
"""

import json
from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.models import CustomUser, Role, UserModuleRole
from audit.models import AuditLog, create_audit_log
from core.rbac import get_role_category, get_user_module_role
from ensure_superadmin import ensure_superadmin


def get_field(d: dict, *keys):
    """Helper to retrieve key under either camelCase or snake_case format."""
    for k in keys:
        if k in d:
            return d[k]
    return None


class SuperAdminTests(TestCase):
    def setUp(self):
        cache.clear()

        # Roles
        self.role_superadmin, _ = Role.objects.get_or_create(name='superadmin')
        self.role_initiator, _ = Role.objects.get_or_create(name='initiator')
        self.role_lead, _ = Role.objects.get_or_create(name='kaizen_lead')

        # Superadmin test user
        self.superadmin = CustomUser.objects.create_user(
            username='test_superadmin',
            employee_id='EMP-SA-999',
            email='sa_test@kspg.com',
            password='SuperSecretAdmin@123',
            role=self.role_superadmin,
            is_staff=True,
            is_superuser=True,
            mini_factory='ALL',
        )

        # Standard non-superadmin user (initiator)
        self.regular_user = CustomUser.objects.create_user(
            username='test_regular_user',
            employee_id='EMP-REG-001',
            email='regular_user@kspg.com',
            first_name='Regular',
            last_name='Initiator',
            password='UserPassword@123',
            role=self.role_initiator,
            mini_factory='MF1',
            department='Machining',
        )

        self.client = APIClient()

    def test_00_ensure_superadmin_and_non_superadmin_forbidden(self):
        """
        Verify ROOT/Backend/ensure_superadmin.py sets up a true superadmin,
        and verify that non-superadmins receive HTTP 403 on superadmin endpoints.
        """
        # Call ensure_superadmin script function
        ensure_superadmin()
        sa_user = CustomUser.objects.get(username='superadmin')
        self.assertTrue(sa_user.is_superadmin)
        self.assertTrue(sa_user.is_superuser)
        self.assertTrue(sa_user.is_staff)
        self.assertEqual(sa_user.role.name, 'superadmin')

        # Non-superadmin user must receive 403 Forbidden
        self.client.force_authenticate(user=self.regular_user)
        res_users = self.client.get('/api/v1/auth/superadmin/users/')
        self.assertEqual(res_users.status_code, 403)

        res_summary = self.client.get('/api/v1/auth/superadmin/summary/')
        self.assertEqual(res_summary.status_code, 403)

    def test_01_list_search_filters_page_2(self):
        """
        GET /api/v1/auth/superadmin/users/
        Expect: paginated, filters apply (search, mini_factory, page=2)
        """
        self.client.force_authenticate(user=self.superadmin)

        # Create 20 test users across MF1 and MF2 to verify page 2 (page_size=15)
        for i in range(1, 21):
            mf = 'MF2' if i % 2 == 0 else 'MF1'
            dept = 'Quality' if i == 5 else 'Production'
            first_name = 'UniqueSearchTerm' if i == 5 else f'User{i}'
            CustomUser.objects.create_user(
                username=f'list_user_{i:02d}',
                employee_id=f'EMP-LIST-{i:02d}',
                first_name=first_name,
                last_name='Batch',
                email=f'list_user_{i:02d}@kspg.com',
                password='Password@123',
                mini_factory=mf,
                department=dept,
                role=self.role_initiator,
            )

        # 1. Unconstrained list: paginated response
        res = self.client.get('/api/v1/auth/superadmin/users/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertGreaterEqual(data['count'], 20)
        self.assertIsNotNone(data['next'])

        # 2. Page 2 pagination navigation
        res_p2 = self.client.get('/api/v1/auth/superadmin/users/?page=2')
        self.assertEqual(res_p2.status_code, 200)
        data_p2 = res_p2.json()
        self.assertIn('results', data_p2)
        self.assertGreater(len(data_p2['results']), 0)
        self.assertIsNotNone(data_p2['previous'])

        # 3. Search query filter
        res_search = self.client.get('/api/v1/auth/superadmin/users/?search=UniqueSearchTerm')
        self.assertEqual(res_search.status_code, 200)
        search_data = res_search.json()
        self.assertEqual(search_data['count'], 1)
        res_user = search_data['results'][0]
        self.assertEqual(get_field(res_user, 'first_name', 'firstName'), 'UniqueSearchTerm')

        # 4. Mini-Factory filter
        res_mf2 = self.client.get('/api/v1/auth/superadmin/users/?mini_factory=MF2')
        self.assertEqual(res_mf2.status_code, 200)
        mf2_data = res_mf2.json()
        for item in mf2_data['results']:
            self.assertEqual(get_field(item, 'mini_factory', 'miniFactory'), 'MF2')

    def test_02_create_user(self):
        """
        POST /api/v1/auth/superadmin/users/
        Expect: 200/201, appears in list
        """
        self.client.force_authenticate(user=self.superadmin)
        payload = {
            'username': 'created_user_test',
            'employee_id': 'EMP-CRT-001',
            'first_name': 'Created',
            'last_name': 'Tester',
            'email': 'created_user@kspg.com',
            'phone': '9876543210',
            'department': 'Manufacturing',
            'designation': 'Line Lead',
            'mini_factory': 'MF1',
            'password': 'InitialSecurePass@123',
            'kaizen_role': 'coordinator',
            'ppsr_role': 'initiator',
            'mps_role': 'demand_planner',
            'checklist_role': 'operator',
        }
        res = self.client.post('/api/v1/auth/superadmin/users/', data=payload, format='json')
        self.assertIn(res.status_code, (200, 201))
        json_data = res.json()
        self.assertTrue(json_data.get('success', False))

        # Verify appears in database
        user = CustomUser.objects.filter(username='created_user_test').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.employee_id, 'EMP-CRT-001')

        # Verify appears in list
        list_res = self.client.get('/api/v1/auth/superadmin/users/?search=created_user_test')
        self.assertEqual(list_res.status_code, 200)
        results = list_res.json()['results']
        self.assertTrue(any(u['username'] == 'created_user_test' for u in results))

    def test_03_edit_profile(self):
        """
        PATCH /api/v1/auth/superadmin/users/<id>/
        Expect: updated fields in response
        """
        self.client.force_authenticate(user=self.superadmin)
        patch_payload = {
            'first_name': 'PatchedFirst',
            'last_name': 'PatchedLast',
            'phone': '9111122223',
            'department': 'Continuous Improvement',
            'designation': 'Senior Coordinator',
        }
        res = self.client.patch(
            f'/api/v1/auth/superadmin/users/{self.regular_user.id}/',
            data=patch_payload,
            format='json'
        )
        self.assertEqual(res.status_code, 200)
        json_data = res.json()
        self.assertTrue(json_data.get('success', False))
        user_data = json_data.get('data', {})
        self.assertEqual(get_field(user_data, 'first_name', 'firstName'), 'PatchedFirst')
        self.assertEqual(get_field(user_data, 'last_name', 'lastName'), 'PatchedLast')
        self.assertEqual(get_field(user_data, 'phone'), '9111122223')
        self.assertEqual(get_field(user_data, 'department'), 'Continuous Improvement')

        # Assert full UserRow shape including role_name
        self.assertEqual(get_field(user_data, 'role_name', 'roleName'), 'Initiator')
        for fld_pair in [
            ('role_name', 'roleName'),
            ('role_category', 'roleCategory'),
            ('full_name', 'fullName'),
            ('phone',),
            ('department',),
            ('designation',),
            ('plant',),
            ('area',),
            ('module_roles', 'moduleRoles'),
            ('is_superadmin', 'isSuperadmin'),
            ('must_change_password', 'mustChangePassword'),
            ('is_active_employee', 'isActiveEmployee'),
            ('last_login', 'lastLogin'),
            ('date_joined', 'dateJoined'),
            ('last_activity', 'lastActivity'),
        ]:
            self.assertTrue(
                any(k in user_data for k in fld_pair),
                f"Missing field {fld_pair} in edit profile response"
            )

        self.regular_user.refresh_from_db()
        self.assertEqual(self.regular_user.first_name, 'PatchedFirst')

    def test_04_profile_detail(self):
        """
        GET /api/v1/auth/superadmin/users/<id>/
        Expect: full object
        """
        self.client.force_authenticate(user=self.superadmin)
        res = self.client.get(f'/api/v1/auth/superadmin/users/{self.regular_user.id}/')
        self.assertEqual(res.status_code, 200)
        user_data = res.json()
        for field_pair in [
            ('id',),
            ('username',),
            ('email',),
            ('employee_id', 'employeeId'),
            ('first_name', 'firstName'),
            ('last_name', 'lastName'),
            ('full_name', 'fullName'),
            ('mini_factory', 'miniFactory'),
            ('module_roles', 'moduleRoles'),
            ('role_category', 'roleCategory'),
            ('is_superadmin', 'isSuperadmin'),
            ('is_active_employee', 'isActiveEmployee'),
        ]:
            self.assertIsNotNone(
                get_field(user_data, *field_pair),
                f"Missing field in user detail: {field_pair}"
            )
        self.assertEqual(user_data['id'], self.regular_user.id)
        self.assertEqual(user_data['username'], self.regular_user.username)

    def test_05_enable_disable(self):
        """
        POST /api/v1/auth/superadmin/users/<id>/toggle-status/
        Expect: status flips, sessions revoked
        """
        self.client.force_authenticate(user=self.superadmin)

        # 1. Active -> Disabled
        res_disable = self.client.post(f'/api/v1/auth/superadmin/users/{self.regular_user.id}/toggle-status/')
        self.assertEqual(res_disable.status_code, 200)
        self.assertIsNotNone(get_field(res_disable.json().get('data', {}), 'role_name', 'roleName'))
        self.regular_user.refresh_from_db()
        self.assertFalse(self.regular_user.is_active_employee)
        self.assertFalse(self.regular_user.is_active)

        # 2. Disabled -> Enabled
        res_enable = self.client.post(f'/api/v1/auth/superadmin/users/{self.regular_user.id}/toggle-status/')
        self.assertEqual(res_enable.status_code, 200)
        self.regular_user.refresh_from_db()
        self.assertTrue(self.regular_user.is_active_employee)
        self.assertTrue(self.regular_user.is_active)

        # 3. SuperAdmin cannot disable own account
        res_self = self.client.post(f'/api/v1/auth/superadmin/users/{self.superadmin.id}/toggle-status/')
        self.assertEqual(res_self.status_code, 400)

    def test_06_change_mini_factory(self):
        """
        POST /api/v1/auth/superadmin/users/<id>/change-mini-factory/
        Expect: MF updated on user and roles
        """
        self.client.force_authenticate(user=self.superadmin)

        # Assign initial module roles to regular_user
        UserModuleRole.objects.create(
            user=self.regular_user,
            module_code='kaizen',
            role_name='initiator',
            mini_factory='MF1',
            assigned_by=self.superadmin,
        )
        UserModuleRole.objects.create(
            user=self.regular_user,
            module_code='ppsr',
            role_name='initiator',
            mini_factory='MF1',
            assigned_by=self.superadmin,
        )

        res = self.client.post(
            f'/api/v1/auth/superadmin/users/{self.regular_user.id}/change-mini-factory/',
            data={'mini_factory': 'MF3'},
            format='json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(get_field(res.json().get('data', {}), 'role_name', 'roleName'))

        # Verify user model updated
        self.regular_user.refresh_from_db()
        self.assertEqual(self.regular_user.mini_factory, 'MF3')

        # Verify all module roles updated
        for mr in self.regular_user.module_roles.all():
            self.assertEqual(mr.mini_factory, 'MF3')

    def test_07_reset_temp_password(self):
        """
        POST /api/v1/auth/superadmin/users/<id>/reset-temp-password/
        Expect: returns temp password
        """
        self.client.force_authenticate(user=self.superadmin)
        res = self.client.post(f'/api/v1/auth/superadmin/users/{self.regular_user.id}/reset-temp-password/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success', False))
        temp_pwd = get_field(data, 'temporary_password', 'temporaryPassword')
        self.assertIsNotNone(temp_pwd)
        self.assertTrue(len(temp_pwd) >= 8)

        # Verify user flags updated
        self.regular_user.refresh_from_db()
        self.assertTrue(self.regular_user.must_change_password)
        self.assertTrue(self.regular_user.check_password(temp_pwd))

    def test_08_assign_or_revoke_module_role(self):
        """
        POST /api/v1/auth/superadmin/users/<id>/assign-module-role/
        Expect: role set or removed
        """
        self.client.force_authenticate(user=self.superadmin)

        # 1. Assign role
        assign_payload = {
            'module_code': 'kaizen',
            'role_name': 'coordinator',
            'mini_factory': 'MF2',
        }
        res_assign = self.client.post(
            f'/api/v1/auth/superadmin/users/{self.regular_user.id}/assign-module-role/',
            data=assign_payload,
            format='json'
        )
        self.assertEqual(res_assign.status_code, 200)
        self.assertIsNotNone(get_field(res_assign.json().get('data', {}), 'role_name', 'roleName'))
        mr = UserModuleRole.objects.get(user=self.regular_user, module_code='kaizen')
        self.assertEqual(mr.role_name, 'coordinator')
        self.assertEqual(mr.mini_factory, 'MF2')

        # 2. Revoke role ('none')
        revoke_payload = {
            'module_code': 'kaizen',
            'role_name': 'none',
            'mini_factory': 'MF2',
        }
        res_revoke = self.client.post(
            f'/api/v1/auth/superadmin/users/{self.regular_user.id}/assign-module-role/',
            data=revoke_payload,
            format='json'
        )
        self.assertEqual(res_revoke.status_code, 200)
        mr.refresh_from_db()
        self.assertEqual(mr.role_name, 'none')

    def test_09_delete_user(self):
        """
        DELETE /api/v1/auth/superadmin/users/<id>/
        Expect: user gone, audit row written
        """
        self.client.force_authenticate(user=self.superadmin)

        # Create user to delete
        user_to_delete = CustomUser.objects.create_user(
            username='user_for_deletion',
            employee_id='EMP-DEL-01',
            email='del@kspg.com',
            password='Password@123',
            role=self.role_initiator,
        )
        del_id = user_to_delete.id
        del_username = user_to_delete.username

        res = self.client.delete(f'/api/v1/auth/superadmin/users/{del_id}/')
        self.assertEqual(res.status_code, 200)

        # Verify user gone from database
        self.assertFalse(CustomUser.objects.filter(id=del_id).exists())

        # Verify audit row written
        audit_row = AuditLog.objects.filter(action='user_delete').first()
        self.assertIsNotNone(audit_row)
        prev_data = json.loads(audit_row.previous_value) if isinstance(audit_row.previous_value, str) else audit_row.previous_value
        self.assertEqual(prev_data['username'], del_username)
        self.assertEqual(prev_data['user_id'], del_id)

        # Verify Protected Foreign Key handling:
        user_with_kz = CustomUser.objects.create_user(
            username='user_with_kaizen',
            employee_id='EMP-DEL-KZ',
            password='Password@123',
            role=self.role_initiator,
        )
        from kaizens.models import Kaizen
        kz = Kaizen.objects.create(
            sr_no='KZ-DEL-TEST-01',
            title='Test Kaizen for Protection',
            created_by=user_with_kz,
            status='draft',
        )

        # 1. Attempt delete without force -> must fail with 400 and has_protected_records=True
        res_fail = self.client.delete(f'/api/v1/auth/superadmin/users/{user_with_kz.id}/')
        self.assertEqual(res_fail.status_code, 400)
        data_fail = res_fail.json()
        self.assertFalse(data_fail['success'])
        self.assertTrue(get_field(data_fail['error'], 'has_protected_records', 'hasProtectedRecords'))
        self.assertIn('associated records', data_fail['error']['message'])
        self.assertTrue(CustomUser.objects.filter(id=user_with_kz.id).exists())
        self.assertTrue(Kaizen.objects.filter(id=kz.id).exists())

        # 2. Attempt delete with ?force=true -> succeeds with 200, deletes user and Kaizen
        res_force = self.client.delete(f'/api/v1/auth/superadmin/users/{user_with_kz.id}/?force=true')
        self.assertEqual(res_force.status_code, 200)
        self.assertFalse(CustomUser.objects.filter(id=user_with_kz.id).exists())
        self.assertFalse(Kaizen.objects.filter(id=kz.id).exists())

    def test_10_summary_and_audit_logs(self):
        """
        GET /api/v1/auth/superadmin/summary/
        GET /api/v1/auth/superadmin/audit-logs/
        Expect: correct shapes
        """
        self.client.force_authenticate(user=self.superadmin)

        # 1. Summary endpoint
        res_sum = self.client.get('/api/v1/auth/superadmin/summary/')
        self.assertEqual(res_sum.status_code, 200)
        sum_data = res_sum.json()
        self.assertTrue(sum_data.get('success', False))
        data = sum_data.get('data', {})
        self.assertIn('kpi', data)
        self.assertIsNotNone(get_field(data['kpi'], 'total_users', 'totalUsers'))
        self.assertIsNotNone(get_field(data['kpi'], 'active_users', 'activeUsers'))
        self.assertIsNotNone(get_field(data, 'mini_factory_distribution', 'miniFactoryDistribution'))
        self.assertIsNotNone(get_field(data, 'module_roles_summary', 'moduleRolesSummary'))
        self.assertIn('security', data)

        # 2. Audit logs endpoint
        create_audit_log(
            user=self.superadmin,
            action='system_test',
            remarks='Testing audit log shape',
            ip_address='127.0.0.1'
        )
        res_logs = self.client.get('/api/v1/auth/superadmin/audit-logs/')
        self.assertEqual(res_logs.status_code, 200)
        logs_data = res_logs.json()
        self.assertIn('count', logs_data)
        self.assertIn('results', logs_data)
        self.assertGreaterEqual(logs_data['count'], 1)
        first_log = logs_data['results'][0]
        for field in ['id', 'action', 'remarks', 'timestamp']:
            self.assertIn(field, first_log)

    def test_11_error_handling_contracts(self):
        """
        Verify that error responses always return {success: false, error: {message, fields?}}
        and never return an HTML error page.
        Covers: 400 (Validation), 403 (Forbidden), 404 (Not Found), 429 (Throttle).
        """
        self.client.force_authenticate(user=self.superadmin)

        # 1. 400 Validation Error (invalid email)
        res_400 = self.client.patch(
            f'/api/v1/auth/superadmin/users/{self.regular_user.id}/',
            data={'email': 'invalid-email-address'},
            format='json'
        )
        self.assertEqual(res_400.status_code, 400)
        body_400 = res_400.json()
        self.assertFalse(body_400['success'])
        self.assertIn('error', body_400)
        self.assertIn('message', body_400['error'])
        self.assertIn('fields', body_400['error'])
        self.assertIn('email', body_400['error']['fields'])

        # 2. 403 Forbidden (Non-superadmin accessing superadmin endpoint)
        self.client.force_authenticate(user=self.regular_user)
        res_403 = self.client.get('/api/v1/auth/superadmin/users/')
        self.assertEqual(res_403.status_code, 403)
        body_403 = res_403.json()
        self.assertFalse(body_403['success'])
        self.assertIn('error', body_403)
        self.assertIn('message', body_403['error'])

        # 3. 404 Not Found (Non-existent user ID)
        self.client.force_authenticate(user=self.superadmin)
        res_404 = self.client.get('/api/v1/auth/superadmin/users/999999/')
        self.assertEqual(res_404.status_code, 404)
        body_404 = res_404.json()
        self.assertFalse(body_404['success'])
        self.assertIn('error', body_404)
        self.assertIn('message', body_404['error'])

        # 4. 429 Rate Limit
        from rest_framework.exceptions import Throttled
        from accounts.superadmin_views import superadmin_exception_handler
        throttled_exc = Throttled(wait=45)
        throttled_resp = superadmin_exception_handler(throttled_exc, {})
        self.assertEqual(throttled_resp.status_code, 429)
        self.assertEqual(throttled_resp['Retry-After'], '45')
        self.assertFalse(throttled_resp.data['success'])
        self.assertIn('Retry after 45 seconds', throttled_resp.data['error']['message'])

    def test_12_create_blank_user_and_edit_without_changing_role_or_mf(self):
        """
        Phase 2 Core Acceptance:
        1. Create a user with ONLY username, employee ID and password.
           Verify all other fields are blank, role is null, module_roles is empty.
        2. Edit the existing blank user's name via PATCH without passing role or mini-factory.
           Verify role and mini-factory remain unchanged (null/blank).
        """
        self.client.force_authenticate(user=self.superadmin)

        # 1. Create with only username, employee_id, password
        create_payload = {
            'username': 'blank_operator_99',
            'employee_id': 'EMP-BLK-099',
            'password': 'AdminPassword@123',
        }
        res_create = self.client.post('/api/v1/auth/superadmin/users/', data=create_payload, format='json')
        self.assertIn(res_create.status_code, (200, 201))
        create_data = res_create.json()
        self.assertTrue(create_data.get('success', False))
        user_created = create_data.get('data', {})

        self.assertEqual(user_created['username'], 'blank_operator_99')
        self.assertEqual(get_field(user_created, 'employee_id', 'employeeId'), 'EMP-BLK-099')
        self.assertEqual(get_field(user_created, 'first_name', 'firstName'), '')
        self.assertEqual(get_field(user_created, 'last_name', 'lastName'), '')
        self.assertEqual(get_field(user_created, 'email'), '')
        self.assertEqual(get_field(user_created, 'phone'), '')
        self.assertEqual(get_field(user_created, 'department'), '')
        self.assertEqual(get_field(user_created, 'designation'), '')
        self.assertEqual(get_field(user_created, 'plant'), '')
        self.assertEqual(get_field(user_created, 'area'), '')
        self.assertEqual(get_field(user_created, 'mini_factory', 'miniFactory'), '')
        self.assertEqual(get_field(user_created, 'role_name', 'roleName'), '')
        self.assertIsNone(user_created.get('role'))
        self.assertEqual(len(get_field(user_created, 'module_roles', 'moduleRoles') or []), 0)

        # Verify DB values
        blank_user = CustomUser.objects.get(username='blank_operator_99')
        self.assertIsNone(blank_user.role)
        self.assertEqual(blank_user.mini_factory, '')
        self.assertEqual(blank_user.first_name, '')
        self.assertEqual(blank_user.last_name, '')

        # 2. Edit existing blank user's name without changing role or mini-factory
        patch_payload = {
            'first_name': 'BlankFirstUpdated',
            'last_name': 'BlankLastUpdated',
        }
        res_patch = self.client.patch(
            f'/api/v1/auth/superadmin/users/{blank_user.id}/',
            data=patch_payload,
            format='json'
        )
        self.assertEqual(res_patch.status_code, 200)
        patch_data = res_patch.json()
        self.assertTrue(patch_data.get('success', False))
        patched_user = patch_data.get('data', {})

        self.assertEqual(get_field(patched_user, 'first_name', 'firstName'), 'BlankFirstUpdated')
        self.assertEqual(get_field(patched_user, 'last_name', 'lastName'), 'BlankLastUpdated')
        self.assertEqual(get_field(patched_user, 'role_name', 'roleName'), '')
        self.assertIsNone(patched_user.get('role'))
        self.assertEqual(get_field(patched_user, 'mini_factory', 'miniFactory'), '')

        # Verify DB integrity: role and mini-factory were NOT touched!
        blank_user.refresh_from_db()
        self.assertEqual(blank_user.first_name, 'BlankFirstUpdated')
        self.assertEqual(blank_user.last_name, 'BlankLastUpdated')
        self.assertIsNone(blank_user.role)
        self.assertEqual(blank_user.mini_factory, '')

    def test_13_phase2_backend_rules(self):
        """
        Verify:
        - rbac-metadata endpoint (both /superadmin/rbac-metadata/ and /superadmin/users/rbac-metadata/)
        - last-superadmin guard (cannot delete or disable the last active superadmin)
        - kaizen_role: 'none' for a user with no Kaizen role is a no-op (does not assign primary role)
        - blank mini_factory in patch request does nothing (does not overwrite existing mini_factory)
        - null values in PATCH are handled safely (no 500)
        """
        self.client.force_authenticate(user=self.superadmin)

        # 1. RBAC metadata endpoint
        res_meta = self.client.get('/api/v1/auth/superadmin/rbac-metadata/')
        self.assertEqual(res_meta.status_code, 200)
        data_meta = res_meta.json().get('data', {})
        self.assertIsNotNone(get_field(data_meta, 'module_roles_map', 'moduleRolesMap'))
        self.assertIsNotNone(get_field(data_meta, 'mini_factories', 'miniFactories'))
        self.assertIsNotNone(get_field(data_meta, 'system_roles', 'systemRoles'))

        res_meta2 = self.client.get('/api/v1/auth/superadmin/users/rbac-metadata/')
        self.assertEqual(res_meta2.status_code, 200)

        # 2. Last-superadmin guard
        res_del_sa = self.client.delete(f'/api/v1/auth/superadmin/users/{self.superadmin.id}/')
        self.assertEqual(res_del_sa.status_code, 400)
        self.assertIn('SuperAdmin', res_del_sa.json()['error']['message'])

        res_toggle_sa = self.client.post(f'/api/v1/auth/superadmin/users/{self.superadmin.id}/toggle-status/')
        self.assertEqual(res_toggle_sa.status_code, 400)

        # 3. kaizen_role: 'none' on a user with no Kaizen role is a no-op
        user_no_kz = CustomUser.objects.create_user(
            username='user_no_kz',
            employee_id='EMP-NO-KZ-01',
            password='Password@123',
            role=None,
        )
        res_noop = self.client.patch(
            f'/api/v1/auth/superadmin/users/{user_no_kz.id}/',
            data={'kaizen_role': 'none'},
            format='json'
        )
        self.assertEqual(res_noop.status_code, 200)
        user_no_kz.refresh_from_db()
        self.assertIsNone(user_no_kz.role)

        # 4. Blank mini_factory in patch request does nothing
        user_with_mf = CustomUser.objects.create_user(
            username='user_with_mf',
            employee_id='EMP-WMF-01',
            password='Password@123',
            mini_factory='MF2',
        )
        res_blank_mf = self.client.patch(
            f'/api/v1/auth/superadmin/users/{user_with_mf.id}/',
            data={'mini_factory': ''},
            format='json'
        )
        self.assertEqual(res_blank_mf.status_code, 200)
        user_with_mf.refresh_from_db()
        self.assertEqual(user_with_mf.mini_factory, 'MF2')

        # 5. Null values handled safely (no 500)
        res_nulls = self.client.patch(
            f'/api/v1/auth/superadmin/users/{user_with_mf.id}/',
            data={'first_name': None, 'department': None, 'phone': None, 'email': None},
            format='json'
        )
        self.assertEqual(res_nulls.status_code, 200)


class Phase8RealShapedUsersProtectionTests(TestCase):
    """
    Phase 8: Protect already-deployed data
    ======================================
    Verify real-shaped users with legacy or incomplete schemas:
      1. blank email
      2. blank mini-factory
      3. null primary role
      4. no module roles (zero UserModuleRole records)
      5. legacy primary role of admin with no Kaizen module role
      6. all blanks combined (blank email, blank mini-factory, null role, no module roles)

    For each user shape, test the complete lifecycle:
      - list: user appears in paginated list with correct field shapes
      - drawer (detail): GET /api/v1/auth/superadmin/users/<id>/ returns complete profile
      - edit: PATCH /api/v1/auth/superadmin/users/<id>/ modifies only provided fields and
              preserves all existing/blank/null fields without corruption or defaults injection
      - toggle status: POST /api/v1/auth/superadmin/users/<id>/toggle-status/ flips active state
                       and preserves existing stored data
      - module role reading: verify core.rbac and dashboard read Kaizen, MPS, Checklist correctly
      - delete: DELETE /api/v1/auth/superadmin/users/<id>/ deletes the user and writes an audit row
    """

    def setUp(self):
        cache.clear()
        self.role_superadmin, _ = Role.objects.get_or_create(name='superadmin')
        self.role_initiator, _ = Role.objects.get_or_create(name='initiator')
        self.role_admin, _ = Role.objects.get_or_create(name='admin')

        self.superadmin = CustomUser.objects.create_user(
            username='phase8_superadmin',
            employee_id='EMP-P8-SA',
            email='p8_sa@kspg.com',
            password='AdminPassword@123',
            role=self.role_superadmin,
            is_staff=True,
            is_superuser=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.superadmin)

    def _assert_lifecycle_preserves_data(self, user, expected_initial_state):
        """
        Runs list, drawer (detail), edit (name only), toggle status, and delete flows,
        asserting that throughout the lifecycle existing data is never corrupted or overwritten.
        """
        # 1. List
        res_list = self.client.get(f'/api/v1/auth/superadmin/users/?search={user.username}')
        self.assertEqual(res_list.status_code, 200)
        results = res_list.json().get('results', [])
        self.assertTrue(any(get_field(r, 'username') == user.username for r in results))

        # 2. Drawer (Detail)
        res_detail = self.client.get(f'/api/v1/auth/superadmin/users/{user.id}/')
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.json()
        self.assertEqual(get_field(detail, 'username'), user.username)
        self.assertEqual(get_field(detail, 'employee_id', 'employeeId'), user.employee_id)

        # 3. Edit (Partial update of first_name only)
        new_name = f'P8_{user.username}'
        res_edit = self.client.patch(
            f'/api/v1/auth/superadmin/users/{user.id}/',
            data={'first_name': new_name},
            format='json'
        )
        self.assertEqual(res_edit.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.first_name, new_name)

        # Assert every protected field is preserved exactly as it was
        for field, expected_val in expected_initial_state.items():
            if field == 'module_roles_count':
                self.assertEqual(user.module_roles.count(), expected_val)
            else:
                self.assertEqual(getattr(user, field), expected_val)

        # 4. Toggle Status (Disable and re-enable)
        res_toggle = self.client.post(f'/api/v1/auth/superadmin/users/{user.id}/toggle-status/')
        self.assertEqual(res_toggle.status_code, 200)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

        for field, expected_val in expected_initial_state.items():
            if field == 'module_roles_count':
                self.assertEqual(user.module_roles.count(), expected_val)
            else:
                self.assertEqual(getattr(user, field), expected_val)

        # Toggle back to active
        res_toggle_back = self.client.post(f'/api/v1/auth/superadmin/users/{user.id}/toggle-status/')
        self.assertEqual(res_toggle_back.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

        # 5. Delete & Audit row
        username = user.username
        user_id = user.id
        res_delete = self.client.delete(f'/api/v1/auth/superadmin/users/{user_id}/')
        self.assertEqual(res_delete.status_code, 200)
        self.assertFalse(CustomUser.objects.filter(id=user_id).exists())

        audit_row = AuditLog.objects.filter(
            action='user_delete',
            previous_value__contains=username
        ).first()
        self.assertIsNotNone(audit_row)
        prev_data = json.loads(audit_row.previous_value) if isinstance(audit_row.previous_value, str) else audit_row.previous_value
        self.assertEqual(prev_data.get('username'), username)

    def test_real_shaped_user_blank_email(self):
        """User with blank email preserves blank email through list, detail, edit, toggle, delete."""
        user = CustomUser.objects.create_user(
            username='user_blank_email',
            employee_id='EMP-P8-01',
            email='',
            first_name='Blank',
            last_name='EmailUser',
            password='TestPassword@123',
            role=self.role_initiator,
            mini_factory='MF1',
            department='Machining',
        )
        expected = {
            'email': '',
            'mini_factory': 'MF1',
            'department': 'Machining',
            'role': self.role_initiator,
            'module_roles_count': 0,
        }
        self._assert_lifecycle_preserves_data(user, expected)

    def test_real_shaped_user_blank_mini_factory(self):
        """User with blank mini_factory preserves blank mini_factory through lifecycle."""
        user = CustomUser.objects.create_user(
            username='user_blank_mf',
            employee_id='EMP-P8-02',
            email='blank_mf@kspg.com',
            first_name='Blank',
            last_name='MfUser',
            password='TestPassword@123',
            role=self.role_initiator,
            mini_factory='',
            department='Assembly',
        )
        expected = {
            'email': 'blank_mf@kspg.com',
            'mini_factory': '',
            'department': 'Assembly',
            'role': self.role_initiator,
            'module_roles_count': 0,
        }
        self._assert_lifecycle_preserves_data(user, expected)

    def test_real_shaped_user_null_role(self):
        """User with role=None preserves null role through lifecycle."""
        user = CustomUser.objects.create_user(
            username='user_null_role',
            employee_id='EMP-P8-03',
            email='null_role@kspg.com',
            first_name='Null',
            last_name='RoleUser',
            password='TestPassword@123',
            role=None,
            mini_factory='MF2',
        )
        expected = {
            'email': 'null_role@kspg.com',
            'mini_factory': 'MF2',
            'role': None,
            'module_roles_count': 0,
        }
        self._assert_lifecycle_preserves_data(user, expected)

    def test_real_shaped_user_no_module_roles(self):
        """User with 0 module roles remains with 0 module roles across lifecycle."""
        user = CustomUser.objects.create_user(
            username='user_no_mod_roles',
            employee_id='EMP-P8-04',
            email='no_mod_roles@kspg.com',
            first_name='NoMod',
            last_name='RolesUser',
            password='TestPassword@123',
            role=self.role_initiator,
            mini_factory='MF1',
        )
        expected = {
            'email': 'no_mod_roles@kspg.com',
            'mini_factory': 'MF1',
            'role': self.role_initiator,
            'module_roles_count': 0,
        }
        self._assert_lifecycle_preserves_data(user, expected)

    def test_real_shaped_user_legacy_admin(self):
        """
        User with legacy role.name='admin' and no Kaizen UserModuleRole:
        - preserves admin role through lifecycle
        - core.rbac resolves Kaizen to 'admin'
        - core.rbac resolves MPS and Checklist to 'admin' fallback
        """
        user = CustomUser.objects.create_user(
            username='user_legacy_admin',
            employee_id='EMP-P8-05',
            email='legacy_admin@kspg.com',
            first_name='Legacy',
            last_name='AdminUser',
            password='TestPassword@123',
            role=self.role_admin,
            mini_factory='ALL',
        )
        # Check module role reading before lifecycle
        self.assertEqual(get_role_category(user, 'kaizen'), 'admin')
        self.assertIsNone(get_user_module_role(user, 'kaizen'))
        self.assertEqual(get_role_category(user, 'mps'), 'admin')
        self.assertEqual(get_role_category(user, 'checklist'), 'admin')

        expected = {
            'email': 'legacy_admin@kspg.com',
            'mini_factory': 'ALL',
            'role': self.role_admin,
            'module_roles_count': 0,
        }
        self._assert_lifecycle_preserves_data(user, expected)

    def test_real_shaped_user_all_blanks(self):
        """User with all optional fields blank/null (email, mini_factory, role, no module roles)."""
        user = CustomUser.objects.create_user(
            username='user_all_blanks',
            employee_id='EMP-P8-06',
            email='',
            first_name='',
            last_name='',
            password='TestPassword@123',
            role=None,
            mini_factory='',
            department='',
        )
        expected = {
            'email': '',
            'mini_factory': '',
            'role': None,
            'department': '',
            'module_roles_count': 0,
        }
        self._assert_lifecycle_preserves_data(user, expected)

    def test_module_role_reading_integrity_across_modules(self):
        """
        Verify that core.rbac and module access resolution functions
        consistently resolve Kaizen, MPS, and Checklist roles for all edge-case shapes.
        """
        # Shape A: Legacy admin without Kaizen module role
        legacy_admin = CustomUser.objects.create_user(
            username='check_legacy_admin',
            employee_id='EMP-P8-CHK-1',
            role=self.role_admin,
        )
        self.assertEqual(get_role_category(legacy_admin, 'kaizen'), 'admin')
        self.assertIsNone(get_user_module_role(legacy_admin, 'kaizen'))
        self.assertEqual(get_role_category(legacy_admin, 'mps'), 'admin')
        self.assertEqual(get_role_category(legacy_admin, 'checklist'), 'admin')

        # Shape B: User with role=None
        null_user = CustomUser.objects.create_user(
            username='check_null_user',
            employee_id='EMP-P8-CHK-2',
            role=None,
        )
        self.assertEqual(get_role_category(null_user, 'kaizen'), 'initiator')
        self.assertIsNone(get_user_module_role(null_user, 'kaizen'))
        self.assertEqual(get_role_category(null_user, 'mps'), 'initiator')
        self.assertEqual(get_role_category(null_user, 'checklist'), 'initiator')

        # Shape C: User with explicit module role overrides
        user_with_roles = CustomUser.objects.create_user(
            username='check_roles_user',
            employee_id='EMP-P8-CHK-3',
            role=self.role_initiator,
        )
        UserModuleRole.objects.create(
            user=user_with_roles,
            module_code='mps',
            role_name='mps_planner'
        )
        UserModuleRole.objects.create(
            user=user_with_roles,
            module_code='checklist',
            role_name='supervisor'
        )
        self.assertEqual(get_user_module_role(user_with_roles, 'mps'), 'mps_planner')
        self.assertEqual(get_role_category(user_with_roles, 'mps'), 'mps_planner')
        self.assertEqual(get_user_module_role(user_with_roles, 'checklist'), 'supervisor')
        self.assertEqual(get_role_category(user_with_roles, 'checklist'), 'supervisor')
        # Kaizen has no module role, falls back to role.name ('initiator')
        self.assertIsNone(get_user_module_role(user_with_roles, 'kaizen'))
        self.assertEqual(get_role_category(user_with_roles, 'kaizen'), 'initiator')

