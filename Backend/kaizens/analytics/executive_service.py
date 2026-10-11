"""
Executive Analytics Service
===========================
Computes live aggregates in PostgreSQL for GET /api/kaizen/analytics/executive/
Integrates LegacyYearlySummary (2021-2024) and AnnualHeadcount models.
"""

from datetime import date
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.db.models import Count, Sum, Q
from django.db.models.functions import Coalesce, ExtractYear, ExtractMonth
from django.utils import timezone
from kaizens.models import Kaizen, Department, AnnualHeadcount, LegacyYearlySummary
from .constants import CLOSED, OPEN, REJECTED, MONTH_ABBR, DEPARTMENT_CODE_NORMALIZATION
from .filters import AnalyticsFilters, apply_slicers


def compute_executive_analytics(filters: AnalyticsFilters) -> dict:
    tz = ZoneInfo('Asia/Kolkata')
    now = timezone.now().astimezone(tz)
    current_year = now.year

    # Selected year for breakdown charts (default to current year if 'ALL')
    target_year = current_year
    if filters.year != 'ALL':
        try:
            target_year = int(filters.year)
        except (ValueError, TypeError):
            target_year = current_year

    # Base queryset without drafts
    base_qs = Kaizen.objects.exclude(status='draft')

    # Apply slicers for type, status, dept (these affect YoY, breakdown, and month charts)
    slicer_filtered_qs = apply_slicers(base_qs, filters)

    # ── 1. YoY Charts (Count, Per Employee, Savings) ─────────────────────────
    # Year slicer is IGNORED for YoY (all years are shown)
    yoy_live_rows = (
        slicer_filtered_qs.annotate(y=ExtractYear('suggestion_date'))
        .values('y')
        .annotate(
            kaizens=Count('id'),
            savings=Coalesce(Sum('cost_save', filter=Q(status__in=CLOSED)), Decimal('0'))
        )
        .order_by('y')
    )
    live_yoy_map = {r['y']: r for r in yoy_live_rows if r['y']}

    # Load headcounts into a lookup map
    headcount_map = {h.year: h.headcount for h in AnnualHeadcount.objects.all()}

    # Available legacy years
    legacy_rows = LegacyYearlySummary.objects.all().order_by('year')
    legacy_map = {l.year: l for l in legacy_rows}

    # Discover all distinct years
    all_years = sorted(set(list(legacy_map.keys()) + list(live_yoy_map.keys()) + [current_year]))

    yoy_points = []
    for yr in all_years:
        is_ytd = (yr == current_year)
        label = f"YTD - {yr}" if is_ytd else str(yr)

        if yr in live_yoy_map:
            kz_count = live_yoy_map[yr]['kaizens']
            savings = float(live_yoy_map[yr]['savings'])
        elif yr in legacy_map and filters.type == 'ALL' and filters.status == 'ALL' and filters.dept == 'ALL':
            # Benchmark baseline only applies when no sub-filter is active
            kz_count = legacy_map[yr].kaizens
            savings = float(legacy_map[yr].savings)
        else:
            kz_count = 0
            savings = 0.0

        hc = headcount_map.get(yr)
        per_emp = round(kz_count / hc, 2) if (hc and hc > 0) else None

        yoy_points.append({
            'year': yr,
            'label': label,
            'kaizens': kz_count,
            'headcount': hc,
            'perEmployee': per_emp,
            'savings': savings,
            'isYtd': is_ytd,
        })

    # ── 2. Year & Month scoped queryset for Breakdown Charts ────────────────
    # Filter to selected year
    year_qs = slicer_filtered_qs.filter(
        suggestion_date__gte=date(target_year, 1, 1),
        suggestion_date__lte=date(target_year, 12, 31)
    )

    # If specific month is chosen, filter breakdown charts to that month
    breakdown_qs = year_qs
    if filters.month != 'ALL':
        try:
            m_val = int(filters.month)
            breakdown_qs = breakdown_qs.filter(suggestion_date__month=m_val)
        except (ValueError, TypeError):
            pass

    total_in_scope = breakdown_qs.count()

    # Type split: Kaizen vs Idea
    kaizen_type_count = breakdown_qs.filter(
        Q(classification__iexact='kaizen') | Q(classification__iexact='good_point')
    ).count()
    idea_type_count = breakdown_qs.filter(
        Q(classification__iexact='idea') | Q(classification__iexact='none') | Q(classification__iexact='pending')
    ).count()

    type_split = [
        {
            'key': 'Kaizen',
            'count': kaizen_type_count,
            'pct': round((kaizen_type_count / total_in_scope * 100), 2) if total_in_scope > 0 else 0.0,
        },
        {
            'key': 'Idea',
            'count': idea_type_count,
            'pct': round((idea_type_count / total_in_scope * 100), 2) if total_in_scope > 0 else 0.0,
        },
    ]

    # Status summary: Closed, Open, Reject
    status_summary = [
        {'key': 'Closed', 'count': breakdown_qs.filter(status__in=CLOSED).count()},
        {'key': 'Open', 'count': breakdown_qs.filter(status__in=OPEN).count()},
        {'key': 'Reject', 'count': breakdown_qs.filter(status__in=REJECTED).count()},
    ]

    # ── 3. Month on Month Trend (for the selected year) ─────────────────────
    # Shows all months up to current month (or all 12 for past years)
    month_counts_raw = (
        year_qs.annotate(m=ExtractMonth('suggestion_date'))
        .values('m')
        .annotate(c=Count('id'))
    )
    month_counts_map = {r['m']: r['c'] for r in month_counts_raw if r['m']}

    last_month = 12 if target_year < current_year else now.month
    month_trend = []
    for m in range(1, last_month + 1):
        month_trend.append({
            'month': m,
            'label': MONTH_ABBR.get(m, str(m)),
            'count': month_counts_map.get(m, 0),
        })

    # ── 4. Department Volume & Department Savings (all 8 departments) ───────
    dept_stats_raw = (
        breakdown_qs.values('mini_factory')
        .annotate(
            count=Count('id'),
            savings=Coalesce(Sum('cost_save', filter=Q(status__in=CLOSED)), Decimal('0'))
        )
    )
    dept_map = {}
    for r in dept_stats_raw:
        raw_code = (r['mini_factory'] or '').strip()
        norm_code = DEPARTMENT_CODE_NORMALIZATION.get(raw_code.lower(), raw_code)
        if norm_code not in dept_map:
            dept_map[norm_code] = {'count': 0, 'savings': Decimal('0')}
        dept_map[norm_code]['count'] += r['count']
        dept_map[norm_code]['savings'] += r['savings']

    total_savings_in_scope = sum(d['savings'] for d in dept_map.values())

    departments = Department.objects.all().order_by('sort_order')
    dept_volume = []
    dept_savings = []
    for d in departments:
        cnt = dept_map.get(d.code, {}).get('count', 0)
        svg = float(dept_map.get(d.code, {}).get('savings', Decimal('0')))
        cnt_pct = round((cnt / total_in_scope * 100), 2) if total_in_scope > 0 else 0.0
        svg_pct = round((svg / float(total_savings_in_scope) * 100), 2) if total_savings_in_scope > 0 else 0.0

        dept_volume.append({
            'code': d.code,
            'name': d.display_name,
            'count': cnt,
            'pct': cnt_pct,
            'color': d.color,
        })
        dept_savings.append({
            'code': d.code,
            'name': d.display_name,
            'savings': svg,
            'pct': svg_pct,
            'color': d.color,
        })

    # Options for slicer dropdowns
    dept_options = [{'code': d.code, 'name': d.display_name, 'color': d.color} for d in departments]

    return {
        'filters': {
            'year': target_year,
            'month': filters.month,
            'type': filters.type,
            'status': filters.status,
            'dept': filters.dept,
        },
        'options': {
            'years': all_years,
            'departments': dept_options,
        },
        'total': total_in_scope,
        'yoy': yoy_points,
        'typeSplit': type_split,
        'statusSummary': status_summary,
        'monthTrend': month_trend,
        'deptVolume': dept_volume,
        'deptSavings': dept_savings,
        'generatedAt': now.isoformat(),
    }
