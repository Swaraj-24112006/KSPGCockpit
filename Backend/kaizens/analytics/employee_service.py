"""
Employee Leaderboard Analytics Service
======================================
Computes live aggregates in PostgreSQL for GET /api/kaizen/analytics/employees/
Groups by Lower(Trim(idea_by)), deterministic ranking, unassigned tracking.
"""

from datetime import date
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.db.models import Count, Sum, Q, Max, F
from django.db.models.functions import Coalesce, Lower, Trim
from django.utils import timezone
from kaizens.models import Kaizen, AnnualHeadcount
from .constants import CLOSED, OPEN, REJECTED
from .filters import AnalyticsFilters, apply_slicers


def compute_employee_leaderboard(filters: AnalyticsFilters) -> dict:
    tz = ZoneInfo('Asia/Kolkata')
    now = timezone.now().astimezone(tz)
    current_year = now.year

    # Base queryset without drafts
    base_qs = Kaizen.objects.exclude(status='draft')

    # Apply slicers (type, status, dept)
    qs = apply_slicers(base_qs, filters)

    # Apply year filter if specified
    if filters.year != 'ALL':
        try:
            yr = int(filters.year)
            qs = qs.filter(suggestion_date__gte=date(yr, 1, 1), suggestion_date__lte=date(yr, 12, 31))
        except (ValueError, TypeError):
            pass

    # Apply month filter if specified
    if filters.month != 'ALL':
        try:
            m = int(filters.month)
            qs = qs.filter(suggestion_date__month=m)
        except (ValueError, TypeError):
            pass

    # Total kaizens and total savings in scope
    total_kaizens = qs.count()
    total_savings = float(qs.filter(status__in=CLOSED).aggregate(
        s=Coalesce(Sum('cost_save'), Decimal('0'))
    )['s'])

    # 1. Unassigned entries (blank or null idea_by)
    unassigned_qs = qs.filter(Q(idea_by__isnull=True) | Q(idea_by__exact=''))
    unassigned_total = unassigned_qs.count()
    unassigned_savings = float(unassigned_qs.filter(status__in=CLOSED).aggregate(
        s=Coalesce(Sum('cost_save'), Decimal('0'))
    )['s'])

    # 2. Owned / Contributor records
    owned_qs = qs.exclude(Q(idea_by__isnull=True) | Q(idea_by__exact=''))

    # Group by Lower(Trim(idea_by))
    roster_rows = (
        owned_qs.annotate(norm_key=Lower(Trim('idea_by')))
        .values('norm_key')
        .annotate(
            display_name=Max('idea_by'),
            total=Count('id'),
            approved=Count('id', filter=Q(status__in=CLOSED)),
            good_point=Count('id', filter=Q(status__in=['good_point', 'Good Point']) | Q(classification__iexact='good_point')),
            pending=Count('id', filter=Q(status__in=OPEN)),
            rejected=Count('id', filter=Q(status__in=REJECTED)),
            savings=Coalesce(Sum('cost_save', filter=Q(status__in=CLOSED)), Decimal('0')),
            latest_id=Max('id'),
        )
    )

    # Fetch departments per contributor in an efficient second pass
    # Get distinct (norm_key, mini_factory)
    contributor_depts_map = {}
    dept_pairs = (
        owned_qs.annotate(norm_key=Lower(Trim('idea_by')))
        .values_list('norm_key', 'mini_factory')
        .distinct()
    )
    for n_key, mf in dept_pairs:
        if mf:
            contributor_depts_map.setdefault(n_key, []).append(mf)

    # Build employee list
    employee_list = []
    for r in roster_rows:
        n_key = r['norm_key']
        depts = sorted(list(set(contributor_depts_map.get(n_key, []))))
        employee_list.append({
            'name': r['display_name'].strip(),
            'total': r['total'],
            'approved': r['approved'],
            'goodPoint': r['good_point'],
            'pending': r['pending'],
            'rejected': r['rejected'],
            'savings': float(r['savings']),
            'departments': depts,
            'latestKaizenId': r['latest_id'],
        })

    # Sort deterministically
    sort_key = filters.sort
    if sort_key == 'savings':
        employee_list.sort(key=lambda x: (-x['savings'], -x['total'], -x['approved'], x['name'].lower()))
    elif sort_key == 'approved':
        employee_list.sort(key=lambda x: (-x['approved'], -x['total'], -x['savings'], x['name'].lower()))
    else:  # default 'total'
        employee_list.sort(key=lambda x: (-x['total'], -x['savings'], -x['approved'], x['name'].lower()))

    # Assign rank (1-indexed) and cap by limit
    limit = filters.limit or 500
    ranked_employees = []
    for idx, emp in enumerate(employee_list[:limit]):
        emp['rank'] = idx + 1
        ranked_employees.append(emp)

    # KPIs
    contributor_count = len(employee_list)
    avg_per_contributor = round(total_kaizens / contributor_count, 1) if contributor_count > 0 else 0.0

    # Per employee (using AnnualHeadcount if a single year is filtered or current year)
    headcount_year = current_year if filters.year == 'ALL' else int(filters.year)
    hc_obj = AnnualHeadcount.objects.filter(year=headcount_year).first()
    per_employee = round(total_kaizens / hc_obj.headcount, 2) if (hc_obj and hc_obj.headcount > 0) else None

    top_contributor = None
    if ranked_employees:
        top_contributor = {
            'name': ranked_employees[0]['name'],
            'total': ranked_employees[0]['total'],
        }

    return {
        'scope': {
            'year': filters.year,
            'month': filters.month,
            'type': filters.type,
            'status': filters.status,
            'dept': filters.dept,
            'sort': filters.sort,
        },
        'kpis': {
            'contributors': contributor_count,
            'totalKaizens': total_kaizens,
            'avgPerContributor': avg_per_contributor,
            'perEmployee': per_employee,
            'savings': total_savings,
            'topContributor': top_contributor,
        },
        'employees': ranked_employees,
        'unassigned': {
            'total': unassigned_total,
            'savings': unassigned_savings,
        },
        'generatedAt': now.isoformat(),
    }
