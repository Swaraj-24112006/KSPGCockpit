# Safety Desk Django Backend

This is the dedicated Django backend for the **Safety Desk (Zero Harm Portal)**. It is built to run standalone on a separate terminal during development/intranet deployment, and is structured for direct merger into the monolith architecture.

---

## 1. System Architecture

- **Backend Framework**: Django 4.2 LTS (Python 3.9+) with Session Authentication & Group-Based RBAC.
- **Relational Database**: **PostgreSQL** for all structured records (Observations, Near Misses, Accident Reports, Overview Incidents, Users & Groups).
- **Object Storage**: **MinIO** for photos, camera captures, and incident evidence (configured via `.env`, defaulting to port `9000` for S3 API and `9001` for Web Console).
- **Frontend Delivery**: Single production build (`dist/`) served statically by Django or via Vite dev server with proxy.
- **Monolith Readiness**: All safety models, views, RBAC rules, and MinIO integrations are encapsulated in the standalone, reusable **`safety`** app.

---

## 2. Configuration (`.env`)

All configurable variables (MinIO ports, PostgreSQL credentials, secret keys) are centralized in `backend/.env`.

```ini
# MinIO Object Storage
MINIO_ENDPOINT=localhost:9000
MINIO_CONSOLE_PORT=9001
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=safety-media
MINIO_SECURE=False

# PostgreSQL Relational Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=safety_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Allows SQLite fallback during offline development if PostgreSQL is not active
DB_ALLOW_SQLITE_FALLBACK=True

# Django Core
DJANGO_SECRET_KEY=your-production-secret-key
DJANGO_DEBUG=True
DJANGO_PORT=8000
ALLOWED_HOSTS=*
CORS_ALLOW_ALL_ORIGINS=True
```

---

## 3. How to Run in Another Terminal

### Step 1: Activate Virtual Environment
```bash
cd backend
source venv/bin/activate
```

### Step 2: Apply Migrations
```bash
python manage.py migrate
```

### Step 3: Seed Initial Data & RBAC User Groups
```bash
python manage.py seed_safety_data
```

### Step 4: Start the Django Server
```bash
python manage.py runserver 8000
```

The Safety API is live at `http://localhost:8000/api/`.

---

## 4. API Endpoints Contract

| Endpoint | Method | Role / Description |
|---|---|---|
| `/api/health` | `GET` | Health check endpoint |
| `/api/safetyincidents` | `GET`, `POST` | List and create overview safety incidents |
| `/api/safetyincidents/<id>` | `PUT`, `DELETE` | Update or delete safety incident |
| `/api/safety/observations` | `GET`, `POST` | Submodule 1: List and raise Safety Observations (Anyone) |
| `/api/safety/observations/<id>` | `PUT`, `DELETE` | Update (Coordinator 5-Why/ICA/PCA) or delete observation |
| `/api/safety/nearmiss` | `GET`, `POST` | Submodule 2: List and raise Near Miss incident reports |
| `/api/safety/nearmiss/<id>` | `PUT`, `DELETE` | Update (Coordinator cause & actions) or delete near miss |
| `/api/safety/accidents` | `GET`, `POST` | Submodule 3: List & raise Doctor Accident Reports (**Doctor Only**) |
| `/api/safety/accidents/<id>` | `PUT`, `DELETE` | Update (Coordinator 5-Why/Ishikawa) or delete accident |
| `/api/safety/upload` | `POST` | Upload file/base64 photo directly to MinIO |

---

## 5. Role-Based Access Control (RBAC)

The application provisions 5 user groups in Django:
1. **Operator**: Can raise observations and near misses, view registers and dashboard.
2. **Safety Coordinator**: Full authority over Categories A/B/C, 5-Why root cause breakdown, ICA/PCA, risk assessment matrix, and incident closure sign-offs.
3. **Doctor (OHC)**: Exclusive role with permission to raise and medically sign off Accident Reports.
4. **Committee Reviewer**: Full read-only review of all EHS registers and timelines.
5. **Manager BI Desk**: Executive oversight and audit trail access.

---

## 6. Monolith Merger Guide

To merge this Safety Desk backend into your main Django monolith:
1. Copy the `backend/safety/` directory into your monolith repository.
2. In your monolith's `settings.py`:
   - Add `'safety'` to `INSTALLED_APPS`.
   - Copy the MinIO configuration block from `backend/safety_backend/settings.py`.
3. In your monolith's main `urls.py`:
   ```python
   path('api/', include('safety.urls')),
   ```
4. Run migrations on the production PostgreSQL database:
   ```bash
   python manage.py migrate safety
   python manage.py seed_safety_data
   ```

