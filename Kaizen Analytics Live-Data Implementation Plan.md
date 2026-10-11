# Kaizen Analytics: Live-Data Implementation Plan

Oct 11, 2026 · @Swaraj

## 1. Objective and ground rules

Replace every hardcoded or browser-computed number on the three Kaizen dashboard components with live PostgreSQL data, served by three endpoints that share one set of definitions.

| Frontend file | Endpoint | Today |
| --- | --- | --- |
| `Dashboard.tsx` | `GET /api/kaizen/analytics/dashboard/` | Computed in the browser from `kaizens[]`; the trend chart shows fake fallback values |
| `ExecutiveAnalyticsBoard.tsx` | `GET /api/kaizen/analytics/executive/` | 100% hardcoded benchmark arrays; the slicers change nothing |
| `EmployeeKaizenChart.tsx` | `GET /api/kaizen/analytics/employees/` | Computed in the browser; ranks people by free-text name |

Ground rules for the agent:

1. Work in phase order. Phase 1 blocks everything after it.
2. Compute in the database with aggregates (`Count(filter=Q)`, `Sum`, `ExtractYear`, `ExtractMonth`). The frontend only formats and renders.
3. Never show a placeholder or fallback number. An empty database renders zeros or an empty state.
4. Money is `Decimal` in the backend and formatted with `formatIndianRupees` in the UI. Time zone is `Asia/Kolkata`.
5. Keep the existing look, layout and dark theme. Only the data source and the chart geometry change.
6. Reuse the project's existing auth, permission classes, router and serializer conventions.
7. Status groups and department names live in one place. Every endpoint imports them.
8. Where real field names differ from the ones used here, use the real ones and record the mapping in `ANALYTICS.md`.
9. Where this plan conflicts with the code, make the smallest sensible choice and record it under "Deviations" in `ANALYTICS.md`.

## 2. Phase 0: Discovery (read-only)

Before changing any code, produce `ANALYTICS.md` in the repo root. Do not start Phase 1 until its first two items exist.

1. **Field map** for the Kaizen model: status, `cost_save`, suggestion date (and its type), created-at, decision or approval date, classification (Kaizen or Idea), minifactory or department, idea-by, implemented-by, prepared-by, and the six PQCDSM benefit flags (six booleans or one JSON field).
2. **Real values in the database:** distinct `status`, `classification` and department strings, each with a count. Flag any value the Phase 1 groups do not cover.
3. **Date reality:** if the model has only a text `month` and no real date, add a migration that backfills a proper date field before any analytics work.
4. **Frontend facts:** how `kaizens` are fetched today, the `Kaizen` type in `types.ts`, the API client and auth pattern, the `utils` formatters, and whether TanStack Query or Recharts is already in `package.json`.
5. **Backend conventions:** DRF or plain Django, URL router layout, permission classes, serializer style, test framework.
6. **People data:** whether an Employee table exists, and whether `idea_by` is free text or a foreign key.
7. A **Deviations** section that stays open for the rest of the work.

The three components currently disagree on definitions. Phase 0 must confirm the real status and department values so that the decisions in section 10 can be applied.

## 3. Phase 1: Shared foundation

All three endpoints and all three components depend on this phase, so finish it, with tests, before starting Phase 2.

### Backend foundation

1. **Status groups** in `kaizen/analytics/constants.py`. Make `status` a model `choices` field and add a test that every status belongs to exactly one group, so nothing silently drops out of a column.

```python
CLOSED   = ["Approved", "Good Point"]   # shown as "Closed" on the executive board
OPEN     = ["Pending"]                  # shown as "Open"
REJECTED = ["Rejected"]                 # shown as "Reject" (confirm the real value in Phase 0)
STATUS_GROUPS = {"Closed": CLOSED, "Open": OPEN, "Reject": REJECTED}
```

2. **`Department` reference table** (`code`, `display_name`, `description`, `color`, `sort_order`). Seed these eight: MF1 ("MF 1", Vacuum & Oil Pump), MF2 ("MF 2", All types of EGR), MF3 ("MF 3", BPV), MC (Machining, Milling & Grinder), Maintenance, QA, NCM, OTH. Migrate existing minifactory strings to it. A missing department stays unassigned and is never defaulted to MF1.
3. **`AnnualHeadcount`** (`year` unique, `headcount`), editable in Django admin. It feeds "kaizens per employee".
4. **`LegacyYearlySummary`** (`year`, `kaizens`, `savings`, `headcount`) and a management command `import_kaizen_history` that loads it from CSV. Live data wins for any year that has live rows. The seed below comes from the benchmark images in the current board. Headcounts are implied by the benchmark ratios and must be replaced with real values.

| Year | Kaizens | Savings (₹) | Implied headcount |
| --- | --- | --- | --- |
| 2021 | 360 | 658071 | 319 |
| 2022 | 379 | 710238 | 332 |
| 2023 | 442 | 834458 | 375 |
| 2024 | 441 | 896448 | 329 |

5. **Shared filter parser.** One serializer or dataclass `AnalyticsFilters` (`year`, `month`, `type`, `status`, `dept`, `sort`) that returns 400 on unknown values, plus `apply_slicers(qs, f)` used by the executive and employee endpoints.
6. **Indexes:** `suggestion_date`, `status`, `(minifactory, status)`, `classification`, and `Lower(Trim(idea_by))` if `idea_by` is free text.
7. **Data-quality command** `report_duplicate_contributors` that lists names that collapse to the same normalized key or differ by a small edit, so an admin can merge them.

### Frontend foundation

1. **Types** in `types.ts`: `AnalyticsFilters`, `DashboardAnalytics`, `ExecutiveAnalytics`, `EmployeeLeaderboard`, matching the response shapes in Phases 2 to 4. Use camelCase keys, as the existing `Kaizen` type does.
2. **API client** `api/analytics.ts` with one function per endpoint, using the existing auth.
3. **Hooks** `useDashboardAnalytics`, `useExecutiveAnalytics`, `useEmployeeLeaderboard`. Refetch every 60 seconds and on window focus, keep the previous data on screen while filters change, and invalidate after any kaizen create, update or decision. Use TanStack Query if it is installed. Otherwise write one small hook with `setInterval` and an abort controller.
4. **Chart primitives** in `components/charts/`, so no chart contains typed-in coordinates:

```ts
export const niceMax = (v: number) => {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

const C = 2 * Math.PI * 38;                 // donut circumference at r = 38
export function donutArcs(values: number[]) {
  const total = values.reduce((a, b) => a + b, 0);
  let acc = 0;
  return values.map(v => {
    const len = total ? (v / total) * C : 0;
    const arc = { len, gap: C - len, offset: -acc };  // strokeDasharray=`${len} ${gap}`, strokeDashoffset=offset
    acc += len;
    return arc;
  });
}
```

Also provide a line-path builder, a linear bar scale, and axis ticks derived from `niceMax`. Every donut starts at the same angle (`rotate(-90 50 50)`).

5. **Shared UI states:** loading skeleton, error with retry, empty state, and an "Updated hh:mm" label from `generatedAt`.

## 4. Phase 2: Dashboard endpoint and `Dashboard.tsx`

`GET /api/kaizen/analytics/dashboard/` returns every number the main dashboard shows. Optional params: `from`, `to` (ISO dates, default the current calendar year), `minifactory`, `status`.

### Metric definitions

| Metric | Definition |
| --- | --- |
| `total` | Kaizens in the window |
| `pending`, `approved`, `rejected` | Counts by the Open, Closed and Reject status groups |
| `approvalRate` | approved ÷ (approved + rejected). `null` when the denominator is 0 |
| `totalSavings` | `SUM(cost_save)` over Closed kaizens only, treated as ₹ per year |
| `monthlyTrend` | Count per calendar month in the window, zero-filled, as `{month: "2026-08", label: "Aug 2026", count}` |
| `pqcdsm` | For P, Q, C, D, S, M: `count` of kaizens with that benefit and `pct` = count ÷ total. A kaizen can tick several, so the shares do not sum to 100 |
| `byMinifactory` | Count and `pct` per department, zero-filled for every known department |
| `topSavings` | Closed kaizens ordered by savings descending, limit 4 |
| `pending` | Pending kaizens, oldest first |
| `recentApprovals` | Closed kaizens ordered by decision date descending, limit 4 |

### Response shape

```json
{
  "scope": {"from": "2026-01-01", "to": "2026-10-11", "minifactory": null},
  "summary": {"total": 42, "pending": 9, "approved": 28, "rejected": 5,
              "approvalRate": 0.85, "totalSavings": 1250000.00},
  "monthlyTrend": [{"month": "2026-08", "label": "Aug 2026", "count": 6}],
  "pqcdsm": [{"key": "P", "name": "Productivity", "count": 20, "pct": 47.6}],
  "byMinifactory": [{"code": "MF1", "description": "Vacuum & Oil Pump", "count": 12, "pct": 28.6}],
  "topSavings": [], "pending": [], "recentApprovals": [],
  "generatedAt": "2026-10-11T10:00:00+05:30"
}
```

The list items use the same camelCase fields as the existing `Kaizen` type (`id`, `srNo`, `title`, `ideaBy`, `minifactory`, `costSave`, `classification`, `suggestionDate`, `month`), so `onSelectKaizen` keeps working.

### Backend

```python
def dashboard_summary(qs):
    return qs.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status__in=OPEN)),
        approved=Count("id", filter=Q(status__in=CLOSED)),
        rejected=Count("id", filter=Q(status__in=REJECTED)),
        total_savings=Coalesce(Sum("cost_save", filter=Q(status__in=CLOSED)), Decimal("0")),
        p=Count("id", filter=Q(benefit_p=True)),   # adapt if benefits is a JSONField
        q=Count("id", filter=Q(benefit_q=True)),
        c=Count("id", filter=Q(benefit_c=True)),
        d=Count("id", filter=Q(benefit_d=True)),
        s=Count("id", filter=Q(benefit_s=True)),
        m=Count("id", filter=Q(benefit_m=True)),
    )
```

Build `monthlyTrend` with `TruncMonth` (pass `tzinfo=ZoneInfo("Asia/Kolkata")` if the date is a `DateTimeField`) and zero-fill the whole window in Python. Use `select_related` on the list queries so each list is one query. Use date range filters, not `__year`, so the date index is used.

### Frontend changes in `Dashboard.tsx`

1. Replace `totalLogged`, `pendingKaizens`, `approvedKaizens`, `totalSavings`, `minifactoryCounts`, `benefitsCounts` and `monthCounts` with fields from `useDashboardAnalytics`.
2. Rebuild the monthly trend chart from `monthlyTrend`. Delete the `|| 3` and `|| 1` fallbacks and the hardcoded May, June and July. Derive the y-axis from `niceMax`, and label x positions from the response.
3. Remove the 5% minimum bar width on the PQCDSM bars, so a zero count draws as zero.
4. Render the four department rows from `byMinifactory`, not from the hardcoded `['MF1','MF2','MF3','Machining']`.
5. Show the Top Financial Value list from `topSavings` (Closed only, so it agrees with the ROI card) and Recent Approvals from `recentApprovals` (ordered by decision date).
6. Add a period filter (this month, this quarter, this year, custom) that drives `from` and `to`, plus loading, error and empty states.
7. Keep the `kaizens` prop only for features that still need it (the navigation callbacks). The analytics no longer read it.

## 5. Phase 3: Executive endpoint and `ExecutiveAnalyticsBoard.tsx`

`GET /api/kaizen/analytics/executive/?year=2026&month=ALL&type=ALL&status=ALL&dept=ALL` returns every chart on the board in one call, because a slicer change updates all of them. The board uses calendar years (Jan to Dec).

### What each chart calculates

| Chart | Definition |
| --- | --- |
| YoY Kaizens Implemented | Kaizens per year, ordered by year. The current year is labelled `YTD - <year>` |
| Kaizens per Employee | Yearly kaizens ÷ `AnnualHeadcount` for that year, 2 decimals. `null` when headcount is missing, never 0 |
| YoY Cost Saved/Avoided | `SUM(cost_save)` over Closed kaizens per year |
| Type: Idea or Kaizen | Count and `pct` by `classification` |
| Status Summary | Count per status group: Closed, Open, Reject |
| Month on Month Volume | Count per calendar month of the selected year, zero-filled up to the current month (all 12 for past years) |
| Dept Volume | Count and `pct` per department, zero-filled for all eight |
| Cost Saving Share | Savings and `pct` of total savings per department. Show the top 3 by savings and group the rest as "Others" with the names listed |

Years before the system existed come from `LegacyYearlySummary`. Years with live rows use live data only.

### Which slicers affect which chart

| Slicer | YoY charts (count, per employee, savings) | Type, Status, Dept charts | Month chart |
| --- | --- | --- | --- |
| Year | Ignored (all years shown) | Filters | Chooses which year's months are shown |
| Month | Ignored | Filters | Highlights the month, still shows all months |
| Type, Status, Dept | Filter | Filter | Filter |

### Response shape

```json
{
  "filters": {"year": 2026, "month": "ALL", "type": "ALL", "status": "ALL", "dept": "ALL"},
  "options": {"years": [2021, 2026], "departments": [{"code": "MF2", "name": "MF 2", "color": "#3b82f6"}]},
  "total": 406,
  "yoy": [{"year": 2025, "label": "YTD - 2025", "kaizens": 409, "headcount": 298,
           "perEmployee": 1.37, "savings": 887300, "isYtd": true}],
  "typeSplit": [{"key": "Kaizen", "count": 339, "pct": 83.5}],
  "statusSummary": [{"key": "Closed", "count": 369}],
  "monthTrend": [{"month": 1, "label": "Jan", "count": 17}],
  "deptVolume": [{"code": "MF2", "name": "MF 2", "count": 133, "pct": 32.8, "color": "#3b82f6"}],
  "deptSavings": [{"code": "MF1", "name": "MF 1", "savings": 159600, "pct": 48.8, "color": "#84cc16"}],
  "generatedAt": "2026-10-11T10:00:00+05:30"
}
```

Return exact percentages. The UI rounds to whole numbers.

### Backend

```python
def apply_slicers(qs, f):
    if f.type != "ALL":   qs = qs.filter(classification=f.type)
    if f.status != "ALL": qs = qs.filter(status__in=STATUS_GROUPS[f.status])
    if f.dept != "ALL":   qs = qs.filter(minifactory=f.dept)
    return qs

def yoy(qs):
    return list(
        qs.annotate(y=ExtractYear("suggestion_date")).values("y")
          .annotate(kaizens=Count("id"),
                    savings=Coalesce(Sum("cost_save", filter=Q(status__in=CLOSED)), Decimal("0")))
          .order_by("y")
    )  # then merge legacy years, attach headcount, perEmployee and isYtd

def month_trend(qs, year, today):
    rows = (qs.filter(suggestion_date__gte=date(year, 1, 1), suggestion_date__lt=date(year + 1, 1, 1))
              .annotate(m=ExtractMonth("suggestion_date")).values("m").annotate(c=Count("id")))
    counts = {r["m"]: r["c"] for r in rows}
    last = 12 if year < today.year else today.month
    return [{"month": m, "label": MONTH_ABBR[m], "count": counts.get(m, 0)} for m in range(1, last + 1)]
```

Build `deptVolume` and `deptSavings` by joining the grouped counts with the `Department` table, so every department appears with its color and sort order even at zero.

### Frontend changes in `ExecutiveAnalyticsBoard.tsx`

1. Delete `yoyKaizensData`, `monthData`, `deptData` and every typed-in total, legend string and savings value (`406 Total`, `369`, `34`, `₹1,59,600 (49%)` and the rest).
2. Replace every hand-drawn path, circle and bar with the Phase 1 primitives. This includes the yellow trend lines, month-on-month points, donut `strokeDasharray` values, and status bar heights. Scale axes with `niceMax` (they are currently fixed at 500 and ₹10,00,000).
3. Populate the year and department dropdowns from `options`. Add a year selector, which is missing today, and remove the hardcoded "2025" and the Jan to Nov month list.
4. Draw all eight departments in the donut, with colors from the API, so the arcs match the legend.
5. Format savings with `formatIndianRupees` and show the Per Employee value as an em dash when it is `null`.
6. Accept `onSelectKaizen` as a prop and forward it, with the current slicer values as `filters`, to `EmployeeKaizenChart` (see Phase 4).
7. Optional follow-up: a "same period" toggle that compares Jan 1 to today for every year, so the current year is not compared with full years.

## 6. Phase 4: Employees endpoint and `EmployeeKaizenChart.tsx`

`GET /api/kaizen/analytics/employees/?year=&month=&type=&status=&dept=&sort=total|savings|approved` returns the ranked contributor roster and the KPI strip. It takes the same slicers as the executive board.

### Definitions

| Item | Definition |
| --- | --- |
| Contributor | The idea owner only. Use the employee ID if an Employee table exists. Otherwise key on `lower(trim(idea_by))` and show the most common spelling. The implemented-by and prepared-by fallbacks are dropped |
| Unassigned | Kaizens with no idea owner. Excluded from ranking and reported once as `unassigned` |
| `total` | All kaizens by that person in scope |
| `approved` | Closed group (Approved plus Good Point). `goodPoint` is the Good Point subset |
| `pending`, `rejected` | Open and Reject groups |
| `savings` | `SUM(cost_save)` over Closed kaizens only |
| `departments` | Distinct departments of that person's kaizens in scope |
| `latestKaizenId` | Most recent kaizen by creation time |
| `rank` | By the chosen sort, then the other two metrics, then name, so it is deterministic and independent of the search box |
| KPIs | `contributors`, `totalKaizens`, `avgPerContributor` (total ÷ contributors), `perEmployee` (total ÷ headcount, the same figure as the board's YoY chart), `savings` (Closed), `topContributor` |

Invariant: the sum of employee totals plus `unassigned.total` equals the total for the same filters.

### Response shape

```json
{
  "scope": {"year": 2026, "month": "ALL", "type": "ALL", "status": "ALL", "dept": "ALL"},
  "kpis": {"contributors": 118, "totalKaizens": 406, "avgPerContributor": 3.4,
           "perEmployee": 1.37, "savings": 327300, "topContributor": {"name": "…", "total": 18}},
  "employees": [{"rank": 1, "employeeId": 12, "name": "…", "total": 18, "approved": 15,
                 "goodPoint": 2, "pending": 2, "rejected": 1, "savings": 45000,
                 "departments": ["MF1", "MF2"], "latestKaizenId": 123}],
  "unassigned": {"total": 5, "savings": 0}
}
```

Return the full roster (cap it with a `limit`, default 500). At a few hundred contributors the UI can search it without refetching.

### Backend

```python
from django.contrib.postgres.aggregates import ArrayAgg   # check the import path for your Django version
from django.db.models.functions import Lower, Trim

def employee_roster(qs):
    owned = qs.exclude(Q(idea_by__isnull=True) | Q(idea_by__exact=""))
    rows = (owned.annotate(key=Lower(Trim("idea_by"))).values("key")
        .annotate(
            name=Max("idea_by"),                       # or employee__name if there is a foreign key
            total=Count("id"),
            approved=Count("id", filter=Q(status__in=CLOSED)),
            good_point=Count("id", filter=Q(status="Good Point")),
            pending=Count("id", filter=Q(status__in=OPEN)),
            rejected=Count("id", filter=Q(status__in=REJECTED)),
            savings=Coalesce(Sum("cost_save", filter=Q(status__in=CLOSED)), Decimal("0")),
            departments=ArrayAgg("minifactory", distinct=True),
            ids_latest_first=ArrayAgg("id", ordering="-created_at"),
        ))
    # In Python: latestKaizenId = ids_latest_first[0]; sort by the chosen metric with tie-breakers; assign rank.
```

### Frontend changes in `EmployeeKaizenChart.tsx`

1. Change the props: replace `kaizens` with `filters`, and keep `onSelectKaizen` and `darkMode`. Fetch with `useEmployeeLeaderboard(filters)`.
2. Delete the client aggregation (`employeeStats`, `uniqueMinifactories`, `kaizensList`) and the component's own minifactory dropdown. The board's department slicer now drives it, which also removes the bug where an MF filter still counted a person's kaizens from other units. Keep the search box and the sort selector, and send `sort` to the endpoint.
3. Search filters the roster table only. The podium, the bar chart and the KPIs always use the unsearched ranked list. Show the server's `rank` instead of `index + 1`.
4. Label the podium and the chart by the active sort (for example "Ranked by: Highest Savings"), and make the bar length and the number beside it use that same metric.
5. On a row click, fetch the kaizen by `latestKaizenId` and pass the full object to `onSelectKaizen`, with a brief loading state on the row.
6. Show a footnote when `unassigned.total > 0` (for example "5 kaizens have no idea owner").
7. Relabel the KPIs: "Avg per contributor" for the old Avg/Employee, and add the headcount-based "Per employee" so it matches the board.
8. Remove the duplicate render. `ExecutiveAnalyticsBoard` renders this component without `onSelectKaizen`, so only the copy in `Dashboard.tsx` is clickable today. After step 6 of Phase 3 forwards `onSelectKaizen` and `filters`, delete the `Dashboard.tsx` instance so one copy remains, with the dark theme.
9. Remove unused state and imports: `expandedEmployee`, `Medal`, `Star`, `CheckCircle2`, `Clock`, `Building2`.

## 7. Phase 5: Real-time behavior, performance and security

"Real time" here means fresh within about a minute, which suits roughly 400 kaizens a year. No WebSocket is needed.

1. **Freshness:** each hook refetches every 60 seconds and on window focus. After any kaizen create, update or committee decision, invalidate all three queries so the change shows immediately for that user.
2. **Smooth filtering:** keep the previous data on screen while a new slicer value loads. Show "Updated hh:mm" from `generatedAt`.
3. **Query cost:** each endpoint should run a small, fixed number of aggregate queries. Check with `assertNumQueries` in tests. Add a 15 to 30 second cache keyed by the query parameters only if the aggregates measure slow.
4. **Security:** apply the same authentication and permission classes as the existing Kaizen API. Validate every query parameter, return 400 for unknown values, and never interpolate parameters into raw SQL.
5. **Resilience:** an endpoint failure shows an error with retry for that section only. Other sections keep their data.
6. **Later, if needed:** server-sent events or WebSocket pushes can replace polling without changing the response shapes.

## 8. Phase 6: Testing and cleanup

Tests prove that the three endpoints agree with each other and with a hand count.

### Backend tests

1. **Golden fixture** that reproduces the benchmark: 339 Kaizen and 67 Idea, status 369 Closed, 34 Open and 3 Reject, the eleven monthly counts (17, 30, 21, 17, 14, 40, 53, 69, 69, 47, 29), and department counts MF 2: 133, MF 1: 78, MC: 71, Maintenance: 62, MF 3: 23, QA: 19, OTH: 15, NCM: 5. Assert total 406 and department shares that round to 33, 19, 17, 15, 6, 5, 4 and 1.
2. **Reconciliation invariant:** for any filter combination, the type counts, status counts, department counts and (for a full year) month counts each sum to `total`.
3. **Cross-endpoint check:** for the same filters, total kaizens, Closed count and savings are identical in the dashboard, executive and employees responses.
4. **Savings** exclude Pending and Rejected kaizens everywhere.
5. **Slicers:** each slicer behaves as the table in section 5 says. Year and month do not change the YoY charts.
6. **Edge cases:** empty database, a department with zero rows, headcount missing (`perEmployee` is `null`), approval rate with no decisions (`null`), and a record at 00:30 IST on the 1st landing in the correct month.
7. **Status coverage:** every status value belongs to exactly one group.
8. **Leaderboard:** one person under three spellings collapses to one contributor. A kaizen with a blank idea owner and an implementer counts as unassigned. Filtering to MF2 excludes that person's MF1 kaizens. Ties are stable, and the rank does not change with the search text.
9. **Permissions:** unauthenticated requests are rejected, and unknown parameter values return 400.

### Frontend tests

Test each hook and each component with mocked responses for empty, normal and error cases. Check that no number on screen comes from a literal in the component.

### Cleanup

1. Delete the three hardcoded arrays, the typed-in legend strings and the hand-drawn paths from `ExecutiveAnalyticsBoard.tsx`.
2. Delete the client-side aggregation from `Dashboard.tsx` and `EmployeeKaizenChart.tsx`.
3. Remove the duplicate `EmployeeKaizenChart` from `Dashboard.tsx` (only after Phase 3 forwards `onSelectKaizen`).
4. Remove unused imports and state, then run the linter and type check.
5. Finish `ANALYTICS.md` with the final metric definitions, the field map, the deviations, and the commands to import legacy history and report duplicate contributors.

## 9. Acceptance checklist

The work is done when every item below is ticked.

- [ ] `ANALYTICS.md` exists with the field map, real status and department values, final definitions and deviations.
- [ ] Phase 1 models, constants, filter parser, indexes and the two management commands are merged, with tests.
- [ ] No number on any of the three components comes from a literal in the component. With an empty database every widget shows zero or an empty state.
- [ ] Creating, editing or deciding a kaizen changes all three components within one refresh cycle.
- [ ] A direct SQL count in `psql` matches the total, Closed count and savings on every component for the same filters.
- [ ] The dashboard's ROI card, its Top Financial Value list, the board's savings charts and the leaderboard's savings all use Closed kaizens only and agree.
- [ ] Every executive-board slicer changes the charts it should (section 5 table) and nothing else.
- [ ] Chart axes, bars, trend lines and donut arcs are computed from data. A value larger than before still fits.
- [ ] The leaderboard ranks idea owners only. Search does not change ranks, and a row click opens the kaizen from the board.
- [ ] Only one `EmployeeKaizenChart` is rendered on the page.
- [ ] The golden-fixture test and the cross-endpoint reconciliation test pass in CI.
- [ ] Linter and type check pass. No unused code remains from the old client-side calculations.

## 10. Default assumptions

Apply these defaults, keep each one in a single constant or setting, and list in `ANALYTICS.md` any the real data contradicts.

| Decision | Default | Why it needs confirming |
| --- | --- | --- |
| What "Closed" means | Approved plus Good Point | The dashboard counts both, the leaderboard counted Approved only, and the board never defined it |
| What counts toward savings | Closed kaizens only, as ₹ per year | The leaderboard summed all statuses, and the board's YoY (₹8,87,300) and department (₹3,27,300) figures disagree |
| What "implemented" means in the YoY chart | All kaizens submitted in the year | The benchmark shows 409 for 2025 YTD but every breakdown totals 406 |
| Year type | Calendar year (Jan to Dec) | The board shows Jan to Nov. Make the start month a setting if the plant reports April to March |
| Per employee | Yearly kaizens ÷ average headcount from `AnnualHeadcount` | The leaderboard divides by contributors, so it is renamed "Avg per contributor" |
| Contributor identity | Idea owner only, by employee ID if one exists, otherwise normalized name | Removes credit given to implementers and preparers |
| MC and Machining | The same department, shown as "MC" on the board | The dashboard says "Machining", the board says "MC" |
| Legacy years 2021 to 2024 | Seeded from the benchmark table in section 3, with implied headcounts | Replace the headcounts with real values |
| Podium and chart ranking | Follow the sort selector and say so in their labels | The old subtitle claimed "total validated contributions" regardless of sort |

When the work is finished, the agent reports back with the contents of the Deviations section of `ANALYTICS.md`.
