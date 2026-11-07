import os
import sys
import json
import hashlib
from datetime import datetime

# Setup django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.path.abspath("Backend"))

import django
django.setup()

from accounts.models import CustomUser, UserModuleRole
from audit.models import AuditLog

def take_snapshot():
    snapshot_dir = os.path.abspath("Backend/data_snapshots")
    os.makedirs(snapshot_dir, exist_ok=True)
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_file = os.path.join(snapshot_dir, f"snapshot_{timestamp_str}.json")
    latest_file = os.path.join(snapshot_dir, "pre_deploy_snapshot.json")

    # 1. CustomUser snapshot
    users_data = []
    for u in CustomUser.objects.all().order_by("id"):
        users_data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "employee_id": u.employee_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "phone": getattr(u, "phone", None),
            "department": u.department,
            "designation": u.designation,
            "plant": u.plant,
            "area": getattr(u, "area", None),
            "mini_factory": u.mini_factory,
            "role_id": u.role_id,
            "role_name": u.role.name if u.role else None,
            "is_superuser": u.is_superuser,
            "is_active": u.is_active,
            "is_active_employee": u.is_active_employee,
            "must_change_password": u.must_change_password,
            "date_joined": u.date_joined.isoformat() if u.date_joined else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        })

    # 2. UserModuleRole snapshot
    module_roles_data = []
    for mr in UserModuleRole.objects.all().order_by("id"):
        module_roles_data.append({
            "id": mr.id,
            "user_id": mr.user_id,
            "user_username": mr.user.username if mr.user else None,
            "module_code": mr.module_code,
            "role_name": mr.role_name,
            "mini_factory": mr.mini_factory,
            "assigned_at": mr.assigned_at.isoformat() if mr.assigned_at else None,
            "assigned_by_id": mr.assigned_by_id,
        })

    # 3. AuditLog snapshot
    audit_data = []
    for a in AuditLog.objects.all().order_by("id"):
        audit_data.append({
            "id": a.id,
            "user_id": a.user_id,
            "target_user_id": a.target_user_id,
            "action": a.action,
            "previous_value": a.previous_value,
            "new_value": a.new_value,
            "remarks": a.remarks,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "ip_address": a.ip_address,
        })

    payload = {
        "metadata": {
            "snapshot_timestamp": datetime.now().isoformat(),
            "users_count": len(users_data),
            "module_roles_count": len(module_roles_data),
            "audit_logs_count": len(audit_data),
        },
        "users": users_data,
        "module_roles": module_roles_data,
        "audit_logs": audit_data,
    }

    raw_json = json.dumps(payload, indent=2, ensure_ascii=False)
    checksum = hashlib.sha256(raw_json.encode('utf-8')).hexdigest()
    payload["metadata"]["sha256_checksum"] = checksum

    final_json = json.dumps(payload, indent=2, ensure_ascii=False)

    with open(snapshot_file, "w", encoding="utf-8") as f:
        f.write(final_json)

    with open(latest_file, "w", encoding="utf-8") as f:
        f.write(final_json)

    print(f"Snapshot successfully saved:")
    print(f"  File: {latest_file}")
    print(f"  Timestamped backup: {snapshot_file}")
    print(f"  Users: {len(users_data)}")
    print(f"  Module Roles: {len(module_roles_data)}")
    print(f"  Audit Logs: {len(audit_data)}")
    print(f"  SHA-256 Checksum: {checksum}")

if __name__ == "__main__":
    take_snapshot()

