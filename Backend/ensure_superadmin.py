import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser, Role

def ensure_superadmin():
    role_sa, _ = Role.objects.get_or_create(name='superadmin')
    
    username = 'superadmin'
    email = 'admin@kspg.com'
    password = 'Admin@1234'
    emp_id = 'EMP-SA-001'

    user = CustomUser.objects.filter(username=username).first()
    
    if user:
        print(f"Superadmin user '{username}' already exists. Updating password and permissions...")
    else:
        print(f"Creating superadmin user '{username}'...")
        user = CustomUser(username=username, email=email, employee_id=emp_id)

    user.role = role_sa
    user.is_superuser = True
    user.is_staff = True
    user.is_active = True
    user.is_active_employee = True
    user.must_change_password = False
    user.set_password(password)
    user.save()

    print(f"\nSuperadmin Credentials:")
    print(f"Username: {username}")
    print(f"Password: {password}")

if __name__ == '__main__':
    ensure_superadmin()
