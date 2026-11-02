# Red Flag Backend — End-to-End Implementation Plan

*Prepared 1 Nov 2026 from `SFC-Final` @ commit `ca4154e` · Stack: Django + DRF, PostgreSQL, MinIO · Scope: Red Flag module only*

## How to use this document

- **Part A** explains how the Red Flag flow works today (what I read in the six components, `types.ts`, `App.tsx` and the mock `server.ts`). **Parts B and C** are the shared contract (conventions + schema). Give the agent Parts A–C once at the start, then paste **one phase at a time**. Every phase is written to stand alone on top of Parts B and C.
- Phases 1–7 are backend only. Phases 8–9 touch the React code (wiring the API and removing hardcoded values) because that cannot be done from the backend side.
- Each phase ends with acceptance criteria. Do not start the next phase until they pass.
- Items marked **Decision** are places where the frontend is silent or contradicts itself. I picked a default so the agent is not blocked; change any of them before handing a phase over.

---

# Part A — How the Red Flag works today

## A1. The idea

The Red Flag is a shop-floor non-conformance tracker (form `SFC/QA/RF-01`, IATF 16949). Three governance rules appear on every screen: **anyone can raise a Red Flag on anyone**, **QA is the official custodian**, and **the point stays open until 3 months (30/60/90-day audits) of zero recurrence**.

## A2. Actors

| Role (`RedFlagRole`) | Does | Stage |
| --- | --- | --- |
| Initiator | Raises the flag with a point-of-defect (T0) photo | 1 |
| Target Person | Contains/quarantines (T1 photo), then does 5-Why root cause and permanent action | 2, 3 |
| Quality Custodian | Verifies or rejects containment, verifies CAPA, starts and audits sustenance, closes | 4 + 90-day audits |
| Plant Head | Super-admin; co-signs closure (`approvedByProduction`) | all |

Today the role is a client-side dropdown with no login. A separate `UserPersona` (operator / committee / manager) exists app-wide and is unrelated to these four roles.

## A3. Lifecycle and state

Three status fields move together:

- `status`: Open → Contained → In-Progress → Under-Sustenance → Closed
- `containmentStatus`: Pending → Contained → Verified
- `qaCustodianStatus`: Review Pending → Containment Approved → CAPA Verified → In Sustenance → Closed Approved

**Stage 1 – Detection (Initiator).** Required: description and the T0 photo. Captured: raised timestamp, raised-by and department, target department and person, plant (MF), line, station, model, type and sub-type, severity (Critical (Line Stop) / Major (Quarantine) / Moderate (Rework)), 5M+1E category, first-time or repetitive, QA custodian, target date. Result: `status=Open`, `containmentStatus=Pending`, `qaCustodianStatus=Review Pending`, a flag number is generated, and a Detection entry is written to the stage history.

**Stage 2 – Containment (Target Person).** Required: containment action text and the T1 photo. Captured: who acted, containment timestamp, suspect quantity quarantined, quarantine tag and location, sorting counts (inspected / OK / rejected). The T0→T1 gap is computed and shown against a **2-hour SLA**. Result: `status=Contained`, `containmentStatus=Contained`.

**Stage 3 – Root cause and permanent action (Target Person / CFT).** Required: 5-Why root-cause statement and permanent action. Captured: why1–why4, the standardisation checklist (SOP, PFMEA, Control Plan, One-Point Lesson), target date. Result: `status=In-Progress`.

**Stage 4 – Quality verification (Quality Custodian).** Three decisions: **reject** containment (back to `Open` / `Pending`, Target Person redoes Stage 2); **approve** containment (`Verified`, verifier and time stamped); **verify CAPA and start sustenance** (`Under-Sustenance`, `sustenanceStartDate` = today, three checks scheduled at +30/+60/+90 days).

**Stage 5 – Sustenance and closure.** Each check is `Passed` or `Recurrence Detected`; the action modal enforces order (month 2 only after month 1 passed, month 3 only after month 2). All three passed → `sustenanceAchieved=true`. Closure records `closureDate`, `closureEvidence` photo, `validationTrialShifts/Results`, `approvedByQA` and `approvedByProduction`. The modal lets anyone close early after a `window.confirm`.

**Cross-module escalations** (from the action modal's Escalation tab): to PPSR (8D), to a Kaizen Poka-Yoke, to a 5S Red Tag. Each creates a record in the other module and stores `linkedPpsrId/No`, `linkedKaizenId/No`, `linkedFiveSRedTagId/No` on the flag.

**Audit trail:** `stageHistory[]` (stage, completedAt, completedBy, signOffRole, notes).

## A4. Screens and the data each one needs

- **Dashboard (`RedFlagDashboard`)** – 7 filters (plant, originator dept, target dept, defect type, 5M, severity, status); 8-KPI strip; 3-actor workflow funnel; T0→T1 time-gap SLA buckets (≤30 / 31–60 / 61–120 / >120 min) with average and SLA %; quarantine and sorting totals; 5M Pareto with cumulative %; defect-type breakdown; originator × target department matrix; target-person leaderboard (count, open, average gap); station/line hotspots; 30/60/90 sustenance cohort pass rates; cross-module link counts; a drill board (plant → line → 5M, owner and status slicers).
- **Form (`RedFlagSheetForm`)** – four stage tabs with role gating (`isInitiatorAuthorized`, `isTargetAuthorized`, `isQualityAuthorized`; Plant Head passes all); camera/upload photos; demo preset buttons.
- **Master Tracker (`RedFlagSystem`)** – search (number, description, raised-by, target person, line, station), filters, table/cards layout, CSV export, per-row actions.
- **Presentation Mode (`RedFlagPresentationMode`)** – per-flag 4-stage slide view with a flag queue, photo zoom, client-side PDF export, and Stage-4 actions (verify containment, start sustenance, log month audits). Separately, `RedFlagSystem` builds an executive deck from aggregates (scorecard, active alerts, sustenance table, 5M and accountability matrix).
- **Sustenance tab** – month 1/2/3 status per flag.
- **Action modal (`RedFlagActionModal`)** – five tabs (details, containment, RCA, sustenance, escalation) with save-all.
- **Print sheet (`RedFlagPrintSheet`)** – the official A4 form, rendered client-side with `window.print()`.
- **Global dashboard and sidebar** – consume the flag list for open/closed counts and drill records.

## A5. What exists on the server today

`server.ts` (Express) keeps `redFlags` in an in-memory array seeded with 4 records. Routes: `GET/POST /api/redflags`, `PUT/DELETE /api/redflags/:id`, `POST …/sustenance-check`, `POST …/escalate-ppsr`, `…/convert-kaizen`, `…/link-fives`. Photos are base64 SVG/JPEG data URLs inside the JSON. No authentication, no validation, no persistence. The frontend expects every response as `{ success, data }` (or `{ success, redFlag, ppsr|kaizen|redTag }`).

## A6. Contradictions the backend must settle (Decisions)

1. **Who closes a flag.** Presentation Mode auto-closes the moment three checks pass and auto-fills `approvedByQA`; the action modal needs an explicit close with Plant Head sign-off; the Express route sets `qaCustodianStatus='Closed Approved'` but not `status`. **Default:** passing all three checks sets `sustenanceAchieved=true` only; closure is an explicit action by the Quality Custodian or Plant Head with named approvers.
2. **Early closure.** Today anyone can force it. **Default:** only Plant Head, with a mandatory reason, stored as `closedEarly=true` and audit-logged.
3. **“Recurrence Detected”** has no consequence today. **Default:** the flag returns to `In-Progress`, `sustenanceAchieved=false`, the failed cycle is kept, and the next “start sustenance” opens cycle n+1 with fresh dates.
4. **Audit before its due date.** Nothing stops a day-90 “Passed” on day 1. **Default:** reject an audit earlier than `scheduledDate − 3 days` (config `enforceSustenanceSchedule`, can be switched off in dev).
5. **“Closed” and “open” counts** are defined four different ways (System: `Closed && achieved`; Dashboard: `Closed || achieved`; Global: `Closed`; sidebar badge: `Open || In-Progress`). **Default:** one backend definition; analytics return `byStatus` plus `openCount` (status Open), `unresolvedCount` (not Closed) and `closedSustainedCount` (Closed and achieved). The sidebar badge keeps its current meaning (Open + In-Progress) until you decide otherwise.
6. **`qaCustodianStatus='CAPA Verified'`** is currently set when the *Target Person* submits Stage 3, before QA has verified anything. **Default:** keep the enum value (so the UI does not change) but set it only when QA verifies CAPA; after Stage 3 submission it stays `Containment Approved` or `Review Pending`.
7. **Severity filter** offers “Minor (Observation)”, which is not in the `severity` type. **Default:** the backend enum is the three values in `types.ts`.
8. **Read access.** “Anyone can raise on anyone” implies transparency. **Default:** every authenticated user can read every flag; writes are role-gated (Part B).

---

# Part B — Architecture and conventions

## B1. Stack and layout

- Django 5 + Django REST Framework, PostgreSQL 15+, MinIO via `django-storages` (S3 backend) + `boto3`. Extensions: `pg_trgm` for search.
- If the SFC Django project already exists (for example the Kaizen backend), add a new app `redflag` to it and reuse its user model and auth. Otherwise bootstrap the project and a custom-free `User` plus `Employee` profile.
- App layout: `models/`, `serializers/`, `services/` (all state transitions live here, never in views), `views/`, `permissions.py`, `selectors/` (read queries and analytics), `storage.py`, `management/commands/`, `tests/`.
- Timezone `Asia/Kolkata`, `USE_TZ=True`, store `timestamptz`.
- `docker-compose.yml` with Postgres and MinIO for local development; all secrets from environment variables.

## B2. API contract (compatibility first)

The React code is already written against specific shapes, so the API mirrors them to keep the frontend swap small:

- Base path `/api/redflags` with **no trailing slash** (`DefaultRouter(trailing_slash=False)`).
- JSON in **camelCase**, **flat** `RedFlag` object identical to `src/types.ts` (stage-2/3/4/closure fields are flattened from the related tables; `month1Check/month2Check/month3Check` come from the current sustenance cycle; `stageHistory` is nested; photo fields are URLs). Extra fields are additive: `id`, `...Id` foreign keys, `containmentGapMinutes`, `closedEarly`, `rowVersion`.
- Envelope: success `{ "success": true, "data": … }`; escalations `{ "success": true, "redFlag": …, "ppsr" | "kaizen" | "redTag": … }`; errors `{ "success": false, "error": "message", "details": { field: [msgs] } }` with proper HTTP codes (400/401/403/404/409/422).
- Timestamps: ISO 8601 in responses, plus the legacy `"YYYY-MM-DD HH:mm"` string for `raisedTimestamp`/`containmentTimestamp` because the UI does `.replace(' ', 'T')`. Dates as `YYYY-MM-DD`.
- Photos: responses return a short-lived presigned URL in `evidencePhoto`, `countermeasurePhoto`, `closureEvidence` and `month*Check.photoEvidence`, so existing `<img src>` code keeps working. Requests accept an `attachmentId`; during the migration they also accept a `data:image/jpeg|png|webp;base64,` string, which the server decodes, validates and stores (SVG is rejected).
- Optimistic concurrency: writes accept `rowVersion`; a mismatch returns 409.
- Pagination `?page&pageSize` (default 50, max 200) on list; the frontend phase can request the full set where it needs it.

**Endpoint map (final):**

| Method + path | Purpose | Phase |
| --- | --- | --- |
| `GET /api/redflags/me` | current user, roles, employee label | 1 |
| `GET /api/redflags/lookups` | plants, lines, stations, models, departments, employees, enums, config | 1 |
| `POST /api/redflags/attachments` | multipart photo upload | 2 |
| `GET /api/redflags` · `POST /api/redflags` | list/filter/search · raise (Stage 1) | 2 |
| `GET/PATCH/DELETE /api/redflags/:id` | read · limited edit · soft delete | 2 |
| `GET /api/redflags/export.csv` | tracker export | 2 |
| `POST /api/redflags/:id/containment` | Stage 2 submit | 3 |
| `PUT /api/redflags/:id/root-cause` | Stage 3 submit/update | 3 |
| `POST /api/redflags/:id/containment/approve` · `/reject` | Stage 4 containment decision | 4 |
| `POST /api/redflags/:id/sustenance/start` | verify CAPA, start sustenance | 4 |
| `POST /api/redflags/:id/sustenance/checks/:month` | log month 1/2/3 audit | 4 |
| `POST /api/redflags/:id/close` | closure with sign-offs | 4 |
| `POST /api/redflags/:id/escalate-ppsr` · `/convert-kaizen` · `/link-fives` | cross-module links | 5 |
| `GET /api/redflags/analytics/*` · `GET /api/redflags/:id/presentation` | dashboards, deck data | 6 |

The old generic `PUT /api/redflags/:id` is **not** carried over: arbitrary status writes are the main integrity hole in the mock.

## B3. Roles and permissions

Django groups: `rf_quality_custodian`, `rf_plant_head`, `rf_target_person`. “Initiator” is implicit (any authenticated employee). The assigned target person is contextual.

| Action | Allowed |
| --- | --- |
| Read | any authenticated user |
| Raise | any authenticated user |
| Edit Stage-1 details (PATCH) | raiser while status is Open; Quality Custodian until Closed; Plant Head always (field-level audit log) |
| Submit containment / root cause | assigned target person, or a user in the target department with `rf_target_person`, or Plant Head |
| Approve / reject containment, start sustenance, log audits | Quality Custodian group or Plant Head |
| Close | Quality Custodian or Plant Head; early closure Plant Head only |
| Escalate to PPSR / Kaizen | Quality Custodian or Plant Head |
| Link to 5S Red Tag | Target person, Quality Custodian, Plant Head |
| Delete (soft) | Plant Head |

Segregation of duties: the person who submitted containment cannot be the one who approves it, unless they are Plant Head.

## B4. State machine (enforced in `services/`)

- Raise → `Open`.
- Containment submit: only from `Open` (incl. after rejection) → `Contained`.
- Containment reject (reason mandatory): `Contained` → `Open`, containment attempt marked `Rejected`, `containmentStatus=Pending`.
- Root cause submit: from `Contained` or `In-Progress` → `In-Progress` (needs a containment attempt on file).
- Sustenance start: needs containment on file, non-empty `rootCause5Why` and `systematicPermanentAction`; marks containment `Verified` if not already; `In-Progress` → `Under-Sustenance`.
- Audit: only while `Under-Sustenance`; sequential; sets `sustenanceAchieved` when all three of the current cycle are `Passed`.
- Close: only from `Under-Sustenance`; requires `sustenanceAchieved` unless early-closure override.
- Every transition runs in one `transaction.atomic()` with `select_for_update()` on the flag, writes a `StageHistory` row and a `RedFlagAuditLog` row, and bumps `row_version`.

## B5. MinIO attachments

Private bucket `redflag-evidence`, object key `redflag/{yyyy}/{flag_uuid or pending}/{kind}/{uuid}.{ext}`. Accept jpeg/png/webp, max size from config (10 MB), verify with Pillow (not just the header), cap dimensions, strip EXIF GPS, store sha256. Presigned GET URLs expire after the configured TTL. **Configure CORS on the bucket and serve images so `html2canvas` can capture them** (Presentation PDF export uses `html2canvas`; a tainted canvas silently fails). Orphaned uploads (not linked to a flag after 24 h) are removed by a management command.

## B6. Numbering, time, config

- `srNo` is a global integer from `RedFlagSequence` (row-locked); `redFlagNo = RF-{plant.code}-{srNo:03d}` (matches the seeded `RF-MF1-001`; the Express generator produced `RF-MF-005` and used `array.length + 1`, which can duplicate). Numbers are never reused after a soft delete.
- `containmentTimeGap` is returned in the existing label format (`"1h 15m gap"`, `"18 mins gap"`) from one helper plus numeric `containmentGapMinutes`. No placeholder labels: if a time is missing the value is `null`.
- Validation: `raisedAt ≤ now + 5 min`; `containedAt ≥ raisedAt` and `≤ now + 5 min`; counts are non-negative integers; `sortingOk + sortingRejected ≤ sortingInspected`.
- All thresholds, form metadata and defaults come from the `RedFlagConfig` row (Part C), not code.

## B7. Quality bar

pytest + pytest-django, factory\_boy; ≥85% coverage on `services/` and `permissions.py`; a role × action permission-matrix test; OpenAPI schema via `drf-spectacular`; `ruff` + `black`; migrations reversible; no raw SQL string-building; every list endpoint uses `select_related`/`prefetch_related` (assert query counts in tests).

---

# Part C — Schema

App `redflag`. All tables use `id` (UUID unless noted), `created_at`, `updated_at`. “FK+name” means a foreign key plus a **snapshot string** (e.g. `raised_by` + `raised_by_name`) so printed forms and history survive renames and match the string fields the UI already shows. Snapshot format for people is `Full Name (Designation)`.

## C1. Master data (replaces every dropdown that is hardcoded today)

- **`Department`** – `code` unique, `name` unique, `can_originate` bool, `can_be_target` bool, `sort_order`, `is_active`. (Frontend lists today: Production, Quality, Maintenance, Safety & EHS, Logistics & Stores, Tooling & Die, Engineering, Supplier / Inward.)
- **`Plant`** – `code` unique (`MF1`), `name`, `description` (`Assembly & Testing`), `plant_head` FK Employee null, `default_qa_custodian` FK Employee null, `default_quarantine_location` text null, `is_active`.
- **`Line`** – `plant` FK, `name`, `is_active`; unique (`plant`,`name`).
- **`Station`** – `line` FK, `name`, `is_active`; unique (`line`,`name`).
- **`ProductModel`** – `name` unique, `is_active`.
- **`Employee`** – `user` OneToOne null, `employee_code` unique, `full_name`, `designation`, `department` FK, `plant` FK null, `email`, `phone`, `is_active`; property `label` = `Full Name (Designation)`. Roles come from Django groups `rf_quality_custodian`, `rf_plant_head`, `rf_target_person`.
- **`RedFlagConfig`** (single row, admin-editable): `containment_sla_minutes=120`; `gap_bucket_minutes=[30,60,120]`; `sustenance_check_days=[30,60,90]`; `sustenance_audit_grace_days=3`; `enforce_sustenance_schedule=true`; `default_target_days=5`; `ppsr_default_days=14`; `red_tag_disposal_days=7`; `form_number='SFC/QA/RF-01'`; `form_revision='03'`; `standard_reference='IATF 16949:2016 Cl. 10.2'`; `max_photo_mb=10`; `presigned_ttl_seconds=3600`; `governance_rules` JSON list of strings.
- **Enums** (Django `TextChoices`, exposed with labels by `/lookups`): `RedFlagType` (Quality, Process, Machine, Safety, Material, 5S); `Severity` (Critical (Line Stop), Major (Quarantine), Moderate (Rework)); `Category5M` (Man, Machine, Material, Method, Measurement, Environment); `Status`; `ContainmentStatus`; `QaCustodianStatus`; `Repetitive` (First Time, Repetitive); `CheckStatus` (Pending, Passed, Recurrence Detected); `AttachmentKind`; `EscalationModule`.

## C2. Core tables

**`RedFlagSequence`** – `name` pk (`redflag`, `ppsr:2026`, `kaizen:2026`, `redtag:2026`), `last_value`; always incremented under `select_for_update`.

**`RedFlag`**

- Identity: `sr_no` int unique; `red_flag_no` unique; `status`; `row_version` int; `deleted_at`/`deleted_by` (soft delete).
- Stage 1: `raised_at` timestamptz; `raised_by` FK+name; `raised_by_department` FK (+ name); `raised_by_role` text; `target_department` FK (+ name); `target_person` FK+name; `team_leader` text blank; `plant`, `line`, `station`, `model` FKs **plus** `plant_name`, `line_name`, `station_name`, `model_name` snapshots; `red_flag_type`; `red_flag_sub_type` text; `severity`; `category_5m`; `repetitive_occurrence`; `description` text; `evidence_photo` FK Attachment (required).
- Custodian: `qa_custodian` FK+name; `qa_custodian_status`; `qa_custodian_notes` text; `closure_responsibility` FK Employee (defaults to custodian).
- Planning/sustenance: `target_date` date; `sustenance_start_date` date null; `sustenance_cycle` smallint default 1; `sustenance_achieved` bool; `closed_early` bool.
- Derived in the API only (not stored): `responsibleDepartment` (= target department), `containmentStatus`, links, `allowedActions`.
- Indexes: `status`; (`plant`,`status`); (`target_department`,`status`); `raised_at`; `category_5m`; `severity`; `target_person`; trigram GIN on `red_flag_no`, `description`.

**`RedFlagContainment`** (one row per attempt, Stage 2) – `red_flag` FK, `attempt_no`, `is_current` (unique partial index on `red_flag` where true), `action_taken_by` FK+name, `contained_at` timestamptz, `gap_minutes` int, `suspect_qty` int ≥0, `quarantine_tag_no`, `quarantine_location`, `sorting_inspected`/`sorting_ok`/`sorting_rejected` int ≥0 (check: ok + rejected ≤ inspected), `action_text`, `photo` FK Attachment (required), `status` (Contained | Verified | Rejected), `verified_by` FK+name null, `verified_at`, `rejection_reason`.

**`RedFlagRootCause`** (1:1, Stage 3) – `why1`–`why4`, `root_cause`, `permanent_action`, `sop_updated`, `pfmea_updated`, `control_plan_updated`, `opl_issued` bools, `submitted_by` FK+name, `submitted_at`.

**`SustenanceCheck`** – `red_flag` FK, `cycle_no`, `month` (1–3), `target_days`, `scheduled_date`, `audit_date` null, `auditor` FK+name null, `status`, `observations`, `photo` FK null; unique (`red_flag`,`cycle_no`,`month`).

**`RedFlagClosure`** (1:1) – `validation_trial_shifts` int, `validation_trial_results`, `closure_date`, `closure_evidence` FK Attachment null, `approved_by_qa` FK+name, `approved_by_production` FK+name, `early_closure_reason` null, `closed_by` FK, `closed_at`.

**`Attachment`** – `kind` (T0\_EVIDENCE, T1\_CONTAINMENT, SUSTENANCE\_AUDIT, CLOSURE\_EVIDENCE), `red_flag` FK null until linked, `bucket`, `object_key` unique, `original_name`, `content_type`, `size_bytes`, `width`, `height`, `sha256`, `uploaded_by`, `uploaded_at`, `deleted_at`.

**`StageHistory`** (append-only; no update/delete in API or admin) – `red_flag` FK, `stage` (Detection, Containment, RootCause, CAPA, Effectiveness, Sustenance), `event` (e.g. RAISED, CONTAINMENT\_SUBMITTED, CONTAINMENT\_APPROVED, CONTAINMENT\_REJECTED, RCA\_SUBMITTED, CAPA\_VERIFIED, SUSTENANCE\_STARTED, AUDIT\_LOGGED, CLOSED, ESCALATED), `completed_at`, `completed_by` FK+name, `sign_off_role`, `notes`, `from_status`, `to_status`. This feeds the UI's `stageHistory[]`.

**`EscalationLink`** – `red_flag` FK, `target_module` (PPSR, KAIZEN, FIVES\_RED\_TAG), `target_ref_id`, `target_no`, `state` (LINKED | PENDING\_TARGET), `payload` JSONB, `created_by`; unique (`red_flag`,`target_module`).

**`RedFlagAuditLog`** – `red_flag` FK null, `actor` FK, `action`, `changes` JSONB (`{field:[old,new]}`), `ip`, `user_agent`, `at`.

## C3. Stage → history mapping

Raise → Detection · containment submit/approve/reject → Containment · RCA/CAPA submit → RootCause · CAPA verified by QA → CAPA · sustenance start and each audit → Sustenance · close → Effectiveness · escalations → PPSR: RootCause, Kaizen: CAPA, 5S Red Tag: Containment (same as the mock).

---

# Phase 1 — Foundation, master data, auth and config

**Goal.** A running Django project/app with Postgres + MinIO, authentication and roles, all master tables, the config row and the two bootstrap endpoints (`/me`, `/lookups`). No flag data yet.

**Read first.** Parts B and C of this document, then `src/types.ts` (Red Flag types) and the option lists in `RedFlagSheetForm.tsx` and `RedFlagActionModal.tsx` (these define the master values to seed).

**Build.**

1. Project setup per B1: add `redflag` to the existing SFC Django project if there is one, otherwise create it. Settings for Postgres, MinIO (`django-storages`), `Asia/Kolkata`, CORS allowlist, DRF defaults (camelCase renderer and parser, the `{success,data}` envelope renderer and the `{success:false,error,details}` exception handler, pagination), `drf-spectacular`, structured logging. Add `docker-compose.yml` (Postgres, MinIO with the `redflag-evidence` bucket created by a bootstrap command) and `.env.example`.
2. Authentication: reuse the project’s existing mechanism (session or JWT). `IsAuthenticated` is the default permission. Create the three groups in a data migration.
3. Models and migrations for everything in C1, Django admin for each, and `Employee.label`.
4. Permission layer in `permissions.py`: `user_roles(user)` and the classes `IsQualityCustodian`, `IsPlantHead`, `IsTargetPersonFor` (object-level). Unit-test them now; later phases only call them.
5. `RedFlagConfig` singleton with a cached `get_config()` (invalidated on save).
6. Management commands, both idempotent: `seed_redflag_masters` (departments and plants exactly as listed in C1, enums, config defaults – **no people, lines or stations are invented**) and `import_redflag_masters --employees|--lines|--stations|--models file.csv` (upsert by natural key, with template CSVs checked into the repo).
7. `GET /api/redflags/me` → `{ userId, employeeId, label, department, roles: ["Initiator", …], isPlantHead, isQualityCustodian }`.
8. `GET /api/redflags/lookups` → plants (with nested lines/stations and `defaultQuarantineLocation`), models, departments (with `canOriginate`/`canBeTarget`), employees (filterable `?department=&plant=`; **only fields needed for a picker**: id, label, department), enums as `{value,label}` (labels taken from `RedFlagSheetForm.tsx`), `config` (SLA minutes, bucket minutes, sustenance days, default target days, form number/revision/standard, governance rules).

**Do not.** Create flag models, put names, plants or thresholds in code, or expose email/phone in lookups.

**Acceptance.** `docker compose up` + `migrate` + `seed_redflag_masters` works from a clean checkout; the two seed commands are re-runnable without duplicates; `/me` and `/lookups` return the documented shapes for a logged-in user and 401 otherwise; permission unit tests pass; OpenAPI schema generates without warnings.

---

# Phase 2 — Core model, Stage 1 (raise), attachments, list/search/export

**Goal.** A flag can be raised with a real photo in MinIO, listed, searched, filtered, viewed, lightly edited, soft-deleted and exported.

**Read first.** Parts B and C; `RedFlagSheetForm.tsx` (`handleInitiatorSubmit`, Stage-1 state), `RedFlagSystem.tsx` (tracker filters, `exportToCSV`, `filteredFlags`), `src/types.ts` (`RedFlag`).

**Build.**

1. Models and migrations: `RedFlagSequence`, `RedFlag`, `Attachment`, `StageHistory`, `RedFlagAuditLog` (C2). Make `StageHistory` append-only at model and admin level.
2. Storage service `storage.py` per B5: validate (Pillow), re-encode/normalise orientation, strip EXIF GPS, cap dimensions, sha256, upload to MinIO, `presign(attachment)`. Endpoint `POST /api/redflags/attachments` (multipart: `file`, `kind`) → `{ id, url, kind }`, throttled per user. Management command `purge_orphan_attachments` (older than 24 h and unlinked).
3. Stage-1 write path in `services/raise_red_flag.py`: validate required fields (`description`, T0 `evidencePhoto`/`evidenceAttachmentId`, plant, line, station, model, type, severity, category5M, target department and person, qa custodian), resolve masters to FKs and fill snapshot names, default `qaCustodian` from the plant’s `default_qa_custodian` and `targetDate` from `config.default_target_days` **only when omitted**, take `raisedBy` from the logged-in employee (ignore any client value unless Plant Head), generate `srNo`/`redFlagNo` (B6) under a row lock, set the three statuses, write `StageHistory` (Detection) and an audit row, all in one transaction. Accept the legacy `data:` URL photo as described in B2.
4. Serializers: `RedFlagReadSerializer` producing the flat camelCase shape of `types.ts` (stage-2/3/closure/month fields are `null`/absent until those phases exist) with presigned photo URLs, `stageHistory[]`, `responsibleDepartment`, and an additive **`allowedActions`** array computed by `permissions.allowed_actions(user, flag)` (`editDetails`, `submitContainment`, … – later phases extend it so the UI never has to guess).
5. `GET /api/redflags` with `q` (number, description, raised-by, target person, line, station – trigram/`icontains`), `status`, `targetDepartment`, `raisedByDepartment`, `severity`, `category5M`, `defectType`, `plant`, `dateFrom`, `dateTo`, `stage` (`awaitingContainment` = status Open; `awaitingQuality` = status Contained and containment not Verified), `ordering` (default `-raisedAt`). Query-count test.
6. `GET /api/redflags/:id`, `PATCH /api/redflags/:id` (editable fields and who may edit them per B3; identity fields `raisedBy`/`raisedByDepartment` Plant Head only; `rowVersion` required; every change logged to `RedFlagAuditLog` as a diff), `DELETE /api/redflags/:id` (soft delete, Plant Head, reason required).
7. `GET /api/redflags/export.csv` honouring the same filters. Columns, in order: Sr No, Red Flag No, Raised Date, Raised By, Originating Dept, Target Dept, Target Person, Plant Area, Station, Model, Type, 5M Category, Severity, Description, Quarantined WIP, QA Custodian, Status, Sustenance Start, M1 Audit, M2 Audit, M3 Audit, Sustenance Achieved. UTF-8 with BOM, neutralise CSV formula injection (cells starting `= + - @`), filename `SFC_RedFlags_Master_{YYYY-MM-DD}.csv`.

**Do not.** Add a generic `PUT` that writes status, store base64 in the database, accept SVG, or let the client choose the flag number.

**Acceptance.** Two concurrent raises never produce the same number (test with threads); raising without a T0 photo returns 422; a stored photo opens through its presigned URL and expires after the TTL; list filters and search return the expected rows with a constant query count; PATCH with a stale `rowVersion` returns 409 and a permitted PATCH writes an audit diff; CSV opens in Excel with correct columns; non-Plant-Head DELETE returns 403.

---

# Phase 3 — Stage 2 containment and Stage 3 root cause / CAPA

**Goal.** A Target Person can contain and quarantine a flag with proof, then submit the 5-Why and permanent action, with every rule the UI implies enforced on the server.

**Read first.** Parts B and C; `RedFlagSheetForm.tsx` (`handleContainmentSubmit`, `handleRootCauseSubmit`, `computeTimeGapLabel`), the containment and RCA tabs of `RedFlagActionModal.tsx`, and Phase 2’s serializers and services.

**Build.**

1. Models and migrations: `RedFlagContainment`, `RedFlagRootCause` (C2), with the DB check constraints (`sorting_ok + sorting_rejected <= sorting_inspected`, non-negative counts) and the partial unique index on `is_current`.
2. `services/submit_containment.py` – `POST /api/redflags/:id/containment`. Body: `containedAt` (optional, default server now), `actionTakenBy` (employee id, default current user), `suspectQtyQuarantined`, `quarantineTagNo` (blank → `QT-{redFlagNo}`), `quarantineLocation` (required text; the UI may prefill from `Plant.defaultQuarantineLocation`), `sortingQtyInspected/Ok/Rejected`, `containmentAction` (required), `countermeasurePhoto` as `attachmentId` (kind T1, required) or legacy data URL. Rules: allowed only from `Open`; actor must satisfy the B3 target-person rule; `containedAt ≥ raisedAt`; computes `gap_minutes`; creates a new attempt (`attempt_no`+1, previous `is_current=false`); sets `status=Contained`; History event `CONTAINMENT_SUBMITTED`; audit row. The response also returns `containmentTimeGap` (existing label format via one shared helper), `containmentGapMinutes` and `containmentWithinSla` (compared with `config.containment_sla_minutes`).
3. `services/save_root_cause.py` – `PUT /api/redflags/:id/root-cause` (idempotent upsert). Body: `why1`–`why4` (optional), `rootCause5Why` (required), `systematicPermanentAction` (required), `standardizationUpdates{sopUpdated, pfmeaUpdated, controlPlanUpdated, onePointLessonIssued}`, `targetDate` (optional update). Rules: needs at least one containment attempt; allowed when status is `Contained` or `In-Progress`; after `Under-Sustenance` only Quality Custodian or Plant Head may amend (audit-logged); sets `status=In-Progress`; History event `RCA_SUBMITTED`. Per Decision 6 it does **not** set `qaCustodianStatus='CAPA Verified'`.
4. Extend `RedFlagReadSerializer`: flattened Stage-2 fields (`actionTakenBy`, `actionTakenDate`, `containmentTimestamp`, `containmentTimeGap`, `suspectQtyQuarantined`, `quarantineTagNo`, `quarantineLocation`, `sorting*`, `containmentAction`, `immediateActionTaken` as an alias of `containmentAction`, `countermeasurePhoto`, `containmentStatus`, `containmentVerifiedBy/Date`), Stage-3 fields (`why1`–`why4`, `rootCause5Why`, `systematicPermanentAction`, `standardizationUpdates`), and an additive `containmentAttempts[]` (history for audit). Extend `allowedActions` with `submitContainment` and `saveRootCause`.
5. Tests: each validation; gap maths across midnight and DST-free IST; resubmission after a rejection fixture; a user outside the target department gets 403; double-submit race returns 409/422 and never creates two current attempts.

**Do not.** Auto-fill sorting numbers (the dashboard’s ×3 / ×2 fallbacks must not exist server-side), return placeholder gap labels such as “18 mins”, or allow Stage 3 before Stage 2.

**Acceptance.** A flag raised in Phase 2 can be contained and given a root cause through the API only; every illegal order returns a clear 4xx; `GET /api/redflags/:id` returns the flat shape with all Stage-2/3 fields; stage history shows Detection → Containment → RootCause with the real actors.

---

# Phase 4 — Stage 4 quality verification, sustenance engine, closure

**Goal.** The Quality Custodian can approve or reject containment, verify CAPA and start the 90-day watch, log the 30/60/90 audits, and close the flag with sign-offs. This is the heart of the IATF rule, so it is built once, server-side.

**Read first.** Parts B and C and Decisions 1–4 and 6 in A6; `handleQualitySubmit` in `RedFlagSheetForm.tsx`; the sustenance tab, `updateMonthAudit`, `handleStartSustenance` and `handleSaveAll` in `RedFlagActionModal.tsx`; `handleVerifyContainment`, `handleStartSustenance`, `handleUpdateMonthAudit` in `RedFlagPresentationMode.tsx`; `/sustenance-check` in `server.ts`. These four places implement the same rules differently; the server replaces all of them.

**Build.**

1. Models and migrations: `SustenanceCheck`, `RedFlagClosure` (C2).
2. `POST /api/redflags/:id/containment/approve` (optional `notes`): current attempt → `Verified`, stamps verifier and time, `qaCustodianStatus='Containment Approved'`, History `CONTAINMENT_APPROVED`. Actor must be Quality Custodian/Plant Head and, unless Plant Head, not the person who submitted the containment.
3. `POST /api/redflags/:id/containment/reject` (`reason` required): attempt → `Rejected`, flag back to `Open`, `containmentStatus` derives to `Pending`, `qaCustodianStatus='Review Pending'`, History `CONTAINMENT_REJECTED` with the reason, so the Target Person must redo Stage 2.
4. `POST /api/redflags/:id/sustenance/start` (optional `notes`, optional `standardizationUpdates`): preconditions in B4; sets `sustenanceStartDate` to today (IST), creates three `SustenanceCheck` rows for the current cycle with `scheduledDate = start + config.sustenance_check_days[i]`, `qaCustodianStatus='In Sustenance'`, `status=Under-Sustenance`, History `CAPA_VERIFIED` then `SUSTENANCE_STARTED`. Starting twice in the same cycle returns 409.
5. `POST /api/redflags/:id/sustenance/checks/:month` (`status` Passed | Recurrence Detected; `observations`; optional `photoAttachmentId`; `auditDate` default today). Rules: flag must be `Under-Sustenance`; month 2 only after month 1 `Passed`, month 3 only after month 2; a logged check is immutable (Plant Head correction only, audit-logged); reject an audit earlier than `scheduledDate − grace` when `enforce_sustenance_schedule` is on; `Recurrence Detected` requires `observations`. Effects: `Passed` on all three → `sustenanceAchieved=true` (status stays `Under-Sustenance`, History `AUDIT_LOGGED`); `Recurrence Detected` → per Decision 3 (`In-Progress`, `sustenanceAchieved=false`, `qaCustodianStatus='Review Pending'`, History noting the cycle failed).
6. `POST /api/redflags/:id/close`. Body: `closureEvidence` (`attachmentId`, kind CLOSURE\_EVIDENCE, required), `validationTrialShifts`, `validationTrialResults`, `approvedByQa` (employee, default current Quality Custodian), `approvedByProduction` (employee who must be in `rf_plant_head`; default `plant.plant_head`), `closureDate` (default today), and for early closure `earlyClosureReason` (Plant Head only). Effects: `status=Closed`, `qaCustodianStatus='Closed Approved'`, `closed_early` set when applicable, History `CLOSED` (stage Effectiveness). Not allowed from any other status.
7. Extend the read serializer: `sustenanceStartDate`, `month1Check/month2Check/month3Check` for the current cycle in the existing `MonthSustenanceCheck` shape (`month`, `targetDays`, `scheduledDate`, `auditDate`, `auditor`, `status`, `observations`, `photoEvidence` URL) plus additive `isOverdue` and `daysToDue`; `sustenanceAchieved`, `closureDate`, `closureEvidence`, `validationTrialShifts/Results`, `approvedByQA`, `approvedByProduction`, `closedEarly`; extend `allowedActions` (`approveContainment`, `rejectContainment`, `startSustenance`, `logAudit:1|2|3`, `close`, `closeEarly`).
8. `GET /api/redflags/sustenance/due?withinDays=7` returning pending checks that are due or overdue (feeds the “Other” tab). Management command `redflag_sustenance_digest` that logs/lists due and overdue checks and calls the project’s existing notification hook if one exists; otherwise it only logs.
9. Tests: the complete lifecycle through the API; every illegal transition; audit order and the schedule toggle; recurrence then cycle 2; early-closure override and rejection for non-Plant-Head; segregation of duties; two simultaneous “approve” calls; `rowVersion` conflicts.

**Do not.** Close automatically when three audits pass, let `approvedByQA`/`approvedByProduction` be set to a default name that nobody actually signed, or let any client write `status`, `sustenanceAchieved` or `containmentStatus` directly.

**Acceptance.** One automated test drives a flag from raise to closed through HTTP only and then asserts the full `stageHistory` and audit log; recurrence correctly reopens work; the permission matrix test (every action × every role) passes; the same decisions can no longer be made by editing JSON.

---

# Phase 5 — Cross-module escalation (PPSR, Kaizen, 5S Red Tag)

**Goal.** The three escalation buttons create or link real records in the other modules, idempotently, without letting an escalation bypass the Red Flag stage gates.

**Read first.** Parts B and C; the Escalation tab of `RedFlagActionModal.tsx`; the three escalation routes in `server.ts` (lines \~2481–2632 at the commit I read) and the target create routes they feed: `POST /api/ppsrreports`, `POST /api/kaizens`, `POST /api/fives/redtags`.

**Build.**

1. Adapter interface in `services/escalation/`: `EscalationTarget.create_from_red_flag(flag, actor) -> (ref_id, ref_no)` with three implementations selected by settings: (a) **bridge** – server-to-server call to the existing Express create routes (URL and service credential from environment) so the record really appears in the PPSR/Kaizen/5S screens; (b) **native** – for any module that already has a Django app in the same project (for example the Kaizen backend, if it lives alongside this app), call its service layer directly; (c) **stub** – store the payload on `EscalationLink` with `state=PENDING_TARGET` and a reference from `RedFlagSequence` (`PPSR-{yyyy}-{nnn}`, `KZ-{yyyy}-{nnn}`, `RT-{yyyy}-{nnn}`). Default: bridge where configured, otherwise stub. Inspect the target routes and map to exactly the fields they accept.
2. Endpoints `POST /api/redflags/:id/escalate-ppsr`, `/convert-kaizen`, `/link-fives`. One `EscalationLink` per flag per module (unique constraint); a repeat call returns 200 with the existing link instead of creating a duplicate. Target creation and the link row are one unit: if the target call fails, nothing is linked and the response is 502 with a readable error.
3. Payload mapping (taken from the mock, with invented values removed):
   - **PPSR:** title `[RF Escalation] {redFlagNo}: {first 60 chars of description}…`; problem statement from line, station, description and the containment action; root-cause text from `rootCause5Why`, else the whys that exist, else blank; permanent action from `systematicPermanentAction`; target date = `flag.targetDate`, else today + `config.ppsr_default_days`; lead owner = closure responsibility; coach = `teamLeader`; CFT = target department.
   - **Kaizen:** title `Poka-Yoke: Eliminate {subType} ({redFlagNo})`; problem-before and counter-measure-after from root cause and permanent action; area, mini-factory (plant code), location and machine from line/plant/station; category `Safety` when the flag type is Safety, otherwise `Quality`; before/after photos from evidence and closure evidence. **Cost before/after/savings must be left empty**, not the mock’s fixed 3500 / 450 / 3050.
   - **5S Red Tag:** item category Material → Raw Material, Machine → Tooling / Jig, otherwise WIP / Suspect Lot; description from the flag; quantity = `suspectQtyQuarantined`; unit `pcs`; area and location found from line, station and plant; tagged by the target person/team leader; reason from sub-type or description; disposal deadline = `flag.targetDate`, else today + `config.red_tag_disposal_days`; photo = T0 evidence.
4. Gating rules (replacing the mock’s silent defaults): PPSR – any non-closed flag, but **escalation never changes the flag’s `status`** (the mock moved Open/Contained to In-Progress, skipping containment and RCA); Kaizen – requires `systematicPermanentAction` (else 422 “Submit root cause and permanent action first”); 5S – requires a containment on file with `suspectQtyQuarantined > 0` (else 422). Permissions per B3.
5. Read serializer: `linkedPpsrId/No`, `linkedKaizenId/No`, `linkedFiveSRedTagId/No` derived from `EscalationLink`; extend `allowedActions` (`escalatePpsr`, `convertKaizen`, `linkFiveS`); History events `ESCALATED` with the stage mapping in C3.
6. Tests: idempotency, target failure rollback, each gating rule, payload snapshot golden files, no cost fields in the Kaizen payload.

**Do not.** Fabricate numbers, owners or text when the source field is blank; write into the other modules’ tables from this app’s code; change flag status as a side effect.

**Acceptance.** Clicking each escalation twice creates exactly one record and one link; a failing target leaves the flag untouched; the linked numbers show on the flag and, with the bridge adapter, in the corresponding module screen.

---

# Phase 6 — Analytics, Presentation Mode and global-dashboard data

**Goal.** Every number on the Dashboard, the executive deck, Presentation Mode and the global dashboard/sidebar comes from one server-side definition, computed in SQL.

**Read first.** Parts B and C and Decision 5 in A6; `RedFlagDashboard.tsx` (all `useMemo` blocks and KPI strip), `presentationSlides` in `RedFlagSystem.tsx`, `RedFlagPresentationMode.tsx` (what each of the four stages displays), `GlobalDashboard.tsx` and the sidebar badge in `App.tsx`.

**Build.**

1. `selectors/analytics.py` using ORM aggregation (`Count`, `Avg`, `Sum`, `Window` for cumulative %) — no Python loops over the full table. A shared filter parser accepts `plant`, `originatorDept`, `targetDept`, `defectType`, `category5M`, `severity`, `status`, `dateFrom`, `dateTo` (IST dates on `raised_at`).
2. `GET /api/redflags/analytics/dashboard` returning these blocks:
   - `kpis`: `total`, `openCount` (status Open), `unresolvedCount` (not Closed), `containedCount`, `inProgressCount`, `underSustenanceCount`, `closedCount`, `closedSustainedCount`, `criticalCount`, `stage1PendingTarget` (Open), `stage2PendingQuality` (Contained, containment not Verified), `containmentVerifiedCount`, `containmentRatePct`, and linked counts per module.
   - `quarantine`: real sums of `suspectQtyQuarantined` and `sortingInspected/Ok/Rejected`. Nulls count as 0; **no ×3 / ×2 estimates**.
   - `timeGap`: `avgMinutes`, `completedCount`, `slaMinutes`, `slaCompliancePct`, buckets from `config.gap_bucket_minutes` plus `pending` (not yet contained). No synthetic gaps for old records.
   - `pareto5M`: all six categories ranked by count with `count`, `quarantined`, `pct`, `cumulativePct`; records without a category go to `Unclassified` instead of being counted as “Method”.
   - `defectTypes`, `departmentMatrix` (originator × target by department id, no string-prefix matching), `targetPersons` (top N with total, open, closed, average gap, within-SLA %), `stationHotspots` (top 6 with plant, line, station, count, open, quarantined and the **most frequent** 5M category — the current UI appears to take the first record’s category only), `sustenanceCohort` (for months 1–3: checked, passed, pass rate; overall success rate).
   - `drillRecords` in the `SfcStandardRecord` shape the drill board already uses (`id`, `code`, `title`, `level1`=plant code, `level2`=line, `level3`=5M category, `owner`=target person, `status` Completed/Open/In-Progress with Closed→Completed and Open→Open, `rawStatus`, `period`=raised date, `metricValue`=quarantined qty), capped at 5000 with a `truncated` flag.
3. `GET /api/redflags/analytics/executive` for the deck in `RedFlagSystem`: scorecard (total, open, in sustenance, closed and sustained, containment rate), the top active alerts with presigned evidence photos, the sustenance table (flags currently under sustenance with their three checks), the 5M breakdown, and an **accountability flow** of the top originator→target department pairs with counts and the most frequent sub-types (this replaces the four hand-written pairs and their descriptions).
4. `GET /api/redflags/analytics/summary` for the global dashboard and sidebar: `byStatus`, `openCount`, `unresolvedCount`, `closedCount`, `sidebarBadge` (Open + In-Progress, current meaning), and the module’s drill records.
5. `GET /api/redflags/:id/presentation` for Presentation Mode: the flat flag; four stage blocks each with `completed`, `actor`, `completedAt` (from `StageHistory`), the stage’s photos and fields; the queue (id, number, status, severity, short description) ordered like the tracker and honouring the same filters; and `allowedActions` for the caller.
6. Tests: seed a deterministic dataset and assert every block against hand-computed values; 10 000-row timing test (local target p95 < 300 ms per endpoint, adjust indexes if not); filters combine correctly; an empty dataset returns zeros and empty lists, not errors.

**Do not.** Add per-user personalisation, cache across different filters, or compute anything the frontend then recomputes differently.

**Acceptance.** The numbers in the API equal the numbers the old client-side code produces for the same data wherever the old code was correct, and differ only in the places listed above (no fake sorting, no first-record 5M, single closed/open definitions).

---

# Phase 7 — Hardening, documentation, demo data

**Goal.** The backend is safe to put in front of shop-floor users and easy to operate.

**Build.**

1. **Security review.** Anonymous → 401 and wrong role → 403 asserted on every endpoint (generated from the OpenAPI schema); object-level checks everywhere a UUID is accepted; throttling on `attachments`, `lookups` and the analytics endpoints; strict CORS allowlist, secure cookie/CSRF settings, security headers; file-upload tests with SVG, polyglot and oversized files; presigned URLs never logged; `lookups` exposes no contact details; audit and history tables cannot be updated or deleted via ORM helpers, API or admin.
2. **Data integrity.** Review DB constraints and indexes against real query plans; confirm migrations are reversible; enable MinIO bucket versioning; document Postgres and MinIO backup/restore and key rotation.
3. **Operations.** Request-id middleware, structured JSON logs, `/api/redflags/health` (database + MinIO), the daily `redflag_sustenance_digest` and `purge_orphan_attachments` commands with example cron/systemd entries.
4. **Docs.** README (setup, environment variables, roles and how to grant them, MinIO CORS, cron jobs), OpenAPI served at `/api/schema` with examples, and a short “adding a new enum value” guide.
5. **Demo data.** `seed_redflag_demo` (refuses to run unless `DEBUG` or `--force`) recreates the four records in `server.ts` **through the real services** so their history and audit rows are genuine, using generated PNG placeholders stamped “DEMO” (never SVG).
6. **Load and regression.** `seed_redflag_load_test` (10 000 flags) and a CI job that runs lint, tests and the permission-matrix test.

**Acceptance.** Security checklist green; CI green with ≥85% coverage on services and permissions; a new developer can follow the README to a working stack and run the full lifecycle test; demo seed produces records indistinguishable from real ones in the API.

---

# Phase 8 — Frontend integration

**Goal.** Replace the in-memory Express data layer for Red Flag with the Django API, keep the screens looking the same, and make the server’s decisions (roles, state, analytics) drive the UI. This and Phase 9 are the only phases that edit React code.

**Read first.** Parts B and C; the Phase 2–6 endpoint list; `src/App.tsx` (Red Flag handlers, \~lines 204–290), all six Red Flag components, `src/modules/RedFlagModule.tsx`, `src/utils/pdfExporter.ts`.

**Build.**

1. **API client** `src/api/redflags.ts`: typed functions for every endpoint, a fetch wrapper with credentials/CSRF, one `ApiError` class (status, message, field errors), no silent `catch`. Add the new additive fields to `src/types.ts` (`allowedActions`, `containmentGapMinutes`, `closedEarly`, `rowVersion`, id fields) without renaming anything existing.
2. **Express.** Remove the Red Flag routes, the `redFlags` seed array and the `svgRedFlag*` constants from `server.ts`; add a reverse proxy for `/api/redflags` to Django (credentials pass through). Leave every other module’s routes untouched; if Phase 5 uses the bridge adapter, keep the PPSR/Kaizen/5S create routes reachable by Django.
3. **Replace the generic update.** Introduce a `redFlagActions` object (via prop or context) and replace every `onUpdateRedFlag(id, partialFlag)` call site:
   - `RedFlagSheetForm`: `handleContainmentSubmit` → `submitContainment`; `handleRootCauseSubmit` → `saveRootCause`; `handleQualitySubmit` → `approveContainment` / `rejectContainment` / `startSustenance`.
   - `RedFlagActionModal`: `handleSaveAll` is split by tab — details → `patchRedFlag`, containment → `submitContainment`, RCA → `saveRootCause`; `handleStartSustenance` → `startSustenance`; `updateMonthAudit` → `logAudit(month)`; the close button → `closeRedFlag`. Delete the client-side `sustenanceAchieved` calculation and the `window.confirm` early-closure path (early closure becomes a Plant-Head-only dialog that requires a reason).
   - `RedFlagPresentationMode`: `handleVerifyContainment`, `handleStartSustenance`, `handleUpdateMonthAudit` → the same actions; **remove the auto-close** when three audits pass.
   - `RedFlagSystem`: delete → `deleteRedFlag(reason)`; CSV button → download from `export.csv` with the active filters. After every action replace the flag with the response; on 409 refetch and show a clear message; show server field errors inline.
4. **Roles.** Load `/me`. Remove the role dropdown from the header, form, modal and presentation (keep a dev-only “view as” behind `VITE_REDFLAG_DEV_ROLE_SWITCH`). Enable or hide buttons from each flag’s `allowedActions`; delete the `isInitiatorAuthorized/isTargetAuthorized/isQualityAuthorized` logic.
5. **Photos.** Convert camera/upload output to a `Blob`, `POST /attachments` immediately, keep the returned `id` and `url` in state, and send only `attachmentId`. The “photo is compulsory” checks test for an uploaded attachment, not for equality with a preset image. Add `crossOrigin="anonymous"` to evidence `<img>` tags and `useCORS: true` in `pdfExporter.ts`; verify the Presentation PDF and the print sheet render MinIO images.
6. **Tracker.** Send search and filters to the server (debounced) with a pager (page size 50) instead of loading everything and filtering in the browser; keep the table/cards toggle.
7. **Analytics.** Dashboard, the executive deck, Presentation Mode and the global dashboard/sidebar fetch their blocks from the Phase 6 endpoints; delete the duplicated `useMemo` calculations (keep the visual components and their props).
8. Loading, empty and error states for each screen; no `alert()` for success or failure.

**Do not.** Change styling or layout, rename existing type fields, touch other modules’ components, or keep any parallel client-side copy of a server rule.

**Acceptance.** `npm run lint` (tsc) passes; a scripted manual walkthrough (raise → contain → RCA → approve → start sustenance → three audits → close, plus a rejection and a recurrence) works end to end with data surviving a refresh and visible from a second browser; a user without the Quality Custodian role sees no QA buttons and gets 403 if the call is forced; the network log shows no base64 photos; PDF export and print work with MinIO images.

---

# Phase 9 — Remove hardcoded values, then re-scan

**Goal.** No business value is typed into the Red Flag code any more: people, plants, lines, departments, option lists, thresholds, durations, form metadata, defaults, sample photos and “pretend” fallback text all come from the API (masters, config, server rules) or are removed. Then the agent proves it with a second, independent scan.

**What counts as hardcoded.** *Not allowed:* names of people, plants, lines, stations, models, departments; threshold or duration numbers (SLA, 30/60/90, +5/+7/+14 days); form number, revision and standard references; default field values that look like real data; sample photos; fallback strings that pretend to be data (“1h 15m gap”, “Suresh Kumar”). *Allowed:* UI chrome (headings, button captions, tooltips, help text), icon names and Tailwind classes, enum **codes** referenced through the shared types (the labels still come from `/lookups`), and test fixtures.

## 9.1 Hardcoded values found in the repo (commit `ca4154e`)

Line numbers are pointers, not a substitute for the scan in 9.3.

| # | What | Where | Replace with |
| --- | --- | --- | --- |
| H1 | QA custodian name “Suresh Kumar (QA Lead / QA / QA Custodian)” used as default, fallback, `currentPersona` default and placeholder | `RedFlagActionModal` 51, 69, 80, 793 · `RedFlagPresentationMode` 191, 229, 244, 331, 1095, 1118 · `RedFlagPrintSheet` 105, 310 · `RedFlagSheetForm` 167, 201, 232 · `RedFlagSystem` 148, 367, 756, 1063, 1209 · `server.ts` custodian/closure defaults | The flag’s own `qaCustodian`; plant’s `defaultQaCustodian` when raising; “—” when unknown |
| H2 | Plant Head “Amit Mehta (Plant Head)” as pre-filled approver | `RedFlagActionModal` 209, 1308 · `RedFlagPresentationMode` 1125 · `RedFlagPrintSheet` 318 | `approvedByProduction` from the server (`plant.plantHead` as the picker default only) |
| H3 | Pre-filled form state: “Rajesh Patil (Shift In-charge)”, role “Shift In-charge”, department Production/Maintenance, “Vikram Singh …”, MF1, “Vacuum Pump Line A (Pune)”, “VP-200 / VP-350”, “Torqueing Station ST-4”, type/sub-type “Torque Slippage & Calibration”, severity, 5M, +5-day target date, quarantine location “MF1 Red Hold Quarantine Bay”, “Vikram Singh (Target Lead)” | `RedFlagSheetForm` 146–170, 207, 264–284 and the matching `placeholder="e.g. Vikram Singh …"` in the form (830) and modal (720) | Empty selects (“Select…”); raiser from `/me`; target date from `config.defaultTargetDays`; quarantine location from `plant.defaultQuarantineLocation`; neutral placeholders |
| H4 | Demo presets and sample images: `presetRedFlagImages` (SVG data URLs), `loadInitiatorPreset`, `loadContainmentPreset`, `loadRcaPreset`, their buttons, and the logic that treats “photo equals the generic preset” as “missing” | `RedFlagSheetForm` 41–49, 248–322, 726–737, 1172, 1333 and the two `is*PhotoMissing` checks | Delete. Photo presence = an uploaded attachment. Dev convenience, if still wanted, lives in `seed_redflag_demo` (Phase 7) or behind `import.meta.env.DEV` in a file excluded from production builds |
| H5 | Fake fallback values: `'1h 15m (Logged)'`, `'18 mins'`; raised time `" 08:30"`; `'1h 15m gap'`, `'Gap: 1h 15m'`; dashboard gap fallbacks 42 / 75 / 95 min by severity; sorting estimates ×3 / ×2 / ×1 | `RedFlagSheetForm` 57, 61, 409, 1105 and the ×3/×2 pre-fill in its flag-sync effect · `RedFlagActionModal` 84, 86, 660 · `RedFlagPresentationMode` 677 · `RedFlagSystem` 1041 · `RedFlagDashboard` (`parseTimeGapMinutes`, sorting totals) | Server values (`raisedTimestamp`, `containmentTimeGap`, `containmentGapMinutes`, real sorting counts); “—” or “Pending containment” when absent |
| H6 | Option lists typed in five places and inconsistent: origin and target departments (form 780–785, 815–820; modal 476–482, 499–504; dashboard `departments`), MF list with descriptions (form 855–857), type / 5M / severity (form 900–932; modal 559–591; dashboard `types` and Pareto arrays), role options (modal 409–412, presentation 550–553, form, system), severity filter containing “Minor (Observation)” (`RedFlagSystem` 901), deck 5M list missing “Environment” | the files listed | `/lookups` (departments with `canOriginate`/`canBeTarget`, plants with lines and stations, enums with labels); roles from `/me` |
| H7 | Thresholds and durations: “<2h” SLA text, SLA buckets 30/60/120, sustenance offsets 30/60/90 days (`* 24 * 60 * 60 * 1000`), 90-day wording | SLA text: `RedFlagSystem` 218, `RedFlagActionModal` 652, `RedFlagPrintSheet` 147, `RedFlagPresentationMode` 753, `RedFlagDashboard` 818 and its bucket labels · offsets: `handleQualitySubmit` (form), `handleStartSustenance` (modal and presentation), `server.ts` | `config.containmentSlaMinutes`, `config.gapBucketMinutes`, `config.sustenanceCheckDays` (and wording built from them); scheduled dates come from the server |
| H8 | Form and standard metadata: “SFC/QA/RF-01”, “Rev. 03”, “IATF 16949:2016 Cl. 10.2”, header chips | `RedFlagPrintSheet` 19, 53, 328 · `RedFlagSystem` header chip and 1144 · `RedFlagSheetForm` header · modal sustenance copy | `config.formNumber`, `formRevision`, `standardReference` |
| H9 | Static analytics content: the four hand-written “Accountability Flow” pairs with descriptions, the “Mandatory Governance Rules” text, the 5M list, `slice(0, 6)` / `slice(0, 4)` caps, “<2h Containment SLA” label | `presentationSlides` in `RedFlagSystem` | Phase 6 `analytics/executive` and `config.governanceRules` |
| H10 | Role defaults: `useState<RedFlagRole>('Initiator')`, `currentRole = 'Quality Custodian'` defaults, `currentPersona = 'Suresh Kumar (QA Lead)'` | `RedFlagSystem`, `RedFlagActionModal`, `RedFlagPresentationMode`, `RedFlagSheetForm` | `/me` and `allowedActions` |
| H11 | Silent data fallbacks, \~30 of the form \`x |  | 'Production'` ,  ` |
| H12 | Mock server data: four seeded records, three `svgRedFlag*` constants, defaults (“Shop Floor Operator”, “MF1”, “Main Line”, “Standard”, “Station 1”, “Shift Lead”), invented escalation values (cost 3500 / 450 / 3050, “Plant QA Coach”, “Lead Engineer”, “QA Specialist”, “Kaizen Lead”, “CFT Lead”, “5S Champion”, “Quality Improvement Circle”) | `server.ts` \~769–1130 and \~2273–2632 | Removed in Phase 8; Phase 5 payload rules; Phase 7 demo seed |
| H13 | Divergent KPI definitions of “closed” and “open” | `RedFlagSystem`, `RedFlagDashboard`, `GlobalDashboard`, `App.tsx` badge | Single server definitions (Decision 5) |

## 9.2 Removal steps

1. Work through H1–H13 in order, one commit per row, each commit message naming the row. Where a replacement needs a lookup or config key that does not exist yet, add it to the backend (`/lookups`, `RedFlagConfig`) first, with a migration and a test.
2. Add a typed `useRedFlagLookups()` hook (loaded once, cached) that every dropdown, filter and label reads from; delete all local option arrays.
3. Make sure the production bundle contains none of the removed strings (build, then search the bundle for the names and numbers in 9.1).
4. Backend side: confirm `redflag/` contains no person names, plant codes, department names or threshold literals outside migrations/seed commands/tests.

## 9.3 Second scan (do this after 9.2, independently of 9.1)

**Do not rely on the table above.** Scan the whole Red Flag project again as if the table did not exist:

- **Scope:** `RedFlagActionModal`, `RedFlagDashboard`, `RedFlagPresentationMode`, `RedFlagPrintSheet`, `RedFlagSheetForm`, `RedFlagSystem`, `src/modules/RedFlagModule.tsx`, `src/api/redflags.ts`, the Red Flag parts of `App.tsx`, `GlobalDashboard.tsx` and `Sidebar.tsx`, the Red Flag parts of any shared component they use (`CameraModal`, `PresentationModeView`, `SfcPowerBiShared`, `pdfExporter`), and the whole Django `redflag` app.
- **Automated pass (commit it as `scripts/redflag-hardcode-scan.sh`):** run `rg -n` for each of: person-like strings in the form `Name Surname (Role)`; `MF[0-9]|Pune|Chakan|VP-|ST-[0-9]|HP-[0-9]|TW-[0-9]`; `\|\| ?['"][^'"]+['"]`; literal `<option`; `useState\(['"][^'"]+['"]\)`; time arithmetic such as `\* ?(24|60|1000)` and `getTime\(\) ?\+`; day/hour/minute thresholds near `SLA|days|hours|mins`; `data:image/svg`; `SFC/QA|Rev\.? ?0?3|IATF`; `placeholder="e\.g\.`; static arrays of business words (`\['Quality'`, `\['Production'`, `\['Method'`); numeric default props.
- **Manual pass:** read every file in scope top to bottom, because some hardcodes are not greppable (inline JSX text that is really data, ternaries that pick a name, `slice(n)` caps, object literals used as lookup tables).
- **Report:** write `docs/redflag-hardcode-scan.md` listing every remaining hit as `file:line | snippet | classification`, where the classification is *Removed*, *Allowed UI text* (with a one-line reason) or *Needs decision*. Include the hit counts of the first run (before 9.2) and the second run (after).
- **Fix loop:** anything classified *Needs decision* is either removed or listed for me with the options; then re-run the scan until the count of unexplained hits is zero.

**Acceptance.** The report exists with zero *Needs decision* rows; the production bundle and the `redflag` Django app contain none of the business strings listed in 9.1; creating a new plant, department, line, station or QA custodian in the admin makes it appear in the Red Flag screens without a code change; changing the SLA minutes or the sustenance days in `RedFlagConfig` changes the UI wording, the analytics buckets and the scheduled audit dates without a deploy; `npm run lint`, the backend test suite and the full lifecycle walkthrough still pass.
