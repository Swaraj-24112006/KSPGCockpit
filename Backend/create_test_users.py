import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from accounts.models import CustomUser, Role, UserModuleRole

def create_role(name):
    role, _ = Role.objects.get_or_create(name=name)
    return role

def get_or_create_test_user(username, email, emp_id, first_name, last_name, dept, desig, mf, role_name, kaizen_role, is_superadmin=False):
    role = create_role(role_name)
    
    user = CustomUser.objects.filter(username=username).first() or CustomUser.objects.filter(employee_id=emp_id).first()
    
    if user:
        user.username = username
        user.email = email
        user.employee_id = emp_id
        user.first_name = first_name
        user.last_name = last_name
        user.department = dept
        user.designation = desig
        user.mini_factory = mf
        user.role = role
        user.is_active_employee = True
        user.is_active = True
        user.must_change_password = False
        user.set_password('Test@1234')
        if is_superadmin:
            user.is_superuser = True
            user.is_staff = True
        user.save()
        print(f"Updated existing user: {username} ({emp_id})")
    else:
        user = CustomUser.objects.create(
            username=username,
            email=email,
            employee_id=emp_id,
            first_name=first_name,
            last_name=last_name,
            department=dept,
            designation=desig,
            mini_factory=mf,
            role=role,
            is_active_employee=True,
            is_active=True,
            must_change_password=False,
            password=make_password('Test@1234')
        )
        if is_superadmin:
            user.is_superuser = True
            user.is_staff = True
            user.save()
        print(f"Created new user: {username} ({emp_id})")

    # Update or create Kaizen Module Role
    UserModuleRole.objects.update_or_create(
        user=user,
        module_code='kaizen',
        defaults={
            'role_name': kaizen_role,
            'mini_factory': mf
        }
    )
    
    return user

if __name__ == '__main__':
    print("--- Creating / Updating Test Users ---")
    
    # 1. Initiator / Operator
    get_or_create_test_user(
        'operator_john', 'operator.john@kspg.com', 'EMP-101', 'John', 'Operator', 
        'Production', 'CNC Machine Operator', 'MF1', 'initiator', 'initiator'
    )
    
    # 2. Reviewer / Committee Member
    get_or_create_test_user(
        'reviewer_jane', 'reviewer.jane@kspg.com', 'EMP-102', 'Jane', 'Quality', 
        'Quality Assurance', 'QA Lead Engineer', 'MF1', 'reviewer', 'committee'
    )
    
    # 3. Kaizen Lead / Coordinator
    get_or_create_test_user(
        'coord_mike', 'coord.mike@kspg.com', 'EMP-103', 'Mike', 'Coordinator', 
        'Operations', 'Shopfloor Supervisor', 'MF1', 'kaizen_lead', 'coordinator'
    )
    
    # 4. Module Admin / Plant Head
    get_or_create_test_user(
        'admin_sarah', 'admin.sarah@kspg.com', 'EMP-104', 'Sarah', 'Admin', 
        'Plant Management', 'Plant Head', 'Central', 'admin', 'admin'
    )
    
    # 5. MF2 Initiator
    get_or_create_test_user(
        'operator_bob', 'operator.bob@kspg.com', 'EMP-105', 'Bob', 'Assembler', 
        'Assembly Line', 'Line Technician', 'MF2', 'initiator', 'initiator'
    )

    # 6. MF2 Coordinator
    get_or_create_test_user(
        'coord_priya', 'coord.priya@kspg.com', 'EMP-106', 'Priya', 'Sharma', 
        'Production', 'MF2 Shift Lead', 'MF2', 'kaizen_lead', 'coordinator'
    )

    # 7. MF3 Committee Member
    get_or_create_test_user(
        'committee_rahul', 'committee.rahul@kspg.com', 'EMP-107', 'Rahul', 'Verma', 
        'Maintenance', 'Maintenance Engineer', 'MF3', 'reviewer', 'committee'
    )
    
    print("\n--- Test Users Ready ---")
    print("Default password for all test users is: Test@1234")
