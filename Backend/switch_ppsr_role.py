"""
switch_ppsr_role.py
===================
CLI tool to change any user's PPSR role instantly while preserving their Kaizen role.

Usage:
    python switch_ppsr_role.py <username> <new_ppsr_role>

Example:
    python switch_ppsr_role.py ppsr_tester coordinator
    python switch_ppsr_role.py ppsr_tester committee
    python switch_ppsr_role.py ppsr_tester initiator
"""

import sys
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser, UserModuleRole

VALID_ROLES = ('initiator', 'committee', 'coordinator', 'admin')

def main():
    if len(sys.argv) < 3:
        print("Usage: python switch_ppsr_role.py <username> <ppsr_role>")
        print(f"Valid roles: {', '.join(VALID_ROLES)}")
        sys.exit(1)

    username = sys.argv[1].strip()
    new_role = sys.argv[2].strip().lower()

    if new_role not in VALID_ROLES:
        print(f"Error: Invalid role '{new_role}'. Choose from: {', '.join(VALID_ROLES)}")
        sys.exit(1)

    user = CustomUser.objects.filter(username=username).first()
    if not user:
        print(f"Error: User '{username}' not found.")
        sys.exit(1)

    mr, created = UserModuleRole.objects.update_or_create(
        user=user,
        module_code='ppsr',
        defaults={'role_name': new_role}
    )

    kaizen_role = getattr(user.module_roles.filter(module_code='kaizen').first(), 'role_name', 'initiator')

    print("=" * 60)
    print(f"User: {username} ({user.employee_id})")
    print(f"  Kaizen Role: {kaizen_role}")
    print(f"  PPSR Role:   {new_role} ({'Created' if created else 'Updated'})")
    print("=" * 60)

if __name__ == '__main__':
    main()
