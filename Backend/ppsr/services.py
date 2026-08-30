"""
PPSR Services — Domain Business Logic & Calculations
=====================================================
Pure Python service functions for PPSR numbering generation,
spreadsheet metrics calculation, award categorization, and
CFT leaderboard aggregations.
"""

from datetime import datetime, date
from decimal import Decimal
import logging
from django.db import transaction
from django.db.models import Sum, Count
from .models import PpsrReport, CftRating

logger = logging.getLogger(__name__)


def generate_ppsr_number() -> str:
    """
    Atomically generate the next PPSR number for the current calendar year.
    Format: BE-YYYY-NNN (zero-padded to 3 digits, resets each year).
    Uses select_for_update to prevent duplicates under concurrent requests.
    """
    year = datetime.now().year
    with transaction.atomic():
        last = (
            PpsrReport.objects
            .filter(ppsr_no__startswith=f'BE-{year}-')
            .select_for_update()
            .order_by('-ppsr_no')
            .first()
        )
        if last:
            try:
                seq = int(last.ppsr_no.split('-')[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f'BE-{year}-{seq:03d}'


def calculate_spreadsheet_metrics(
    prod_qty_before: int | None = None,
    rejected_qty_before: int | None = None,
    prod_qty_after: int | None = None,
    rejected_qty_after: int | None = None,
    cust_demand_qty_month: int | None = None,
    per_set_rejection_cost: Decimal | float | int | None = None,
    created_at: date | datetime | None = None,
    std_date: date | datetime | None = None,
    ppsr_end_date: date | datetime | None = None,
) -> dict:
    """
    Calculate all derived spreadsheet fields from raw production inputs.
    Returns a dict of computed values ready to be saved to PpsrReport.
    
    Mirrors calculateSpreadsheetFields() in PpsrSystem.tsx exactly.
    """
    prod_before = prod_qty_before or 0
    rej_before = rejected_qty_before or 0
    prod_after = prod_qty_after or 0
    rej_after = rejected_qty_after or 0
    demand_month = cust_demand_qty_month or 0

    if isinstance(per_set_rejection_cost, (int, float, str)):
        cost_unit = Decimal(str(per_set_rejection_cost))
    elif isinstance(per_set_rejection_cost, Decimal):
        cost_unit = per_set_rejection_cost
    else:
        cost_unit = Decimal('0.00')

    # Convert datetime to date if needed
    if isinstance(created_at, datetime):
        created_at_d = created_at.date()
    elif isinstance(created_at, date):
        created_at_d = created_at
    else:
        created_at_d = date.today()

    if isinstance(std_date, datetime):
        std_date_d = std_date.date()
    elif isinstance(std_date, date):
        std_date_d = std_date
    else:
        std_date_d = None

    if isinstance(ppsr_end_date, datetime):
        ppsr_end_date_d = ppsr_end_date.date()
    elif isinstance(ppsr_end_date, date):
        ppsr_end_date_d = ppsr_end_date
    else:
        ppsr_end_date_d = None

    # Percentages
    pct_before = round((rej_before / prod_before * 100), 2) if prod_before > 0 else 0.0
    pct_after = round((rej_after / prod_after * 100), 2) if prod_after > 0 else 0.0

    # Demand sizing
    cust_demand_qty_annum = demand_month * 12

    # Monthly quantities
    qty_month_before = round(demand_month * pct_before / 100)
    qty_month_after = round(demand_month * pct_after / 100)
    qty_month_saved = max(0, qty_month_before - qty_month_after)

    # Cost savings
    cost_save_per_month = Decimal(qty_month_saved) * cost_unit
    cost_save_per_annum = cost_save_per_month * Decimal(12)

    # Effective duration days
    eff_days_std = (std_date_d - created_at_d).days if std_date_d and created_at_d else None
    eff_days_close = (ppsr_end_date_d - created_at_d).days if ppsr_end_date_d and created_at_d else None

    return {
        'pct_before': pct_before,
        'pct_after': pct_after,
        'cust_demand_qty_annum': cust_demand_qty_annum,
        'qty_month_before_rej_pct': qty_month_before,
        'qty_month_after_rej_pct': qty_month_after,
        'qty_month_saved_rej_pct': qty_month_saved,
        'cost_save_per_month': cost_save_per_month,
        'cost_save_per_annum': cost_save_per_annum,
        'eff_days_std': eff_days_std,
        'eff_days_close_ppsr': eff_days_close,
    }


def get_ppsr_award_category(report: PpsrReport) -> str:
    """
    Map a report to its MiniFactory award category.
    Mirrors getPpsrCategory() in PPSRMonthlyAwards.tsx.
    """
    line = (report.line_station or '').lower()
    prod = (report.product_component or '').lower()
    title = (report.title or '').lower()

    if any(k in line or k in prod for k in ['mf1', 'vacuum', 'fuel pump']):
        return 'MF1'
    if any(k in line or k in prod or k in title for k in ['mf2', 'egr']):
        return 'MF2'
    if any(k in line or k in prod or k in title for k in ['mf3', 'bpv', 'sensor', 'valve']):
        return 'MF3'
    if any(k in line for k in ['machin', 'cnc', 'quality', 'cmm']):
        return 'Machining'
    return 'MF1'  # default fallback


def get_award_leaderboard(
    report_ids: list[str] | None = None,
    year: str | int | None = None,
    month: str | int | None = None,
    category: str | None = None,
    status: str | None = None,
) -> list[dict]:
    """
    Aggregate CFT star ratings for each report.
    Supports filtering by report_ids or by year, month, category, and status.
    Returns ranked list with total_score, votes_count, and category.
    """
    reports_qs = PpsrReport.objects.exclude(status='Archived')

    if year and str(year) != 'All':
        try:
            reports_qs = reports_qs.filter(created_at__year=int(year))
        except ValueError:
            pass

    if month and str(month) != 'All':
        month_str = str(month).strip()
        month_map = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
        if month_str.lower() in month_map:
            reports_qs = reports_qs.filter(created_at__month=month_map[month_str.lower()])
        else:
            try:
                if '-' in month_str:
                    parts = month_str.split('-')
                    reports_qs = reports_qs.filter(created_at__year=int(parts[0]), created_at__month=int(parts[1]))
                else:
                    reports_qs = reports_qs.filter(created_at__month=int(month_str))
            except (ValueError, IndexError):
                pass

    if status and str(status) != 'All':
        reports_qs = reports_qs.filter(status=status)

    if report_ids:
        reports_qs = reports_qs.filter(id__in=report_ids)

    valid_report_ids = set(reports_qs.values_list('id', flat=True))

    qs = CftRating.objects.filter(report_id__in=valid_report_ids).values('report_id').annotate(
        total_score=Sum('score'),
        votes_count=Count('id')
    )

    results = []
    for row in qs:
        try:
            report = PpsrReport.objects.get(id=row['report_id'])
            cat = get_ppsr_award_category(report)
            if category and str(category) != 'All' and cat.lower() != str(category).lower():
                continue
            results.append({
                'report_id': str(report.id),
                'ppsr_no': report.ppsr_no,
                'title': report.title,
                'lead_owner': report.lead_owner or '',
                'plant': report.plant or '',
                'status': report.status or '',
                'total_score': row['total_score'] or 0,
                'votes_count': row['votes_count'] or 0,
                'category': cat,
            })
        except PpsrReport.DoesNotExist:
            continue

    return sorted(results, key=lambda x: x['total_score'], reverse=True)
