"""Seed roles with RBAC permissions and create test users for each role."""

from django.core.management.base import BaseCommand
from accounts.models import CustomUser, Role
from core.rbac import ROLE_PERMISSIONS, DB_ROLE_TO_CATEGORY


class Command(BaseCommand):
    help = 'Seed Role permissions and ensure one test user per RBAC category'

    def handle(self, *args, **options):
        self.stdout.write('=== Seeding RBAC Roles ===')

        # ── 1. Update permissions JSONField on every Role record ──────────────
        for role_obj in Role.objects.all():
            category = DB_ROLE_TO_CATEGORY.get(role_obj.name, 'initiator')
            perms = ROLE_PERMISSIONS.get(category, {})
            role_obj.permissions = perms
            role_obj.save(update_fields=['permissions'])
            self.stdout.write(
                f"  [{role_obj.name}] -> category={category} perms={list(perms.keys())}"
            )

        # ── 2. Ensure test users exist for each RBAC category ─────────────────
        test_users = [
            # (username,  employee_id, first, last,  password,        role_name,   email)
            ('initiator1',  'EMP-001', 'Ravi',    'Kumar',   'Initiator@123',  'initiator',   'initiator1@kspg.local'),
            ('lead1',       'EMP-003', 'Anita',   'Sharma',  'Coordinator@123','kaizen_lead', 'lead1@kspg.local'),
            ('reviewer1',   'EMP-002', 'Sunita',  'Patil',   'Reviewer@123',   'reviewer',    'reviewer1@kspg.local'),
            ('cft1',        'EMP-005', 'Mohan',   'Das',     'Committee@123',  'cft_member',  'cft1@kspg.local'),
            ('admin',       'EMP-000', 'Admin',   'User',    'Admin@KaizenSFC1','admin',       'admin@kspg.local'),
        ]

        for username, emp_id, first, last, password, role_name, email in test_users:
            try:
                role = Role.objects.get(name=role_name)
            except Role.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Role {role_name} not found - skipping {username}'))
                continue

            user, created = CustomUser.objects.get_or_create(
                username=username,
                defaults={
                    'employee_id': emp_id,
                    'first_name': first,
                    'last_name': last,
                    'email': email,
                    'role': role,
                    'is_active': True,
                    'is_active_employee': True,
                }
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f'  Created user: {username} ({role_name}) pwd={password}'))
            else:
                # Always refresh role and reset password on existing users
                user.role = role
                user.set_password(password)
                user.save(update_fields=['role', 'password'])
                self.stdout.write(f'  Updated user: {username} ({role_name})')

        self.stdout.write(self.style.SUCCESS('\n[OK] RBAC seeding complete.'))
        self.stdout.write('\nTest credentials:')
        self.stdout.write('  initiator1  / Initiator@123    -> Kaizen Initiator')
        self.stdout.write('  lead1       / Coordinator@123  -> Kaizen Coordinator')
        self.stdout.write('  reviewer1   / Reviewer@123     -> Committee Member')
        self.stdout.write('  cft1        / Committee@123    -> Committee Member')
        self.stdout.write('  admin       / Admin@KaizenSFC1 -> Administrator')

