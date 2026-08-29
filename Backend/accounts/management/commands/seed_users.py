from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import Role

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial users and roles'

    def handle(self, *args, **kwargs):
        # Create Roles
        roles = [
            {'name': 'initiator', 'description': 'Can create and submit Kaizens'},
            {'name': 'reviewer', 'description': 'Can review and approve/reject Kaizens'},
            {'name': 'kaizen_lead', 'description': 'Can manage voting and assess impacts'},
            {'name': 'cft_member', 'description': 'Cross-functional team member for voting'},
            {'name': 'verifier', 'description': 'Can verify implementation and close Kaizens'},
            {'name': 'admin', 'description': 'Full system access'},
        ]
        
        role_objs = {}
        for role_data in roles:
            role, created = Role.objects.get_or_create(
                name=role_data['name'], 
                defaults={'description': role_data['description']}
            )
            role_objs[role_data['name']] = role
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created role: {role.name}'))

        # Create Users
        users_data = [
            {
                'username': 'admin',
                'employee_id': 'EMP-000',
                'first_name': 'System',
                'last_name': 'Admin',
                'email': 'admin@example.com',
                'role': 'admin',
                'password': 'password123',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'initiator1',
                'employee_id': 'EMP-001',
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'role': 'initiator',
                'password': 'password123',
                'department': 'Production',
                'plant': 'Plant 1',
            },
            {
                'username': 'reviewer1',
                'employee_id': 'EMP-002',
                'first_name': 'Jane',
                'last_name': 'Smith',
                'email': 'jane@example.com',
                'role': 'reviewer',
                'password': 'password123',
                'department': 'Production',
                'plant': 'Plant 1',
            },
            {
                'username': 'lead1',
                'employee_id': 'EMP-003',
                'first_name': 'Mike',
                'last_name': 'Johnson',
                'email': 'mike@example.com',
                'role': 'kaizen_lead',
                'password': 'password123',
                'department': 'Quality',
                'plant': 'Plant 1',
            },
            {
                'username': 'verifier1',
                'employee_id': 'EMP-004',
                'first_name': 'Sarah',
                'last_name': 'Williams',
                'email': 'sarah@example.com',
                'role': 'verifier',
                'password': 'password123',
                'department': 'Safety',
                'plant': 'Plant 1',
            },
        ]

        for u_data in users_data:
            role_name = u_data.pop('role')
            password = u_data.pop('password')
            is_staff = u_data.pop('is_staff', False)
            is_superuser = u_data.pop('is_superuser', False)

            user, created = User.objects.get_or_create(
                username=u_data['username'],
                defaults=u_data
            )
            
            if created:
                user.set_password(password)
                user.role = role_objs[role_name]
                user.is_staff = is_staff
                user.is_superuser = is_superuser
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Created user: {user.username}'))
            else:
                self.stdout.write(f'User {user.username} already exists')

        self.stdout.write(self.style.SUCCESS('Successfully seeded users and roles'))
