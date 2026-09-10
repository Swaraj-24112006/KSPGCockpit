# KSPGCockpit — System Architecture & Engineering Documentation

> **Complete In-Depth Technical Manual for Developers, System Architects, and Engineering Leads.**  
> Covers Core Architecture, Domain Concepts, Database Schemas, REST API Specifications, Security Protocols, Trade-Offs, and Implementation Rationales across the **Kaizen Continuous Improvement** and **PPSR (8D / Shainin Problem Solving)** platforms.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Getting Started & Local Setup](#3-getting-started--local-setup)
4. [Architecture, System Design & Technical Trade-offs](#4-architecture-system-design--technical-trade-offs)
5. [API Reference & Endpoint Specifications](#5-api-reference--endpoint-specifications)
6. [Data Models & Database Schemas (ERD)](#6-data-models--database-schemas-erd)
7. [Environment Configuration](#7-environment-configuration)
8. [Development Workflow & Standards](#8-development-workflow--standards)
9. [Testing Strategy](#9-testing-strategy)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Monitoring, Observability & Error Handling](#12-monitoring-observability--error-handling)
13. [Security Architecture & RBAC](#13-security-architecture--rbac)
14. [Known Issues, Technical Debt & Quirks](#14-known-issues-technical-debt--quirks)
15. [Glossary & Manufacturing Domain Knowledge](#15-glossary--manufacturing-domain-knowledge)
16. [Contribution Guide & End-to-End Feature Recipe](#16-contribution-guide--end-to-end-feature-recipe)
17. [Changelog & Release Notes](#17-changelog--release-notes)

---

## 1. Project Overview

### 1.1 Purpose & Problem Statement
**KSPGCockpit** is an enterprise manufacturing operations intelligence and quality engineering platform designed for tier-1 automotive manufacturing plants. It solves two critical shop-floor operational challenges:

1. **Kaizen Continuous Improvement Pipeline:** Digitizes employee suggestions, managerial approval workflows, 5M/Safety/PFD/PFMEA impact assessments, multi-checkpoint verification, cost savings tracking (INR), and monthly Cross-Functional Team (CFT) award evaluation boards.
2. **PPSR (Practical Problem Solving Report):** Implements an institutionalized digital **8D (Eight Disciplines)** and **Shainin Component Search / PSQ** problem-solving framework. It guides quality engineers from defect containment to Ishikawa 6M root cause isolation, 5-Whys drilldowns, permanent corrective action validation, Yokoten (Read-Across) standardization, and automated executive PDF generation.

### 1.2 Target Users & Personas
- **Shop Floor Operators / Initiators:** Log Kaizen suggestions, report defects, record containment actions.
- **Reviewers & Line Managers:** Approve suggestions, assign rework, classify entries (Kaizen vs. Good Point).
- **Module Coordinators & Quality Leads:** Lead 8D problem investigations, conduct 5-Whys, coordinate impact actions across lines.
- **Steering Committee & CFT Members:** Evaluate monthly Kaizen/PPSR nominations, cast star ratings, allocate awards, and review line metrics.
- **Verifiers & Quality Auditors:** Verify physical shop-floor implementation, evidence photos, and validate recurring cost savings.
- **Plant Administrators & SuperAdmins:** Manage user accounts, role-based permissions (RBAC), Mini-Factory (MF) allocations, and plant-wide configurations.

### 1.3 High-Level Architecture Summary
KSPGCockpit employs a **decoupled client-server architecture**:
- **Backend:** Monolithic Django 5 REST Framework (DRF) service responsible for business logic, atomic sequence generation, validation, caching, rate limiting, and Celery background workers.
- **Frontend:** Modern Single Page Application (SPA) powered by React 18, Vite, TypeScript, and TailwindCSS, utilizing reactive client caching, optimistic UI updates, and presentation modes.
- **Data & Caching Layer:** PostgreSQL for relational persistence; Redis (or Memurai on Windows) for multi-level caching, rate-limit state, and Celery message broker queues.
- **Document Engine:** Asynchronous WeasyPrint PDF pipeline rendering pixel-perfect A4 industrial sheets from dynamic Django HTML templates.

### 1.4 Technology Stack & Versions

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | `^18.3.1` | Declarative UI rendering & state management |
| **Language (Client)** | TypeScript | `~5.6.2` | End-to-end static type safety |
| **Build Tool** | Vite | `^6.0.5` | High-speed HMR development & optimized production bundling |
| **Styling** | TailwindCSS | `^3.4.17` | Utility-first responsive styling & dark theme tokens |
| **Icons & UI** | Lucide React | `^0.473.0` | Industrial iconography |
| **Motion** | Framer Motion | `^12.0.0` | Modal animations, presentation transitions & step wizards |
| **Charts** | Recharts | `^2.15.0` | Defect trend graphs, effectiveness charts & Pareto visuals |
| **Backend Framework** | Django | `5.0.3` | ORM, migrations, authentication & monolithic business core |
| **API Framework** | Django REST Framework | `3.15.1` | Serializers, ModelViewSets, authentication & validation |
| **Language (Server)** | Python | `3.12+` | Backend programming language |
| **Database** | PostgreSQL | `15+` / `16+` | Primary relational database with JSONB support |
| **Task Queue** | Celery | `5.3.6` | Distributed task execution for heavy PDF generation |
| **Cache & Broker** | Redis / Memurai | `7.x` | Distributed cache layer, rate-limiting & Celery broker |
| **Cache Integration** | django-redis | `5.4.0` | Redis cache backend for Django |
| **Rate Limiting** | django-ratelimit | `4.1.0` | Granular endpoint abuse protection |
| **Filtering** | django-filter | `24.2` | Declarative query parameter filtering on list endpoints |
| **PDF Rendering** | WeasyPrint | `61.2+` (Win: `69.0`) | HTML/CSS to vector A4 PDF compilation |

### 1.5 System Status & Ports

| Component | Default Dev Port | Production Routing | Status |
|---|---|---|---|
| **React Frontend** | `http://localhost:5173` | `https://cockpit.kspg.internal/` | Active Beta / Production Ready |
| **Django REST API** | `http://localhost:8000/api/v1/` | `https://cockpit.kspg.internal/api/v1/` | Active Beta / Production Ready |
| **Redis Cache/Broker** | `localhost:6379` | Internal VPC (Cluster) | Active |
| **PostgreSQL DB** | `localhost:5432` | Managed Cloud / Internal DB | Active |

---

## 2. Repository Structure

The repository is structured cleanly into two top-level directories: `/Backend` and `/Frontend`.

```text
/
├── Backend/                                # Django Monolith Application Core
│   ├── manage.py                           # Django CLI entrypoint
│   ├── requirements.txt                    # Python dependency manifest
│   ├── .env.example                        # Template for backend environment secrets
│   │
│   ├── config/                             # Project Configuration & Settings Root
│   │   ├── __init__.py                     # Celery app export
│   │   ├── settings.py                     # Installed apps, DB, Caches, REST framework configs
│   │   ├── urls.py                         # Root URL routing table (/api/v1/)
│   │   ├── wsgi.py                         # WSGI production server hook
│   │   ├── asgi.py                         # ASGI asynchronous hook
│   │   └── celery.py                       # Celery application initialization & broker settings
│   │
│   ├── accounts/                           # Authentication, CustomUser & RBAC Module
│   │   ├── models.py                       # CustomUser, Role, UserModuleRole, PasswordResetOTP
│   │   ├── serializers.py                  # User serializers, Login/Token, OTP reset serializers
│   │   ├── views.py                        # Auth API endpoints (login, logout, session, password reset)
│   │   └── urls.py                         # /api/v1/auth/ routes
│   │
│   ├── core/                               # Core Utilities, Shared Mixins & RBAC Engines
│   │   ├── rbac.py                         # Role Category mapping & granular permission checkers
│   │   ├── exceptions.py                   # Custom DRF exception handlers & rate limit formats
│   │   ├── health_views.py                 # /api/v1/health/ DB & Redis health check views
│   │   └── health_urls.py                  # Health check routing
│   │
│   ├── kaizens/                            # Kaizen Continuous Improvement Module
│   │   ├── models.py                       # Kaizen, KaizenBenefit, KaizenEvidence, KaizenCostSaving
│   │   ├── serializers.py                  # KaizenDetail, KaizenList, Evidence, CostSaving serializers
│   │   ├── views.py                        # Kaizen CRUD ViewSet, filters, file upload handlers
│   │   ├── filters.py                      # DjangoFilterBackend classes for Kaizens
│   │   ├── services.py                     # Serial number (KZ-YYYY-NNN) generators & calculation logic
│   │   └── urls.py                         # /api/v1/kaizens/ routes
│   │
│   ├── workflow/                           # Approval Pipelines & History Logs
│   │   ├── models.py                       # WorkflowHistory immutable audit logs
│   │   ├── serializers.py                  # Workflow transition serializers
│   │   ├── views.py                        # Approve, Reject, Return-for-Rework action endpoints
│   │   └── urls.py                         # /api/v1/workflow/ routes
│   │
│   ├── impact/                             # 5M / Safety / PFD / PFMEA Impact Assessments
│   │   ├── models.py                       # ImpactAssessment, ImpactItem, ImpactAction, AllocatedResource
│   │   ├── serializers.py                  # Nested Impact serializers
│   │   ├── views.py                        # Assessment management & Open Impact Tracker endpoints
│   │   └── urls.py                         # /api/v1/impact/ routes
│   │
│   ├── verification/                       # Shop-Floor Audit & Final Closure Module
│   │   ├── models.py                       # KaizenVerification (6-point audit) & KaizenClosure
│   │   ├── serializers.py                  # Verification & closure serializers
│   │   ├── views.py                        # Verification submission & closure action endpoints
│   │   └── urls.py                         # /api/v1/verification/ routes
│   │
│   ├── cft_awards/                         # Monthly Cross-Functional Team Award Board
│   │   ├── models.py                       # CftMember, AwardCycle, CFTEvaluationSession, CFTRating, MonthlyAward
│   │   ├── serializers.py                  # Evaluation board, star rating, leaderboard serializers
│   │   ├── views.py                        # Evaluation board session controllers & award finalizers
│   │   └── urls.py                         # /api/v1/cft/ routes
│   │
│   ├── ppsr/                               # Practical Problem Solving Report (8D / PSQ Core)
│   │   ├── models.py                       # PpsrReport, ContainmentAction, CorrectiveAction, FiveWhysChain, etc.
│   │   ├── serializers.py                  # PpsrReportDetail, PpsrReportList, Metrics, Meeting serializers
│   │   ├── views.py                        # PpsrReportViewSet, PDF endpoints, spreadsheet endpoints
│   │   ├── tasks.py                        # Celery async tasks: generate_ppsr_pdf (WeasyPrint)
│   │   ├── services.py                     # Atomic PPSR sequence (BE-YYYY-NNN) & cost savings calculator
│   │   ├── filters.py                      # PPSR spreadsheet filter backends
│   │   ├── mixins.py                       # Rate limiting & caching helper mixins
│   │   ├── middleware.py                   # Rate limit exception translation middleware
│   │   ├── templates/                      # Django HTML Print Templates
│   │   │   └── ppsr/
│   │   │       └── sheet.html              # Pixel-perfect A4 8D Sheet Template for WeasyPrint
│   │   ├── tests/                          # Automated test suites
│   │   │   ├── test_pdf.py                 # Celery PDF generation & download tests
│   │   │   └── test_ratelimit.py           # Rate limiting & 429 throttling tests
│   │   └── urls.py                         # /api/ppsr/ and /api/v1/ppsr/ routes
│   │
│   └── media/                              # Uploaded Evidence Photos & Generated PDF Exports
│       ├── kaizen_photos/                  # Kaizen before/after photos
│       ├── ppsr/evidence/                  # PPSR defect evidence images
│       └── ppsr/exports/                   # Compiled PDF files
│
├── Frontend/                               # React + Vite + TypeScript Application
│   ├── package.json                        # Node package manifest
│   ├── tsconfig.json                       # TS compiler configurations & path mappings
│   ├── vite.config.ts                      # Vite dev server & build configurations
│   ├── tailwind.config.js                  # Tailwind design system & color tokens
│   │
│   ├── src/
│   │   ├── main.tsx                        # React DOM mounting & root providers
│   │   ├── App.tsx                         # Top-level routing, auth guards & navigation shell
│   │   ├── types.ts                        # Unified TypeScript interfaces (Kaizen, PPSR, User, etc.)
│   │   ├── utils.ts                        # Currency formatting (INR), date parsing, string helpers
│   │   ├── index.css                       # Global Tailwind CSS, custom scrollbars, print media styles
│   │   │
│   │   ├── api/                            # API HTTP Client Modules
│   │   │   ├── ppsrApi.ts                  # PPSR API client (CRUD, PDF polling, metrics)
│   │   │   └── ...                         # Kaizen & Auth API wrappers
│   │   │
│   │   ├── ppsr/                           # PPSR Module Components
│   │   │   ├── PpsrSystem.tsx              # Main 5-step PPSR Wizard & Dashboard coordinator
│   │   │   ├── PpsrReviewBoard.tsx         # Spreadsheet review table & metric editor
│   │   │   ├── PpsrSheetInspect.tsx        # High-fidelity digital A4 inspect sheet view
│   │   │   ├── PpsrPresentationMode.tsx    # Full-screen 8D presentation slideshow with live feedback
│   │   │   ├── PPSRMonthlyAwards.tsx       # Star rating board & leaderboard for PPSR
│   │   │   ├── IshikawaFishbone.tsx        # Interactive 6M Cause-and-Effect diagram editor
│   │   │   ├── PsqEliminationTree.tsx      # Shainin Component Search / PSQ elimination wizard
│   │   │   ├── PsqGraphicTree.tsx          # Visual tree graph renderer for PSQ stages
│   │   │   ├── PsqStageBranchModal.tsx     # Stage 0/1/2 branch parameter editor
│   │   │   └── StandardWorksheetEditor.tsx # Standard worksheet row-by-row elimination table
│   │   │
│   │   ├── kaizen/                         # Kaizen Module Components
│   │   │   ├── KaizenModule.tsx            # Kaizen module navigation container
│   │   │   ├── KaizenSheetForm.tsx         # 4-stage Kaizen entry wizard with photo upload
│   │   │   ├── KaizenSpreadsheet.tsx       # Advanced Excel-like filterable spreadsheet register
│   │   │   ├── KaizenReviewBoard.tsx       # Managerial approval & classification review board
│   │   │   ├── KaizenImpactModal.tsx       # 5M & Safety impact assessment modal
│   │   │   ├── OpenImpactTracker.tsx       # Plant-wide pending impact action tracking table
│   │   │   ├── KaizenPresentationMode.tsx  # Presentation mode for Kaizen reviews
│   │   │   ├── KaizenProcessFlowchart.tsx  # Interactive visual flowchart of Kaizen lifecycle
│   │   │   └── MyDrafts.tsx                # Local & server draft manager
│   │   │
│   │   ├── cft/                            # CFT Awards Components
│   │   │   ├── CftAwardsModule.tsx         # Module container for CFT evaluations
│   │   │   └── CftMonthlyAwards.tsx        # Interactive live evaluation session & star voting board
│   │   │
│   │   ├── SuperAdmin/                     # SuperAdmin Administration Console
│   │   │   ├── SuperAdminConsole.tsx       # User management, module role assigning, plant config
│   │   │   └── ...                         # Admin modals and RBAC inspectors
│   │   │
│   │   └── Login/                          # Authentication Views
│   │       ├── LoginPage.tsx               # Username/Password entry with Plant/MF selector
│   │       └── ForgotPasswordModal.tsx     # Zero-plaintext OTP verification flow
│   │
│   └── public/                             # Static assets, logos & favicon
```

---

## 3. Getting Started & Local Setup

### 3.1 Prerequisites
- **Node.js:** `v18.x` or `v20.x` LTS
- **Python:** `3.11.x` or `3.12.x`
- **PostgreSQL:** `15.x` or `16.x`
- **Redis:** `7.x` (On Windows, use **Memurai** or Redis inside WSL2 / Docker)
- **Native OS Libraries for WeasyPrint (PDF engine):**
  - **Linux (Ubuntu/Debian):** `sudo apt-get install build-essential python3-dev python3-pip libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0 libffi-dev libgirepository1.0-dev`
  - **macOS:** `brew install pango gdk-pixbuf libffi`
  - **Windows:** Install GTK3 for Windows runtime or ensure Cairo/Pango DLLs are available in PATH.

---

### 3.2 Backend Setup Step-by-Step

1. **Navigate to the Backend directory:**
   ```bash
   cd Backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate

   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Environment Variables:**
   Copy `.env.example` to `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```
   *Ensure `DATABASE_URL` points to your active PostgreSQL instance and `REDIS_URL` points to your Redis instance.*

5. **Execute Database Migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Seed Initial RBAC Roles & SuperAdmin Account:**
   ```bash
   python ensure_superadmin.py
   python provision_dev_rbac_users.py
   ```

7. **Start the Django Development Server:**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

8. **Start Celery Asynchronous Worker (in a separate terminal):**
   ```bash
   # Linux / macOS
   celery -A config worker -l info

   # Windows (Gevent or Solo pool is required on Windows)
   celery -A config worker -l info -P solo
   ```

---

### 3.3 Frontend Setup Step-by-Step

1. **Navigate to the Frontend directory:**
   ```bash
   cd Frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Launch the Vite Development Server:**
   ```bash
   npm run dev
   ```
   *The application will boot at `http://localhost:5173`.*

---

### 3.4 Verification Checklist
- [ ] Open `http://localhost:8000/api/v1/health/` in browser → Returns `{"status": "healthy", "database": "connected", "redis": "connected"}`.
- [ ] Open `http://localhost:5173` → Renders the KSPGCockpit Login Portal.
- [ ] Login using default dev credentials (`admin` / `Admin@123` or your seeded SuperAdmin account).
- [ ] Navigate to the **PPSR System** → Create a test report and trigger **Export PDF** → PDF should generate asynchronously and download successfully.

---

## 4. Architecture, System Design & Technical Trade-offs

### 4.1 End-to-End System Architecture

```mermaid
flowchart TD
    subgraph Client_Layer["Frontend Client (React 18 + Vite + TS)"]
        UI["React SPA (PPSR & Kaizen Modules)"]
        State["Client State & React Hook Form"]
        PPSR_API["API Client (ppsrApi.ts)"]
        UI --> State
        State --> PPSR_API
    end

    subgraph Gateway_Layer["Django 5 Monolith Backend"]
        Routing["URL Router (/api/v1/)"]
        Auth["JWT & Session RBAC Auth"]
        RL["Rate Limiter (django-ratelimit)"]
        CacheMux["Redis Cache Layer"]
        Views["DRF ViewSets & Services"]
        
        PPSR_API <-->|REST / JSON| Routing
        Routing --> Auth
        Auth --> RL
        RL --> CacheMux
        CacheMux --> Views
    end

    subgraph Data_Layer["Persistence & Storage"]
        Postgres[(PostgreSQL 15+ DB)]
        MediaDir[("Local / S3 Media Storage")]
        Views <-->|ORM Queries| Postgres
        Views -->|Store Uploads| MediaDir
    end

    subgraph Async_Worker_Layer["Asynchronous Task Engine"]
        RedisQueue[("Redis Broker & Cache")]
        CeleryWorker["Celery Worker (Gevent/Solo)"]
        WeasyEngine["WeasyPrint PDF Engine"]
        HTMLTemplate["Django A4 HTML Templates"]

        Views -.->|Enqueue PDF Task| RedisQueue
        RedisQueue <--> CeleryWorker
        CeleryWorker --> HTMLTemplate
        HTMLTemplate --> WeasyEngine
        WeasyEngine -->|Write PDF Binary| MediaDir
    end
```

---

### 4.2 Architecture Trade-offs & "Unusual" Design Choices

#### 1. Hybrid Relational + JSON Schema Design (PostgreSQL JSONField)
* **The Choice:** Key 8D and PSQ data structures (IS/IS NOT facts, Ishikawa 6M fishbone, 5-Whys columns, and PSQ multi-stage elimination trees) are stored as structured `models.JSONField` within `PpsrReport` rather than 10+ normalized relational tables.
* **Why this was chosen (Rationale):** 
  - An 8D report is always authored, displayed, reviewed, and exported as a single unified document snapshot.
  - Ishikawa and PSQ elimination trees have dynamic, branching hierarchies that change depending on whether the quality engineer chooses a 6M fishbone or a Shainin component swap analysis.
  - Normalizing this would require massive multi-table SQL `JOIN`s across 6 levels of parent-child relationships for every single render, slowing down sheet inspection and presentation mode.
  - PostgreSQL stores `JSONField` as binary JSONB, allowing fast indexing and querying where needed, while giving the frontend maximum schema flexibility without requiring destructive database migrations for every form layout tweak.

#### 2. Atomic Sequential Numbering with `select_for_update()`
* **The Choice:** `PpsrReport` and `Kaizen` sequence numbers (`BE-YYYY-NNN` and `KZ-YYYY-NNN`) are generated inside atomic database transactions using `PpsrReport.objects.filter(...).select_for_update().first()`.
* **Why this was chosen (Rationale):**
  - Automotive compliance and IATF 16949 quality audits strictly forbid gaps or duplicate sequence numbers in root cause records.
  - In a busy plant where multiple operators submit reports concurrently across shifts, standard autoincrement integer IDs or non-locked queries produce race conditions and duplicate key collisions.
  - Row-level locking on the sequence prefix guarantees strict atomic incrementing with zero duplicate numbers.

#### 3. Asynchronous Server-Side PDF Compilation via WeasyPrint & Celery
* **The Choice:** PDF export is completely decoupled from the HTTP request cycle using Celery and WeasyPrint, instead of client-side libraries (like `html2canvas` or `jsPDF`).
* **Why this was chosen (Rationale):**
  - High-resolution industrial 8D sheets contain vectorized Ishikawa diagrams, multi-stage tables, and high-res evidence photos that must print cleanly across standard A4 boundaries. Client-side canvas rendering often suffers from blurry rasterization, CSS rendering bugs across different browsers, and page-cut split artifacts.
  - WeasyPrint provides standard W3C CSS Paged Media (`@page`, `size: A4 landscape`, page counters, orphan control).
  - Because WeasyPrint rendering can take 1.5–3.5 seconds, running it synchronously would block Django Gunicorn worker threads, leading to request starvation under high load. Celery moves this work to background workers while the client polls `/pdf/status/`.

#### 4. Multi-Tiered Redis Caching with Signal-Based Invalidation
* **The Choice:** Aggregation endpoints (Summary statistics, Monthly Award leaderboards, and Register spreadsheets) are cached in Redis with varying TTLs (5 min to 1 hour), and invalidated automatically via Django ORM signals (`post_save`, `post_delete`).
* **Why this was chosen (Rationale):**
  - The Review Board and Award Leaderboards execute expensive SQL aggregations (`COUNT`, `SUM(cost_save)`, average CFT star votes across multi-table joins).
  - In a shop-floor display terminal or meeting room with 15 CFT members actively opening the board, querying the raw database on every refresh causes unnecessary database load.
  - Signal-based cache key clearing ensures that as soon as a manager edits a metric or submits a star rating, the cache is flushed immediately, guaranteeing zero stale data for users.

#### 5. Zero-Plaintext Salted OTP Password Reset Architecture
* **The Choice:** Password reset OTP codes are never stored in plaintext or basic session variables. They are hashed using PBKDF2 (`make_password`) in the `PasswordResetOTP` table.
* **Why this was chosen (Rationale):**
  - To maintain strict industrial information security standards. Even if an attacker obtains read-only database dump access, they cannot harvest active password reset OTPs.
  - OTPs feature a strict 5-minute TTL, maximum 5 verification attempts before permanent account lock, and issue a cryptographic single-use reset token upon verification.

---

## 5. API Reference & Endpoint Specifications

All API endpoints are prefixed with `/api/v1/` (with backwards-compatible aliases under `/api/ppsr/` for legacy clients).

### 5.1 Authentication Module (`/api/v1/auth/`)

#### `POST /api/v1/auth/login/`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "username": "EMP001",
    "password": "Password@123",
    "mini_factory": "MF1"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "employee_id": "EMP001",
      "username": "EMP001",
      "full_name": "Swaraj Matre",
      "department": "Quality",
      "plant": "Plant 1",
      "mini_factory": "MF1",
      "role": "kaizen_lead",
      "role_category": "coordinator",
      "is_superadmin": false
    }
  }
  ```

#### `POST /api/v1/auth/forgot-password/request-otp/`
* **Auth Required:** No
* **Request Body:** `{"employee_id": "EMP001"}`
* **Success Response (200 OK):**
  ```json
  {
    "message": "OTP sent successfully.",
    "masked_phone": "+91 XXXXX 3210"
  }
  ```

---

### 5.2 Kaizen Module (`/api/v1/kaizens/`)

#### `GET /api/v1/kaizens/`
* **Auth Required:** Yes (Token / Session)
* **Query Parameters:** `status`, `classification`, `area`, `mini_factory`, `month`, `search`, `page`, `page_size`
* **Success Response (200 OK):** Paginated list of Kaizen records.

#### `POST /api/v1/kaizens/`
* **Auth Required:** Yes
* **Request Body:**
  ```json
  {
    "title": "Piston Ring Chamfer Fixture Modification",
    "suggestion_date": "2026-08-31",
    "area": "Machining Line 2",
    "mini_factory": "MF1",
    "problem_before": "Manual burr removal takes 45s per cycle.",
    "counter_measure_after": "Installed pneumatic deburring fixture.",
    "cost_save": 125000.00,
    "benefits": {
      "productivity": true,
      "quality": true,
      "cost": true,
      "delivery": false,
      "safety": true,
      "morale": false
    }
  }
  ```
* **Success Response (201 Created):** Returns the full created Kaizen object with generated `sr_no: "KZ-2026-042"`.

---

### 5.3 PPSR 8D Module (`/api/ppsr/` & `/api/v1/ppsr/`)

#### `GET /api/ppsr/reports/`
* **Description:** Retrieves paginated lightweight PPSR register list.
* **Cache:** 5 Minutes TTL (Redis).
* **Rate Limit:** 60 requests / minute.
* **Response Schema (200 OK):**
  ```json
  {
    "count": 14,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": "c8b41dfb-8a29-4509-9f79-847fa2fae213",
        "ppsr_no": "BE-2026-001",
        "title": "Blowhole defect in Cylinder Head Castings",
        "plant": "Plant 1",
        "line_station": "Station 04",
        "lead_owner": "Rahul Sharma",
        "discovered_by": "Vikas Patil",
        "discovered_on": "2026-08-15",
        "status": "In-Progress",
        "committee_decision": "In Review",
        "root_cause_analysis": "Moisture in mold sand -> Inadequate degassing",
        "cost_save_per_month": "45000.00",
        "cost_save_per_annum": "540000.00",
        "std_status_mf": "Pending",
        "week": "WK-33",
        "jira_number": "Q-8921",
        "created_at": "2026-08-15T09:30:00Z"
      }
    ]
  }
  ```

#### `POST /api/ppsr/reports/`
* **Description:** Creates a complete 8D PPSR report with nested actions.
* **Rate Limit:** 10 requests / hour per user.
* **Request Body:**
  ```json
  {
    "title": "Oil leakage at Main Bearing Cap",
    "problem_statement": "Oil seepage observed during cold test at final assembly.",
    "plant": "Plant 1",
    "line_station": "Line 3 / Station 10",
    "lead_owner": "Anil Deshmukh",
    "target_date": "2026-09-30",
    "facts_analysis": {
      "whatIs": "Leakage at joint face",
      "whatIsNot": "Crack in casting",
      "whereIs": "Station 10 Cold Test",
      "whereIsNot": "Sub-assembly",
      "whenIs": "Shift A",
      "whenIsNot": "Shift B/C",
      "howIs": "0.5 bar pressure drop",
      "howIsNot": "Total seal failure"
    },
    "containment_actions": [
      {
        "no": 1,
        "action": "100% torque audit on all bolts",
        "responsible": "S. Kumar",
        "date": "2026-08-31",
        "status": "implemented"
      }
    ],
    "cause_localization_approach": "fishbone",
    "ishikawa": {
      "man": ["Operator torque gun angle deviation"],
      "machine": ["Torque spindle calibration drift"],
      "material": ["Gasket thickness variation"],
      "methods": ["SOP missing angle tolerance"],
      "milieu": ["Ambient temp variation"],
      "measurement": ["Pressure gauge tolerance"]
    },
    "five_whys": {
      "column1": ["Why leak?", "Why bolt loose?", "Why torque low?", "Why tool cut off early?", "Root: Sensor drift"],
      "column2": [],
      "column3": []
    },
    "corrective_actions": [
      {
        "no": 1,
        "measure": "Recalibrate and lock torque gun parameter set",
        "responsible": "Maint. Team",
        "deadline": "2026-09-10",
        "status": "in-progress"
      }
    ]
  }
  ```
* **Success Response (201 Created):** Returns full `PpsrReportDetail` object with automatically generated `ppsr_no: "BE-2026-002"`.

#### `PATCH /api/ppsr/reports/{id}/metrics/`
* **Description:** Updates spreadsheet production metrics and triggers server-side cost calculation service.
* **Rate Limit:** 60 requests / hour per user.
* **Request Body:**
  ```json
  {
    "prod_qty_before": 10000,
    "rejected_qty_before": 120,
    "prod_qty_after": 10000,
    "rejected_qty_after": 15,
    "cust_demand_qty_month": 8500,
    "per_set_rejection_cost": 450.00
  }
  ```
* **Response (200 OK):** Computed read-only fields returned:
  ```json
  {
    "pct_before": 1.2,
    "pct_after": 0.15,
    "qty_month_before_rej_pct": 102,
    "qty_month_after_rej_pct": 13,
    "qty_month_saved_rej_pct": 89,
    "cost_save_per_month": "40050.00",
    "cost_save_per_annum": "480600.00"
  }
  ```

#### `POST /api/ppsr/reports/{id}/pdf/`
* **Description:** Triggers asynchronous Celery task for WeasyPrint A4 PDF compilation.
* **Rate Limit:** 10 requests / hour per user.
* **Response (202 Accepted):**
  ```json
  {
    "message": "PDF generation task initiated.",
    "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status_url": "/api/ppsr/reports/c8b41dfb.../pdf/status/?task_id=9b1deb4d..."
  }
  ```

#### `GET /api/ppsr/reports/{id}/pdf/status/?task_id={task_id}`
* **Description:** Polls PDF generation status.
* **Response (200 OK):**
  ```json
  {
    "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "SUCCESS",
    "ready": true,
    "download_url": "/api/ppsr/reports/c8b41dfb.../pdf/download/"
  }
  ```

#### `GET /api/ppsr/reports/{id}/pdf/download/`
* **Description:** Streams binary PDF content (`application/pdf`) with `Content-Disposition: attachment; filename="PPSR_BE-2026-001.pdf"`.

---

## 6. Data Models & Database Schemas (ERD)

### 6.1 Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    CustomUser ||--o{ UserModuleRole : "has"
    CustomUser ||--o{ Kaizen : "creates"
    CustomUser ||--o{ WorkflowHistory : "performs"
    CustomUser ||--o{ CftRating : "casts"
    
    Kaizen ||--|| KaizenBenefit : "specifies"
    Kaizen ||--o{ KaizenEvidence : "contains"
    Kaizen ||--o| KaizenCostSaving : "quantifies"
    Kaizen ||--o| ImpactAssessment : "undergoes"
    Kaizen ||--o| KaizenVerification : "verified_by"
    Kaizen ||--o| KaizenClosure : "closed_by"
    Kaizen ||--o{ WorkflowHistory : "logs"

    ImpactAssessment ||--o{ ImpactItem : "evaluates"
    ImpactAssessment ||--o{ ImpactAction : "allocates"
    ImpactAssessment ||--o{ AllocatedResource : "assigns"

    PpsrReport ||--o{ ContainmentAction : "contains"
    PpsrReport ||--o{ CorrectiveAction : "rectifies"
    PpsrReport ||--o{ StandardizationItem : "standardizes"
    PpsrReport ||--o{ ReadAcrossItem : "deploys"
    PpsrReport ||--|| FiveWhysChain : "analyzes"
    PpsrReport ||--o{ CommitteeFeedback : "receives"
    PpsrReport }o--o{ PpsrMeetingLog : "reviewed_in"
    PpsrReport ||--o{ PpsrCftRating : "rated_by"

    CftMember ||--o{ PpsrCftRating : "submits"
    CFTEvaluationSession ||--o{ CFTRating : "records"
    CFTEvaluationSession ||--o{ MonthlyAward : "finalizes"
```

---

### 6.2 Database Schema Definitions

#### Table: `users` (`accounts.CustomUser`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Internal user ID |
| `employee_id` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL`, `INDEX` | Manufacturing employee badge ID |
| `username` | `VARCHAR(150)` | `UNIQUE`, `NOT NULL` | Username / Login identifier |
| `password` | `VARCHAR(128)` | `NOT NULL` | Django cryptographic password hash |
| `department` | `VARCHAR(100)` | `INDEX` | Department (Quality, Operations, Machining) |
| `plant` | `VARCHAR(100)` | `INDEX` | Plant location |
| `mini_factory` | `VARCHAR(50)` | `DEFAULT 'MF1'`, `INDEX` | Assigned Mini-Factory designation |
| `role_id` | `BIGINT` | `FOREIGN KEY (roles.id)` | Primary system role |
| `is_active_employee` | `BOOLEAN` | `DEFAULT TRUE` | Active employment status |
| `must_change_password`| `BOOLEAN` | `DEFAULT FALSE` | First-login password change flag |

#### Table: `kaizens` (`kaizens.Kaizen`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Internal ID |
| `sr_no` | `VARCHAR(20)` | `UNIQUE`, `NOT NULL`, `INDEX` | Auto-generated serial number (`KZ-2026-001`) |
| `title` | `VARCHAR(500)` | `NOT NULL` | Improvement description title |
| `status` | `VARCHAR(20)` | `INDEX`, `NOT NULL` | `draft`, `submitted`, `approved`, `rejected`, `closed` |
| `classification` | `VARCHAR(20)` | `INDEX`, `NOT NULL` | `kaizen`, `good_point`, `pending`, `none` |
| `mini_factory` | `VARCHAR(100)` | `INDEX` | Mini-Factory scope |
| `area` | `VARCHAR(200)` | `INDEX` | Line/Station location |
| `suggestion_date` | `DATE` | `NOT NULL` | Date suggested |
| `closing_target_date` | `DATE` | `NULLABLE` | Target closure date |
| `implementation_date` | `DATE` | `NULLABLE` | Actual closure date |
| `cost_save` | `DECIMAL(15,2)` | `DEFAULT 0.00` | Estimated cost savings (INR) |
| `photo_before` | `VARCHAR(100)` | `NULLABLE` | Path to before photo |
| `photo_after` | `VARCHAR(100)` | `NULLABLE` | Path to after photo |
| `created_by_id` | `BIGINT` | `FOREIGN KEY (users.id)` | Submitting user |
| `assigned_reviewer_id`| `BIGINT` | `FOREIGN KEY (users.id)` | Reviewer manager |

#### Table: `ppsr_reports` (`ppsr.PpsrReport`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Globally unique report UUID |
| `ppsr_no` | `VARCHAR(30)` | `UNIQUE`, `NOT NULL` | Auto-generated sequence (`BE-2026-001`) |
| `title` | `VARCHAR(300)` | `NOT NULL` | 8D Report title |
| `problem_statement` | `TEXT` | `NOT NULL` | Detailed problem description |
| `status` | `VARCHAR(20)` | `DEFAULT 'Open'` | `Open`, `In-Progress`, `Closed` |
| `plant` | `VARCHAR(150)` | `NOT NULL` | Plant identifier |
| `line_station` | `VARCHAR(100)` | `NULLABLE` | Assembly line and station |
| `lead_owner` | `VARCHAR(200)` | `NOT NULL` | Engineer leading the 8D |
| `discovered_on` | `DATE` | `NULLABLE` | Date defect was discovered |
| `facts_analysis` | `JSONB` | `DEFAULT '{}'` | IS / IS NOT analysis object |
| `cause_localization_approach` | `VARCHAR(10)` | `DEFAULT 'both'` | `fishbone`, `psq`, `both` |
| `ishikawa` | `JSONB` | `DEFAULT '{}'` | 6M Fishbone cause lists |
| `psq_tree_data` | `JSONB` | `DEFAULT '{}'` | Shainin PSQ Component Search swap tree |
| `standard_worksheet` | `JSONB` | `DEFAULT '[]'` | PSQ elimination table rows |
| `prod_qty_before` | `INTEGER` | `NULLABLE` | Production volume before fix |
| `rejected_qty_before` | `INTEGER` | `NULLABLE` | Defect count before fix |
| `pct_before` | `DOUBLE PRECISION`| `NULLABLE` | Rejection % before |
| `prod_qty_after` | `INTEGER` | `NULLABLE` | Production volume after fix |
| `rejected_qty_after` | `INTEGER` | `NULLABLE` | Defect count after fix |
| `pct_after` | `DOUBLE PRECISION`| `NULLABLE` | Rejection % after |
| `cost_save_per_month` | `DECIMAL(14,2)` | `NULLABLE` | Calculated monthly savings (INR) |
| `cost_save_per_annum` | `DECIMAL(14,2)` | `NULLABLE` | Calculated annual savings (INR) |

---

## 7. Environment Configuration

### 7.1 Backend Environment Variables (`Backend/.env`)

| Variable Key | Description | Required | Dev Default | Example / Production Note |
|---|---|---|---|---|
| `DEBUG` | Enables Django debug output | ✅ | `True` | Set to `False` in Production |
| `SECRET_KEY` | Cryptographic signing key | ✅ | `insecure-dev-key...` | High-entropy 64-char string |
| `DATABASE_URL` | PostgreSQL connection URL | ✅ | `postgres://...` | `postgres://user:pass@host:5432/kspg` |
| `REDIS_URL` | Redis cache & broker URL | ✅ | `redis://127.0.0.1:6379/1` | Cluster URL in production |
| `CELERY_BROKER_URL` | Message queue broker | ✅ | `redis://127.0.0.1:6379/0` | Dedicated Redis DB |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend domains | ❌ | `http://localhost:5173` | Comma-separated domain list |
| `MAX_UPLOAD_SIZE_MB` | Max evidence photo size | ❌ | `10` | Default 10 MB per file |

### 7.2 Frontend Environment Variables (`Frontend/.env`)

| Variable Key | Description | Required | Default |
|---|---|---|---|
| `VITE_API_BASE_URL` | Base URL of Django REST API | ✅ | `http://localhost:8000/api/v1` |
| `VITE_PPSR_API_BASE_URL`| Base URL of PPSR endpoints | ❌ | `http://localhost:8000/api/ppsr` |

---

## 8. Development Workflow & Standards

### 8.1 Git Branching Strategy
- `main`: Production-ready code. Protected branch.
- `staging` / `develop`: Integration branch for QA and staging verification.
- `feature/<module>-<description>`: Topic branches (e.g. `feature/ppsr-pdf-export`, `feature/cft-award-board`).

### 8.2 Commit Guidelines
Follow **Conventional Commits**:
- `feat(ppsr): add async WeasyPrint PDF task and download endpoint`
- `fix(kaizen): resolve race condition in serial number generator`
- `refactor(cft): extract star rating calculation to domain service`
- `test(ratelimit): add automated test suite for DRF 429 throttling`

### 8.3 Code Style & Formatting
- **Backend (Python):** PEP 8 compliant, formatted with **Black** (`line-length = 100`), sorted with `isort`.
- **Frontend (TypeScript):** ESLint + Prettier rules with TypeScript strict mode enabled (`tsc --noEmit` must pass with zero errors).

---

## 9. Testing Strategy

### 9.1 Test Suite Organization
Tests are co-located within module `tests/` directories:
```text
Backend/
├── ppsr/tests/
│   ├── test_pdf.py         # Tests PDF rendering, Celery dispatch, status polling, and binary file streaming.
│   └── test_ratelimit.py   # Tests 429 throttling on POST /reports/ and PATCH /metrics/.
├── kaizens/tests/          # Tests Kaizen workflow transitions, serial number generator, and permission gates.
└── accounts/tests/         # Tests JWT authentication, RBAC categories, and salted OTP password reset flow.
```

### 9.2 Running Tests
```bash
# Run all backend tests
python manage.py test

# Run PPSR tests only
python manage.py test ppsr.tests

# Run with coverage report
pytest --cov=. --cov-report=html
```

---

## 10. CI/CD Pipeline

The intended GitHub Actions workflow (`.github/workflows/ci.yml`) executes the following on every Pull Request to `main`:
1. **Frontend Lint & Type Check:**
   ```bash
   cd Frontend && npm install && npm run build
   ```
2. **Backend Style Check:**
   ```bash
   flake8 Backend --max-line-length=100
   black --check Backend
   ```
3. **Database & Unit Tests:**
   Spins up a PostgreSQL & Redis service container and executes `python manage.py test`.

---

## 11. Deployment & Infrastructure

### 11.1 Production Stack Recommendation
- **Reverse Proxy / Ingress:** Nginx / Cloudflare (Terminating SSL, enforcing gzip/brotli compression and static media caching).
- **WSGI / App Server:** Gunicorn with `UvicornWorker` (4–8 workers based on CPU cores).
- **Task Workers:** Celery worker daemon managed via `systemd` or Kubernetes Pods (`--concurrency=4 -P gevent`).
- **Storage:** Amazon S3 or MinIO for user-uploaded defect photos and compiled PDF archives via `django-storages`.

---

## 12. Monitoring, Observability & Error Handling

### 12.1 Logging Architecture
Django logging is structured into `/Backend/logs/`:
- `django.request`: Logs all 4xx and 5xx responses with request context.
- `celery.task`: Logs task execution times, retry attempts, and exceptions in PDF rendering.

### 12.2 Health Check Endpoint
- **URL:** `GET /api/v1/health/`
- **Behavior:** Probes database query execution (`SELECT 1`) and Redis ping (`redis.ping()`).
- **Response:** `200 OK` if all dependencies are healthy; `503 Service Unavailable` if database or cache is unreachable.

---

## 13. Security Architecture & RBAC

### 13.1 Role Hierarchy & Permissions

```text
SuperAdmin (Full bypass & system configuration)
   │
   ├── Module Administrator (Manage users, delete records, override locks)
   │     │
   │     ├── Coordinator / Lead (Approve, reject, assign impact actions, lead 8Ds)
   │     │     │
   │     │     ├── Committee / Reviewer (Review boards, cast CFT star votes)
   │     │     │     │
   │     │     │     └── Verifier (Validate shop-floor implementation & savings)
   │     │     │           │
   │     │     │           └── Initiator / Operator (Submit Kaizens, draft PPSRs)
```

### 13.2 Security Controls
- **SQL Injection:** Protected via Django ORM parameterized queries.
- **Cross-Site Scripting (XSS):** React auto-escaping + Django template auto-escaping in PDF views.
- **Cross-Origin Resource Sharing (CORS):** Explicit origin whitelist via `django-cors-headers`.
- **Brute Force & DoS Throttling:** Enforced via `django-ratelimit` on login, OTP, and expensive PDF creation endpoints.

---

## 14. Known Issues, Technical Debt & Quirks

1. **WeasyPrint Windows Dynamic Libraries:**  
   *Quirk:* WeasyPrint on native Windows requires native GTK3 C-libraries (`libcairo`, `libpango`, `gobject`). If these DLLs are not in the system PATH, PDF export will fail with `OSError: cannot load library 'gobject-2.0'`.  
   *Mitigation:* Use Linux containers (Docker) or ensure GTK3 runtime is installed on Windows development machines.
2. **Frontend PDF Polling vs. WebSockets:**  
   *Debt:* The frontend currently polls `/pdf/status/?task_id=...` every 1.5 seconds until completion.  
   *Roadmap:* Upgrade to Django Channels WebSockets for push notifications when Celery finishes PDF compilation.
3. **Spreadsheet Metrics Computed Fields:**  
   *Quirk:* Rejection percentages and savings in INR are calculated dynamically on the server. If the frontend displays an optimistic preview, slight rounding differences (e.g. 2 decimal places) may occur until the server response resolves.

---

## 15. Glossary & Manufacturing Domain Knowledge

- **PPSR:** Practical Problem Solving Report (a structured 8D quality document).
- **8D Methodology:**
  - **D1:** Team Formation (Lead owner, CFT members).
  - **D2:** Problem Description (IS / IS NOT boundary analysis).
  - **D3:** Emergency Containment Actions (Immediate defect stops).
  - **D4:** Root Cause Analysis (Ishikawa 6M Fishbone + 5-Whys).
  - **D5:** Permanent Corrective Actions (Process fixes).
  - **D6:** Validation & Effectiveness (Defect trend charts).
  - **D7:** Standardization & Yokoten (SOP updates & cross-line horizontal deployment).
  - **D8:** Team Recognition & Closure (Steering committee sign-off).
- **Ishikawa 6M:** Cause categorization across *Man, Machine, Material, Method, Milieu (Environment), and Measurement*.
- **Shainin PSQ / Component Search:** An empirical problem-solving method isolating defect causes by swapping parts between a "Best of the Best" (**BOB**) assembly and a "Worst of the Worst" (**WOW**) assembly.
- **Yokoten (Read-Across):** Japanese lean manufacturing concept of horizontally deploying a proven improvement or solution to all similar production lines across the plant.
- **CFT:** Cross-Functional Team (interdisciplinary team of Production, Quality, Maintenance, and Safety engineers).
- **5S:** Sort (*Seiri*), Set in Order (*Seiton*), Shine (*Seiso*), Standardize (*Seiketsu*), Sustain (*Shitsuke*).
- **PFMEA:** Potential Failure Mode and Effects Analysis.
- **PFD:** Process Flow Diagram.

---

## 16. Contribution Guide & End-to-End Feature Recipe

### How to Implement a New Feature End-to-End

Follow this 7-step recipe whenever adding new functionality:

```text
[1. Define Model] ────> [2. Make Migrations] ────> [3. Build Serializer]
                                                           │
[6. Build UI] <──── [5. Add Frontend API] <──── [4. Write View & URL]
      │
[7. Write Tests & Verify]
```

1. **Model:** Define data structures in `<module>/models.py`. Use explicit foreign keys, indexes, and verbose names.
2. **Migrations:** Run `python manage.py makemigrations` followed by `python manage.py migrate`.
3. **Serializer:** Build DRF serializers in `<module>/serializers.py` with validation logic.
4. **View & URL:** Implement business logic in `<module>/views.py` using `ModelViewSet` or `APIView`. Register route in `<module>/urls.py`.
5. **Frontend API:** Add typed Axios/fetch functions in `Frontend/src/api/<module>Api.ts`.
6. **Frontend Component:** Build UI in `Frontend/src/<module>/` leveraging Tailwind tokens and Lucide icons.
7. **Testing:** Add test cases in `<module>/tests/` and run `python manage.py test`.

---

## 17. Changelog & Release Notes

### Version `1.0.0` (Current Release)
- **PPSR Module Launch:** Full 8D lifecycle management, interactive Ishikawa 6M fishbone editor, Shainin PSQ elimination tree wizard, and digital A4 sheet inspector.
- **Asynchronous PDF Export:** Integrated Celery + Redis + WeasyPrint engine with live task polling and A4 landscape PDF streaming.
- **API Optimization:** Added Redis multi-layer caching on summary dashboards and register list views with automatic signal-based invalidation.
- **Security & Rate Limiting:** Implemented granular DRF endpoint throttling via `django-ratelimit` and zero-plaintext PBKDF2 OTP password reset flows.
- **Kaizen Platform Integration:** Complete 5M/Safety/PFD impact assessment tracking and monthly CFT star evaluation board.

---
*Document maintained by the KSPGCockpit Core Engineering Team.*
