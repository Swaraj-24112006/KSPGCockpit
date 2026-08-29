"""
provision_dev_rbac_users.py — Provision Dedicated Development Test Users
========================================================================
Creates or updates 4 standard test accounts:
1. dev_initiator   (Role: initiator)    -> Password: DevPassword123!
2. dev_manager     (Role: reviewer)     -> Password: DevPassword123!
3. dev_coordinator (Role: kaizen_lead)  -> Password: DevPassword123!
4. dev_admin       (Role: admin, Super) -> Password: DevPassword123!
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser, Role

TEST_USERS = [
    {
        'username': 'dev_initiator',
        'email': 'dev_initiator@kspg.test',
        'employee_id': 'DEV-INIT-001',
        'first_name': 'Dev',
        'last_name': 'Initiator',
        'phone': '9800000001',
        'role_name': 'initiator',
        'role_display': 'Initiator / Idea Creator',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'dev_manager',
        'email': 'dev_manager@kspg.test',
        'employee_id': 'DEV-MGR-001',
        'first_name': 'Dev',
        'last_name': 'Manager',
        'phone': '9800000002',
        'role_name': 'reviewer',
        'role_display': 'Reviewer / Manager',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'dev_coordinator',
        'email': 'dev_coordinator@kspg.test',
        'employee_id': 'DEV-COORD-001',
        'first_name': 'Dev',
        'last_name': 'Coordinator',
        'phone': '9800000003',
        'role_name': 'kaizen_lead',
        'role_display': 'Kaizen Lead / Coordinator',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'dev_admin',
        'email': 'dev_admin@kspg.test',
        'employee_id': 'DEV-ADM-001',
        'first_name': 'Dev',
        'last_name': 'Admin',
        'phone': '9800000004',
        'role_name': 'admin',
        'role_display': 'System Administrator',
        'is_staff': True,
        'is_superuser': True,
    },
]

DEFAULT_PASSWORD = 'DevPassword123!'

def provision_users():
    print("Provisioning dedicated development RBAC test users...")
    
    for u_data in TEST_USERS:
        role_obj, _ = Role.objects.get_or_create(
            name=u_data['role_name'],
            defaults={'display_name': u_data['role_display']}
        )
        
        user, created = CustomUser.objects.get_or_create(
            username=u_data['username'],
            defaults={
                'email': u_data['email'],
                'employee_id': u_data['employee_id'],
                'first_name': u_data['first_name'],
                'last_name': u_data['last_name'],
                'phone': u_data['phone'],
                'role': role_obj,
                'is_staff': u_data['is_staff'],
                'is_superuser': u_data['is_superuser'],
                'is_active': True,
            }
        )
        
        # Always ensure role and password are set
        user.role = role_obj
        user.is_staff = u_data['is_staff']
        user.is_superuser = u_data['is_superuser']
        user.is_active = True
        user.phone = u_data['phone']
        user.set_password(DEFAULT_PASSWORD)
        user.save()
        
        status_str = "Created" if created else "Updated"
        print(f"[{status_str}] User: {user.username} | Role: {role_obj.name} | Phone: {user.phone} | Password: {DEFAULT_PASSWORD}")

if __name__ == '__main__':
    provision_users()
