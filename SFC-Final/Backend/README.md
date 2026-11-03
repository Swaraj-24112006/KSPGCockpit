# KSPG Cockpit — Red Flag Backend Service

Production-ready Django backend service for shopfloor non-conformance tracking, physical quarantine governance, 5-Why root cause analysis, 3-month IATF 16949 sustenance audits, and cross-module escalations (PPSR 8D, Kaizen Poka-Yoke, 5S Red Tag).

---

## 1. Architecture & Tech Stack

- **Framework**: Django 5.x & Django REST Framework (DRF)
- **Database**: PostgreSQL 15+ (with connection pooling and indexes on lifecycle hot-paths)
- **Object Storage**: MinIO / AWS S3 (`django-storages` + `boto3`) with private bucket, bucket versioning, Pillow validation, orientation normalisation, EXIF GPS stripping, and short-lived presigned GET URLs
- **Timezone**: `Asia/Kolkata` (IST - UTC+05:30)
- **Serialization**: `djangorestframework-camel-case` for seamless camelCase JSON payloads with `{success: true, data: ...}` envelopes
- **API Documentation**: OpenAPI 3.0 via `drf-spectacular`
- **Security & RBAC**: Strict JWT + Session authentication, Request-ID tracing, audit logging immutability, object-level role authorization, scoped rate limiting, and security headers

---

## 2. Quickstart & Local Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.11+

### Step 1: Start Infrastructure (PostgreSQL + MinIO)
```bash
docker compose up -d
```
This spins up:
- PostgreSQL on port `5432` with database `kaizen_db`
- MinIO on ports `9000` (S3 API) and `9001` (Web Console)
- An automated `minio-init` container that initializes the private `redflag-evidence` bucket with bucket versioning enabled.

### Step 2: Set Up Python Virtual Environment
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` (or verify existing `.env`):
```bash
cp .env.example .env
```

### Step 4: Apply Database Migrations
```bash
python manage.py migrate
```

### Step 5: Seed Master Lookups & Demo Records
```bash
# Seed master plants, lines, stations, product models, departments, employees, and config
python manage.py seed_redflag_masters

# Seed the 4 canonical demo flags through authentic service workflows
python manage.py seed_redflag_demo
```

### Step 6: Start Development Server
```bash
python manage.py runserver 8000
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **ReDoc**: [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)
- **Raw OpenAPI Schema**: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)
- **Health Check**: [http://localhost:8000/api/redflags/health](http://localhost:8000/api/redflags/health)

---

## 3. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | *(Django secret)* | Cryptographic signing key |
| `DEBUG` | `True` | Debug mode (must be `False` in production) |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowlist of Host headers |
| `DATABASE_NAME` | `kaizen_db` | PostgreSQL database name |
| `DATABASE_USER` | `postgres` | PostgreSQL username |
| `DATABASE_PASSWORD` | `swaraj2006` | PostgreSQL password |
| `DATABASE_HOST` | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `MINIO_ENDPOINT` | `localhost:9000` | S3 host and port |
| `MINIO_ACCESS_KEY` | `minioadmin` | S3 / MinIO access key ID |
| `MINIO_SECRET_KEY` | `minioadmin` | S3 / MinIO secret access key |
| `MINIO_BUCKET_NAME`| `redflag-evidence` | Private evidence bucket name |
| `MINIO_USE_HTTPS` | `False` | Set `True` if using TLS/SSL with MinIO |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed frontend origin origins |
| `ESCALATION_TARGET_MODE`| `stub` | Escalation mode (`stub`, `bridge`, `native`) |
| `ACCESS_TOKEN_LIFETIME_MINUTES` | `120` | JWT Access Token TTL in minutes |
| `REFRESH_TOKEN_LIFETIME_DAYS` | `7` | JWT Refresh Token TTL in days |

---

## 4. Role-Based Access Control (RBAC)

All authenticated users possess the implicit **Initiator** role and can detect non-conformances and raise Stage 1 Red Flags. Specialized operations are governed by three Django groups:

| Role | Django Group | Responsibilities |
|---|---|---|
| **Initiator** | *(All authenticated users)* | Raises flags, uploads T0 evidence photo, edits initial draft before submission. |
| **Target Person** | `rf_target_person` | Target department owner; submits Stage 2 immediate containment, quarantine quantities, and Stage 3 5-Why root cause analysis. |
| **Quality Custodian** | `rf_quality_custodian` | Owns the red flag lifecycle per IATF 16949; verifies/rejects containment, verifies permanent CAPA, starts 90-day sustenance watch, conducts month 1–3 audits, approves closure. |
| **Plant Head** | `rf_plant_head` | Executive authority; can edit identity fields, soft-delete records, grant early closure, and override sign-offs. |

### Granting Roles to Users
Via Django Management Shell:
```python
python manage.py shell
>>> from django.contrib.auth.models import User, Group
>>> user = User.objects.get(username='suresh_kumar')
>>> qa_group = Group.objects.get(name='rf_quality_custodian')
>>> user.groups.add(qa_group)
```
Or manage roles through Django Admin at `/admin/auth/user/`.

---

## 5. MinIO Configuration & Bucket Versioning

### Bucket Versioning
MinIO bucket versioning preserves historical versions of evidence photos, preventing accidental overwrites or malicious tampering:
```bash
mc alias set myminio http://localhost:9000 minioadmin minioadmin
mc version enable myminio/redflag-evidence
```

### MinIO CORS Configuration
To allow browsers to load presigned attachment URLs directly:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "http://localhost:5173", "https://cockpit.kspg.internal"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```
Apply using `mc`:
```bash
mc cors set myminio/redflag-evidence cors.json
```

---

## 6. Scheduled Operations & Automation

### Daily Sustenance Audit Digest
Scans for 30/60/90-day sustenance audit checks scheduled in the next 7 days or overdue, printing summaries and triggering notifications:
```bash
python manage.py redflag_sustenance_digest --days=7
```

### Purge Orphan Uploads
Deletes unlinked staging attachments older than 24 hours from MinIO and PostgreSQL:
```bash
python manage.py purge_orphan_attachments
```

### Crontab Setup (`/etc/cron.d/redflag`)
```cron
# Daily at 06:00 IST: Sustenance digest
0 6 * * * appuser cd /opt/kspg-backend && .venv/bin/python manage.py redflag_sustenance_digest --days=7 >> /var/log/redflag/digest.log 2>&1

# Daily at 02:00 IST: Purge orphan attachments
0 2 * * * appuser cd /opt/kspg-backend && .venv/bin/python manage.py purge_orphan_attachments >> /var/log/redflag/purge.log 2>&1
```

### Systemd Timer Setup Example
`/etc/systemd/system/redflag-digest.timer`:
```ini
[Unit]
Description=Daily Red Flag Sustenance Digest Timer

[Timer]
OnCalendar=*-*-* 06:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

`/etc/systemd/system/redflag-digest.service`:
```ini
[Unit]
Description=Red Flag Sustenance Digest Command
After=network.target postgresql.service

[Service]
Type=oneshot
User=appuser
WorkingDirectory=/opt/kspg-backend
ExecStart=/opt/kspg-backend/.venv/bin/python manage.py redflag_sustenance_digest --days=7
StandardOutput=journal
StandardError=journal
```

---

## 7. Disaster Recovery & Key Rotation

### PostgreSQL Backup & Restore
```bash
# Automated Daily Backup
pg_dump -U postgres -h localhost -d kaizen_db -Fc -f /backup/db/redflag_$(date +%Y%m%d_%H%M%S).dump

# Restore from dump
pg_restore -U postgres -h localhost -d kaizen_db --clean --if-exists /backup/db/redflag_20261101_020000.dump
```

### MinIO Object Storage Mirroring
```bash
# Continuous mirror to offsite backup bucket or secondary storage
mc mirror --watch myminio/redflag-evidence offsite/redflag-evidence-backup
```

### MinIO / AWS Access Key Rotation
1. Generate new credentials in MinIO Admin or AWS IAM.
2. Update `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` in `.env`.
3. Perform a zero-downtime rolling restart of the application:
   ```bash
   kill -HUP $(cat gunicorn.pid)
   ```
4. Verify `/api/redflags/health` returns HTTP 200 with `'minio': {'status': 'connected'}`.
5. Decommission the old access key in MinIO/AWS IAM.

---

## 8. Guide: "Adding a New Enum Value"

To add a new choice to a Red Flag enum (e.g. adding a new defect type or 5M category):

1. **Update Enum in `redflag/enums.py`**:
   ```python
   class RedFlagType(models.TextChoices):
       ...
       CALIBRATION = 'Calibration', _('Calibration')
   ```
2. **Generate and Apply Migration**:
   ```bash
   python manage.py makemigrations redflag
   python manage.py migrate redflag
   ```
3. **Verify API Lookups & Documentation**:
   The `/api/redflags/lookups` endpoint dynamically pulls from enum classes, so the new value immediately appears in `data.enums.redFlagType`.
4. **Update Frontend Types**:
   Add the new literal string to `src/types.ts`:
   ```typescript
   export type RedFlagType = 'Quality' | 'Machine' | 'Process' | 'Safety' | 'Material' | '5S' | 'Calibration';
   ```

---

## 9. Performance & Benchmarking

The backend includes a 10,000-record benchmark command:
```bash
# Bulk seed 10 000 records
python manage.py seed_redflag_load_test --count=10000 --batch-size=1000

# Cleanup load test records
python manage.py seed_redflag_load_test --clean
```

In timing benchmarks with 2,000 records:
- **Interactive Dashboard Analytics**: `< 90 ms` (target < 300 ms)
- **Executive Deck Analytics**: `< 15 ms` (target < 300 ms)
- **Global Dashboard Summary**: `< 50 ms` (target < 300 ms)
- Pure SQL subqueries and `.values()` prevent Django ORM instantiation overhead on large drill-down lists.
