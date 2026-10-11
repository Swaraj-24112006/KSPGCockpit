"""
Dashboard Analytics Service
===========================
Computes live aggregates in PostgreSQL for GET /api/kaizen/analytics/dashboard/
"""

from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.db.models import Count, Sum, Q, F
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from kaizens.models import Kaizen, Department
from .constants import CLOSED, OPEN, REJECTED, MONTH_ABBR, DEPARTMENT_CODE_NORMALIZATION
from .filters import AnalyticsFilters


def serialize_kaizen_card(k: Kaizen) -> dict:
    return {
        'id': str(k.id),
        'srNo': k.sr_no or f'KZ-{k.id}',
        'title': k.title or '',
        'ideaBy': k.idea_by or 'Unassigned',
        'minifactory': k.mini_factory or 'Plant',
        'costSave': float(k.cost_save or 0),
        'classification': k.get_classification_display() if hasattr(k, 'get_classification_display') else k.classification,
        'suggestionDate': str(k.suggestion_date) if k.suggestion_date else '',
        'month': k.month or '',
    }


def compute_dashboard_analytics(filters: AnalyticsFilters) -> dict:
    tz = ZoneInfo('Asia/Kolkata')
    now = timezone.now().astimezone(tz)
    today = now.date()

    # Scope window
    from_date = filters.from_date or date(today.year, 1, 1)
    to_date = filters.to_date or date(today.year, 12, 31)

    qs = Kaizen.objects.exclude(status='draft')
    qs = qs.filter(suggestion_date__gte=from_date, suggestion_date__lte=to_date)

    if filters.dept and filters.dept != 'ALL':
        qs = qs.filter(mini_factory__iexact=filters.dept)

    if filters.status and filters.status != 'ALL':
        if filters.status == 'Closed':
            qs = qs.filter(status__in=CLOSED)
        elif filters.status == 'Open':
            qs = qs.filter(status__in=OPEN)
        elif filters.status == 'Reject':
            qs = qs.filter(status__in=REJECTED)

    # 1. Summary Metrics
    agg = qs.aggregate(
        total=Count('id'),
        pending=Count('id', filter=Q(status__in=OPEN)),
        approved=Count('id', filter=Q(status__in=CLOSED)),
        rejected=Count('id', filter=Q(status__in=REJECTED)),
        total_savings=Coalesce(Sum('cost_save', filter=Q(status__in=CLOSED)), Decimal('0')),
        p=Count('id', filter=Q(benefits__productivity=True)),
        q=Count('id', filter=Q(benefits__quality=True)),
        c=Count('id', filter=Q(benefits__cost=True)),
        d=Count('id', filter=Q(benefits__delivery=True)),
        s=Count('id', filter=Q(benefits__safety=True)),
        m=Count('id', filter=Q(benefits__morale=True)),
    )

    total_count = agg['total']
    approved_count = agg['approved']
    rejected_count = agg['rejected']
    decisions = approved_count + rejected_count
    approval_rate = round(approved_count / decisions, 4) if decisions > 0 else None

    # 2. Monthly Trend (Zero-filled over window months)
    # Group by TruncMonth
    trend_rows = (
        qs.annotate(trunc_m=TruncMonth('suggestion_date'))
        .values('trunc_m')
        .annotate(c=Count('id'))
        .order_by('trunc_m')
    )
    trend_map = {}
    for r in trend_rows:
        if r['trunc_m']:
            # Format: 'YYYY-MM'
            key = r['trunc_m'].strftime('%Y-%m')
            trend_map[key] = r['c']

    # Generate complete list of months from from_date to to_date
    monthly_trend = []
    curr_y = from_date.year
    curr_m = from_date.month
    end_y = to_date.year
    end_m = to_date.month

    while (curr_y < end_y) or (curr_y == end_y and curr_m <= end_m):
        m_key = f"{curr_y:04d}-{curr_m:02d}"
        label = f"{MONTH_ABBR.get(curr_m, str(curr_m))} {curr_y}"
        count = trend_map.get(m_key, 0)
        monthly_trend.append({
            'month': m_key,
            'label': label,
            'count': count,
        })
        curr_m += 1
        if curr_m > 12:
            curr_m = 1
            curr_y += 1

    # 3. PQCDSM breakdown
    pqcdsm = [
        {'key': 'P', 'name': 'Productivity', 'count': agg['p'], 'pct': round((agg['p'] / total_count * 100), 1) if total_count > 0 else 0},
        {'key': 'Q', 'name': 'Quality', 'count': agg['q'], 'pct': round((agg['q'] / total_count * 100), 1) if total_count > 0 else 0},
        {'key': 'C', 'name': 'Cost', 'count': agg['c'], 'pct': round((agg['c'] / total_count * 100), 1) if total_count > 0 else 0},
        {'key': 'D', 'name': 'Delivery', 'count': agg['d'], 'pct': round((agg['d'] / total_count * 100), 1) if total_count > 0 else 0},
        {'key': 'S', 'name': 'Safety', 'count': agg['s'], 'pct': round((agg['s'] / total_count * 100), 1) if total_count > 0 else 0},
        {'key': 'M', 'name': 'Morale', 'count': agg['m'], 'pct': round((agg['m'] / total_count * 100), 1) if total_count > 0 else 0},
    ]

    # 4. Department / Minifactory breakdown (Zero-filled for all 8 departments)
    dept_counts_raw = (
        qs.values('mini_factory')
        .annotate(c=Count('id'))
    )
    raw_counts_map = {}
    for d in dept_counts_raw:
        raw_code = (d['mini_factory'] or '').strip()
        norm_code = DEPARTMENT_CODE_NORMALIZATION.get(raw_code.lower(), raw_code)
        raw_counts_map[norm_code] = raw_counts_map.get(norm_code, 0) + d['c']

    by_minifactory = []
    departments = Department.objects.all().order_by('sort_order')
    for d in departments:
        cnt = raw_counts_map.get(d.code, 0)
        pct = round((cnt / total_count * 100), 1) if total_count > 0 else 0
        by_minifactory.append({
            'code': d.code,
            'name': d.display_name,
            'description': d.description,
            'count': cnt,
            'pct': pct,
            'color': d.color,
        })

    # 5. Top Financial Value (Closed only, ordered by cost_save desc, limit 4)
    top_savings = [
        serialize_kaizen_card(k)
        for k in qs.filter(status__in=CLOSED, cost_save__gt=0).order_by('-cost_save')[:4]
    ]

    # 6. Pending Review (Open only, oldest first)
    pending_list = [
        serialize_kaizen_card(k)
        for k in qs.filter(status__in=OPEN).order_by('suggestion_date')[:6]
    ]

    # 7. Recent Approvals (Closed only, ordered by updated_at desc, limit 4)
    recent_approvals = [
        serialize_kaizen_card(k)
        for k in qs.filter(status__in=CLOSED).order_by('-updated_at')[:4]
    ]

    return {
        'scope': {
            'from': str(from_date),
            'to': str(to_date),
            'minifactory': filters.dept if filters.dept != 'ALL' else None,
        },
        'summary': {
            'total': total_count,
            'pending': agg['pending'],
            'approved': approved_count,
            'rejected': rejected_count,
            'approvalRate': approval_rate,
            'totalSavings': float(agg['total_savings']),
        },
        'monthlyTrend': monthly_trend,
        'pqcdsm': pqcdsm,
        'byMinifactory': by_minifactory,
        'topSavings': top_savings,
        'pending': pending_list,
        'recentApprovals': recent_approvals,
        'generatedAt': now.isoformat(),
    }
