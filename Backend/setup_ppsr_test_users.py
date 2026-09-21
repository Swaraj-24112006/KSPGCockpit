"""
setup_ppsr_test_users.py
========================
Creates test users for testing all PPSR roles while keeping their Kaizen role strictly as 'initiator'.

Users created / updated:
  1. ppsr_user_committee   -> Kaizen: initiator, PPSR: committee
  2. ppsr_user_coordinator -> Kaizen: initiator, PPSR: coordinator
  3. ppsr_user_initiator   -> Kaizen: initiator, PPSR: initiator
  4. ppsr_user_admin       -> Kaizen: initiator, PPSR: admin
  5. ppsr_tester           -> Kaizen: initiator, PPSR: committee (versatile switchable test user)

Also updates existing:
  - ppsr_committee         -> Kaizen: initiator, PPSR: committee
  - ppsr_coord             -> Kaizen: initiator, PPSR: coordinator
  - ppsr_initiator         -> Kaizen: initiator, PPSR: initiator

Password for all test users: Test@1234
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from accounts.models import CustomUser, Role, UserModuleRole

DEFAULT_PASSWORD = 'Test@1234'

def ensure_role(name):
    role, _ = Role.objects.get_or_create(name=name)
    return role

def create_or_update_user(username, email, emp_id, first_name, last_name, dept, desig, ppsr_role, kaizen_role='initiator', mini_factory='MF1', is_superadmin=False):
    role = ensure_role('initiator')  # Base role is initiator
    
    user = CustomUser.objects.filter(username=username).first() or CustomUser.objects.filter(employee_id=emp_id).first()
    
    if user:
        user.username = username
        user.email = email
        user.employee_id = emp_id
        user.first_name = first_name
        user.last_name = last_name
        user.department = dept
        user.designation = desig
        user.mini_factory = mini_factory
        user.role = role
        user.is_active_employee = True
        user.is_active = True
        user.must_change_password = False
        user.set_password(DEFAULT_PASSWORD)
        if is_superadmin:
            user.is_superuser = True
            user.is_staff = True
        user.save()
        status_action = "Updated"
    else:
        user = CustomUser.objects.create(
            username=username,
            email=email,
            employee_id=emp_id,
            first_name=first_name,
            last_name=last_name,
            department=dept,
            designation=desig,
            mini_factory=mini_factory,
            role=role,
            is_active_employee=True,
            is_active=True,
            must_change_password=False,
            password=make_password(DEFAULT_PASSWORD)
        )
        if is_superadmin:
            user.is_superuser = True
            user.is_staff = True
            user.save()
        status_action = "Created"

    # Set Kaizen role strictly to 'initiator'
    UserModuleRole.objects.update_or_create(
        user=user,
        module_code='kaizen',
        defaults={
            'role_name': kaizen_role,
            'mini_factory': mini_factory
        }
    )

    # Set PPSR module role
    UserModuleRole.objects.update_or_create(
        user=user,
        module_code='ppsr',
        defaults={
            'role_name': ppsr_role,
            'mini_factory': mini_factory
        }
    )

    print(f"[{status_action}] {username} (Emp ID: {emp_id}) -> Kaizen: {kaizen_role}, PPSR: {ppsr_role}")
    return user

if __name__ == '__main__':
    print("=" * 60)
    print("Setting up PPSR Test Users (with Kaizen as 'initiator')...")
    print("=" * 60)

    # 1. PPSR Committee User
    create_or_update_user(
        username='ppsr_user_committee',
        email='ppsr.committee.test@kspg.com',
        emp_id='EMP-TEST-PPSR-COM',
        first_name='PPSR',
        last_name='CommitteeUser',
        dept='Quality',
        desig='Quality Reviewer',
        ppsr_role='committee',
        kaizen_role='initiator'
    )

    # 2. PPSR Coordinator User
    create_or_update_user(
        username='ppsr_user_coordinator',
        email='ppsr.coordinator.test@kspg.com',
        emp_id='EMP-TEST-PPSR-COORD',
        first_name='PPSR',
        last_name='CoordinatorUser',
        dept='Operations',
        desig='Plant Coordinator',
        ppsr_role='coordinator',
        kaizen_role='initiator'
    )

    # 3. PPSR Initiator User
    create_or_update_user(
        username='ppsr_user_initiator',
        email='ppsr.initiator.test@kspg.com',
        emp_id='EMP-TEST-PPSR-INIT',
        first_name='PPSR',
        last_name='InitiatorUser',
        dept='Production',
        desig='Line Operator',
        ppsr_role='initiator',
        kaizen_role='initiator'
    )

    # 4. PPSR Admin User
    create_or_update_user(
        username='ppsr_user_admin',
        email='ppsr.admin.test@kspg.com',
        emp_id='EMP-TEST-PPSR-ADM',
        first_name='PPSR',
        last_name='AdminUser',
        dept='IT / Operations',
        desig='Module Admin',
        ppsr_role='admin',
        kaizen_role='initiator'
    )

    # 5. Versatile Tester User
    create_or_update_user(
        username='ppsr_tester',
        email='ppsr.tester@kspg.com',
        emp_id='EMP-TEST-PPSR-ALL',
        first_name='PPSR',
        last_name='Tester',
        dept='Quality Assurance',
        desig='Testing Lead',
        ppsr_role='committee',
        kaizen_role='initiator'
    )

    # Also update existing ppsr_* test accounts to have Kaizen: initiator
    create_or_update_user(
        username='ppsr_committee',
        email='ppsr.committee@kspg.com',
        emp_id='EMP-PPSR-3',
        first_name='PPSR',
        last_name='Committee',
        dept='Management',
        desig='Manager',
        ppsr_role='committee',
        kaizen_role='initiator'
    )

    create_or_update_user(
        username='ppsr_coord',
        email='ppsr.coord@kspg.com',
        emp_id='EMP-PPSR-2',
        first_name='PPSR',
        last_name='Coordinator',
        dept='Quality',
        desig='Coordinator',
        ppsr_role='coordinator',
        kaizen_role='initiator'
    )

    create_or_update_user(
        username='ppsr_initiator',
        email='ppsr.initiator@kspg.com',
        emp_id='EMP-PPSR-1',
        first_name='PPSR',
        last_name='Initiator',
        dept='Production',
        desig='Operator',
        ppsr_role='initiator',
        kaizen_role='initiator'
    )

    print("=" * 60)
    print("All test users successfully provisioned!")
    print("Default password for all users: Test@1234")
    print("=" * 60)
