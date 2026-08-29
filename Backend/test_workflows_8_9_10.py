import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from accounts.models import CustomUser, Role, UserModuleRole
from audit.models import AuditLog
from accounts.superadmin_views import SuperAdminUserViewSet

def run_tests():
    print("==================================================")
    print("Testing Workflows 8, 9, 10 for SuperAdmin Dashboard")
    print("==================================================")
    
    factory = RequestFactory()
    view = SuperAdminUserViewSet.as_view({
        'post': 'toggle_status',
    })
    view_mf = SuperAdminUserViewSet.as_view({
        'post': 'change_mini_factory',
    })
    view_role = SuperAdminUserViewSet.as_view({
        'post': 'assign_module_role',
    })

    # SuperAdmin user for testing
    superadmin = CustomUser.objects.filter(is_superuser=True).first()
    if not superadmin:
        role_sa, _ = Role.objects.get_or_create(name='superadmin')
        superadmin = CustomUser.objects.create(
            username='superadmin_test',
            email='sa@test.com',
            employee_id='EMP-SA-999',
            role=role_sa,
            is_superuser=True,
            is_staff=True,
            is_active_employee=True,
            is_active=True,
        )
        superadmin.set_password('Admin@1234')
        superadmin.save()
    
    # ── Test Workflow 8: Change Mini-Factory ─────────────────────────────
    print("\n[TEST 1] Workflow 8: Change User's Mini-Factory")
    test_user1 = CustomUser.objects.filter(username='operator_john').first()
    assert test_user1 is not None, "operator_john must exist"
    
    request = factory.post(f'/api/v1/auth/superadmin/users/{test_user1.id}/change-mini-factory/', {'mini_factory': 'MF2'}, content_type='application/json')
    force_authenticate(request, user=superadmin)
    response = view_mf(request, pk=test_user1.id)
    print(f"Status Code: {response.status_code}, Response: {response.data}")
    assert response.status_code == 200
    assert response.data['success'] is True
    
    test_user1.refresh_from_db()
    assert test_user1.mini_factory == 'MF2', f"Expected MF2, got {test_user1.mini_factory}"
    mr = test_user1.module_roles.filter(module_code='kaizen').first()
    assert mr.mini_factory == 'MF2', f"Expected module role MF2, got {mr.mini_factory}"
    
    log = AuditLog.objects.filter(target_user=test_user1, action='mini_factory_change').order_by('-timestamp').first()
    assert log is not None, "Audit log entry for mini_factory_change must exist"
    print(f"Verified Audit Log: {log.remarks}")

    # ── Test Workflow 9: Change User's Module Role ─────────────────────────
    print("\n[TEST 2] Workflow 9: Change User's Module Role")
    test_user2 = CustomUser.objects.filter(username='coord_mike').first()
    assert test_user2 is not None, "coord_mike must exist"
    
    request = factory.post(
        f'/api/v1/auth/superadmin/users/{test_user2.id}/assign-module-role/',
        {'module_code': 'kaizen', 'role_name': 'initiator', 'mini_factory': 'MF1'},
        content_type='application/json'
    )
    force_authenticate(request, user=superadmin)
    response = view_role(request, pk=test_user2.id)
    print(f"Status Code: {response.status_code}, Response: {response.data}")
    assert response.status_code == 200
    assert response.data['success'] is True
    
    test_user2.refresh_from_db()
    assert test_user2.role.name == 'initiator', f"Expected user.role.name=initiator, got {test_user2.role.name}"
    assert test_user2.role_category == 'initiator', f"Expected role_category=initiator, got {test_user2.role_category}"
    mr = test_user2.module_roles.filter(module_code='kaizen').first()
    assert mr.role_name == 'initiator', f"Expected module role=initiator, got {mr.role_name}"
    
    log = AuditLog.objects.filter(target_user=test_user2, action='role_change').order_by('-timestamp').first()
    assert log is not None, "Audit log entry for role_change must exist"
    print(f"Verified Audit Log: {log.remarks}")

    # ── Test Workflow 10: Disable User & Re-enable User ────────────────────
    print("\n[TEST 3] Workflow 10: Disable User Account & Revoke Sessions")
    test_user3 = CustomUser.objects.filter(username='operator_bob').first()
    assert test_user3 is not None, "operator_bob must exist"
    assert test_user3.is_active_employee is True
    
    # Disable
    request = factory.post(f'/api/v1/auth/superadmin/users/{test_user3.id}/toggle-status/')
    force_authenticate(request, user=superadmin)
    response = view(request, pk=test_user3.id)
    print(f"Status Code: {response.status_code}, Response: {response.data}")
    assert response.status_code == 200
    assert response.data['success'] is True
    
    test_user3.refresh_from_db()
    assert test_user3.is_active_employee is False
    assert test_user3.is_active is False
    
    log_dis = AuditLog.objects.filter(target_user=test_user3, action='user_disable').order_by('-timestamp').first()
    assert log_dis is not None, "Audit log entry for user_disable must exist"
    print(f"Verified Disable Audit Log: {log_dis.remarks}")

    # Re-enable
    request = factory.post(f'/api/v1/auth/superadmin/users/{test_user3.id}/toggle-status/')
    force_authenticate(request, user=superadmin)
    response = view(request, pk=test_user3.id)
    print(f"Re-enable Status Code: {response.status_code}, Response: {response.data}")
    assert response.status_code == 200
    assert response.data['success'] is True
    
    test_user3.refresh_from_db()
    assert test_user3.is_active_employee is True
    assert test_user3.is_active is True
    
    log_en = AuditLog.objects.filter(target_user=test_user3, action='user_enable').order_by('-timestamp').first()
    assert log_en is not None, "Audit log entry for user_enable must exist"
    print(f"Verified Enable Audit Log: {log_en.remarks}")

    print("\n==================================================")
    print("ALL TESTS PASSED SUCCESSFULLY! [OK]")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
