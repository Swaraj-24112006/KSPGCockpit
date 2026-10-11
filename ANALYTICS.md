# Kaizen Analytics — Discovery & Architectural Reference (`ANALYTICS.md`)

*Date: October 11, 2026*  
*Document Status: Complete & Verified Implementation Reference*

---

## 1. Field Map for Kaizen Model

| Logical Metric Field | Database Field on `Kaizen` | Data Type | Notes / Nullability |
| :--- | :--- | :--- | :--- |
| **Status** | `status` | `CharField(max_length=20)` | `choices=STATUS_CHOICES`. Values in DB: `'submitted'`, `'approved'`, `'draft'`, `'closed'`, `'good_point'` |
| **Classification** | `classification` | `CharField(max_length=20)` | `choices=CLASSIFICATION_CHOICES`. Values in DB: `'pending'`, `'kaizen'`, `'good_point'` |
| **Cost Saving** | `cost_save` | `DecimalField(max_digits=15, decimal_places=2)` | Default: `0.00`. Formatted as ₹ / year |
| **Suggestion Date** | `suggestion_date` | `DateField` | Default: `localdate`. Zero nulls in database |
| **Month String** | `month` | `CharField(max_length=20)` | Text field (e.g. `'September'`) |
| **Created At** | `created_at` | `DateTimeField` | Auto now add |
| **Updated At** | `updated_at` | `DateTimeField` | Auto now |
| **Submitted At** | `submitted_at` | `DateTimeField` | Nullable timestamp |
| **Decision / Closure Date** | `implementation_date`, `closing_target_date`, `impact_assessment.closure_date`, `updated_at` | `DateField` / `DateTimeField` | Closures tracked on `impact_assessment` or `updated_at` |
| **Mini-Factory / Department** | `mini_factory` | `CharField(max_length=100)` | Text strings: `'MF1'`, `'MF-1'`, `'MF2'`, `'MF-2'`, `'MF3'`, `'Machining'` |
| **Idea By** | `idea_by` | `CharField(max_length=200)` | Free text operator/initiator name |
| **Implemented By** | `implemented_by` | `CharField(max_length=200)` | Free text implementer name |
| **Prepared By** | `prepared_by` | `CharField(max_length=200)` | Free text preparer name |
| **Benefits (PQCDSM)** | `KaizenBenefit` model (OneToOne: `kaizen.benefits`) | `BooleanFields`: `productivity`, `quality`, `cost`, `delivery`, `safety`, `morale` | 6 booleans with aliases `p`, `q`, `c`, `d`, `s`, `m` |

---

## 2. Real Values in the Database

### Status Distribution (`status` on `Kaizen`):
| Stored Value | Count | Group in Phase 1 | Status in UI | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `submitted` | 18 | `OPEN` | Open | Active review queue awaiting committee |
| `pending` | 0 | `OPEN` | Open | Alias in choices |
| `approved` | 2 | `CLOSED` | Closed | Approved standard |
| `good_point` | 1 | `CLOSED` | Closed | Standardized as Good Point practice |
| `closed` | 1 | `CLOSED` | Closed | Final closure verified |
| `draft` | 5 | *Excluded from analytics* | Draft | Private initiator drafts (not yet submitted) |
| `rejected` | 0 | `REJECTED` | Reject | Not approved |
| `rework` | 0 | `OPEN` | Open | Returned to initiator for rework |

*Status Coverage:*
- `CLOSED` group: `['approved', 'good_point', 'closed', 'Approved', 'Good Point', 'Closed']`
- `OPEN` group: `['submitted', 'pending', 'rework', 'Submitted', 'Pending']`
- `REJECTED` group: `['rejected', 'Rejected']`
- `draft` is excluded from live reporting across all executive/dashboard totals.

### Classification Distribution (`classification` on `Kaizen`):
| Stored Value | Count | Executive Type Slicer Mapping |
| :--- | :--- | :--- |
| `pending` | 23 | Not yet classified |
| `kaizen` | 2 | Maps to `Kaizen` |
| `good_point` | 2 | Maps to `Kaizen` (or Idea based on filter) |
| `none` | 0 | Unclassified |

### Mini-Factory Distribution (`mini_factory` on `Kaizen`):
| Stored Value | Count | Normalized Department Code | Normalized Display Name |
| :--- | :--- | :--- | :--- |
| `'MF1'` | 13 | `MF1` | MF 1 (Vacuum & Oil Pump) |
| `'MF-1'` | 2 | `MF1` | MF 1 (Vacuum & Oil Pump) |
| `'MF2'` | 4 | `MF2` | MF 2 (All types of EGR) |
| `'MF-2'` | 1 | `MF2` | MF 2 (All types of EGR) |
| `'MF3'` | 1 | `MF3` | MF 3 (BPV) |
| `'Machining'` | 6 | `MC` | MC (Machining, Milling & Grinder) |
| *(Maintenance, QA, NCM, OTH)* | 0 | `Maintenance`, `QA`, `NCM`, `OTH` | Pre-seeded with 0 counts |

---

## 3. Date Reality
- The `Kaizen` model possesses a native `suggestion_date = models.DateField(default=localdate)`.
- Database audit:
  - Total records: 27
  - Null `suggestion_date` records: 0
  - Date span: `2024-06-12` to `2026-09-10`.
- All timestamps (`created_at`, `updated_at`, `submitted_at`) are timezone-aware and evaluated in `Asia/Kolkata` (`TIME_ZONE = 'Asia/Kolkata'`).
- No backfill migration is necessary because `suggestion_date` is already completely populated.

---

## 4. Frontend Facts
- **Data Fetching Pattern:** The frontend uses `authFetch` (`Frontend/src/shared/utils/auth.ts`) which wraps `fetch()`, transmits `Authorization: Bearer <token>`, passes `credentials: 'include'` for HttpOnly cookies, and auto-refreshes tokens upon 401.
- **Client State / Cache:** Custom lightweight hooks in `Frontend/src/dashboard/hooks/useAnalytics.ts` with `setInterval(60000)`, window focus refetch, and `AbortController` provide periodic 60s background freshness and immediate window-focus refetches.
- **Formatting Utilities:**
  - `formatIndianRupees(val)` in `Frontend/src/utils.ts` formats money as `₹X,XX,XXX`.
  - `formatIndianRupeesCompact(val)` formats compact figures (e.g. `₹1.5 Lakh`).
- **Rendering conventions:** `djangorestframework_camel_case` renders backend snake_case model fields as camelCase in the API response.

---

## 5. Backend Conventions
- **Framework:** Django REST Framework (DRF) 3.14+.
- **Authentication:** `rest_framework_simplejwt.authentication.JWTAuthentication`.
- **Permissions:** `AllowAny` in dev / `IsAuthenticated` with RBAC role backstops.
- **URL Layout:** Both `api/v1/kaizen/analytics/` and `api/kaizen/analytics/` routes are supported.
- **Testing Framework:** Standard `django.test.TestCase` / `rest_framework.test.APITestCase` run via `python manage.py test`.

---

## 6. People Data & Leaderboard Logic
- `accounts.CustomUser` stores system users with `employee_id`, `department`, `mini_factory`, and names.
- `Kaizen.created_by` is a ForeignKey to `CustomUser`.
- `Kaizen.idea_by`, `implemented_by`, and `prepared_by` are `CharField` entries populated on the shop floor.
- Contributor identity resolves strictly to `Lower(Trim('idea_by'))` with title casing displayed.
- Fallbacks to implementer or preparer were removed to prevent incorrect attribution.
- Kaizens with empty/blank `idea_by` are excluded from personal contributor ranks and tracked once as `unassigned` with their total count and savings.

---

## 7. Deviations & Implementation Notes

| Item | Plan Spec | Implementation Reality / Resolution |
| :--- | :--- | :--- |
| **Status strings** | `['Approved', 'Good Point']` | Stored in PostgreSQL in lowercase (`'approved'`, `'good_point'`, `'closed'`, `'submitted'`, `'pending'`, `'rejected'`). `STATUS_GROUPS` handles both lowercase and TitleCase so all database rows map accurately. |
| **Department naming** | `'Machining'` vs `'MC'` | `'Machining'` is mapped to department code `'MC'` with display name `'MC'` and description `'Machining, Milling & Grinder'`. |
| **TanStack Query** | Optional in plan | Not in `package.json`; custom polling hooks with `AbortController` and 60-second timer are implemented. |
| **URL Prefix** | `GET /api/kaizen/analytics/...` | Both `/api/kaizen/analytics/...` and `/api/v1/kaizen/analytics/...` are mapped to avoid 404s across frontend variants. |
| **Percentage precision** | Floating-point pct | Computed to 2 decimal places in backend responses (`round(..., 2)`), rendered and rounded to integers in UI badges/charts. |

---

## 8. Management Commands

1. **Import History / Seed Reference Data:**
   ```bash
   python manage.py import_kaizen_history
   ```
   - Seeds standard 8 plant departments (`MF1`, `MF2`, `MF3`, `MC`, `QA`, `Maintenance`, `OTH`, `NCM`).
   - Normalizes existing Kaizen `mini_factory` strings.
   - Seeds `LegacyYearlySummary` benchmark numbers for 2021–2024.
   - Seeds `AnnualHeadcount` targets for 2021–2026.

2. **Report Duplicate Contributors:**
   ```bash
   python manage.py report_duplicate_contributors
   ```
   - Scans and reports case/spacing variations in `idea_by` for operator record hygiene.

---

## 9. Final Acceptance Checklist

- [x] `ANALYTICS.md` exists with the field map, real status and department values, final definitions and deviations.
- [x] Phase 1 models, constants, filter parser, indexes and the two management commands are merged, with tests.
- [x] No number on any of the three components comes from a literal in the component. With an empty database every widget shows zero or an empty state.
- [x] Creating, editing or deciding a kaizen changes all three components within one refresh cycle (`triggerAnalyticsInvalidation()` dispatched).
- [x] A direct SQL count in PostgreSQL matches the total, Closed count and savings on every component for the same filters.
- [x] The dashboard's ROI card, its Top Financial Value list, the board's savings charts and the leaderboard's savings all use Closed kaizens only and agree.
- [x] Every executive-board slicer changes the charts it should (Section 5 table) and nothing else.
- [x] Chart axes, bars, trend lines and donut arcs are computed dynamically from data via `chartPrimitives.ts`.
- [x] The leaderboard ranks idea owners only. Search does not change ranks, and a row click opens the kaizen from the board.
- [x] Only one `EmployeeKaizenChart` is rendered on the page (in `ExecutiveAnalyticsBoard.tsx`, dark mode).
- [x] The golden-fixture test and the cross-endpoint reconciliation test pass in CI (`tests_analytics_live.py`).
- [x] Linter and TypeScript compile pass with zero errors (`npx tsc --noEmit` & `npm run build`).
