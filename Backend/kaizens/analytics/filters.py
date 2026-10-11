"""
Shared Analytics Filters and Query Slicer Parser
=================================================
Validates query parameters across executive, dashboard, and employee analytics.
Returns 400 Bad Request on unknown or invalid parameter values.
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional, Union
from rest_framework.exceptions import ValidationError
from django.db.models import QuerySet, Q
from .constants import STATUS_GROUPS, MONTH_NAME_TO_NUM, DEPARTMENT_CODE_NORMALIZATION, DEFAULT_DEPARTMENTS


@dataclass
class AnalyticsFilters:
    year: Union[int, str] = 'ALL'
    month: Union[int, str] = 'ALL'
    type: str = 'ALL'
    status: str = 'ALL'
    dept: str = 'ALL'
    sort: str = 'total'
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    limit: int = 500


def parse_analytics_filters(request) -> AnalyticsFilters:
    """
    Parses and strictly validates slicer parameters from request.query_params.
    Raises ValidationError (HTTP 400) if any parameter contains unknown choices.
    """
    params = getattr(request, 'query_params', None)
    if params is None:
        params = getattr(request, 'GET', {})

    # 1. Year
    raw_year = params.get('year', 'ALL').strip()
    parsed_year: Union[int, str] = 'ALL'
    if raw_year and raw_year.upper() != 'ALL':
        try:
            parsed_year = int(raw_year)
            if parsed_year < 2000 or parsed_year > 2100:
                raise ValidationError({'year': f'Invalid year {raw_year}. Must be between 2000 and 2100.'})
        except ValueError:
            raise ValidationError({'year': f'Invalid year {raw_year}. Must be an integer or "ALL".'})

    # 2. Month
    raw_month = params.get('month', 'ALL').strip()
    parsed_month: Union[int, str] = 'ALL'
    if raw_month and raw_month.upper() != 'ALL':
        if raw_month.isdigit():
            m_num = int(raw_month)
            if 1 <= m_num <= 12:
                parsed_month = m_num
            else:
                raise ValidationError({'month': f'Invalid month {raw_month}. Must be 1 to 12.'})
        elif raw_month in MONTH_NAME_TO_NUM:
            parsed_month = MONTH_NAME_TO_NUM[raw_month]
        else:
            raise ValidationError({'month': f'Unknown month "{raw_month}".'})

    # 3. Type ('ALL', 'Idea', 'Kaizen')
    raw_type = params.get('type', 'ALL').strip()
    valid_types = {'ALL', 'Idea', 'Kaizen'}
    # Also support lowercase for robustness
    type_map = {'all': 'ALL', 'idea': 'Idea', 'kaizen': 'Kaizen'}
    if raw_type.lower() not in type_map:
        raise ValidationError({'type': f'Invalid type "{raw_type}". Choices are: {", ".join(sorted(valid_types))}.'})
    parsed_type = type_map[raw_type.lower()]

    # 4. Status ('ALL', 'Closed', 'Open', 'Reject')
    raw_status = params.get('status', 'ALL').strip()
    status_map = {
        'all': 'ALL',
        'closed': 'Closed',
        'open': 'Open',
        'reject': 'Reject',
        'rejected': 'Reject'
    }
    if raw_status.lower() not in status_map:
        raise ValidationError({'status': f'Invalid status "{raw_status}". Choices are: ALL, Closed, Open, Reject.'})
    parsed_status = status_map[raw_status.lower()]

    # 5. Department / Minifactory ('ALL' or department code/name)
    raw_dept = params.get('dept', params.get('minifactory', 'ALL')).strip()
    parsed_dept = 'ALL'
    if raw_dept and raw_dept.upper() != 'ALL':
        lower_d = raw_dept.lower()
        if lower_d in DEPARTMENT_CODE_NORMALIZATION:
            parsed_dept = DEPARTMENT_CODE_NORMALIZATION[lower_d]
        else:
            valid_codes = {d['code'] for d in DEFAULT_DEPARTMENTS}
            if raw_dept in valid_codes:
                parsed_dept = raw_dept
            else:
                raise ValidationError({'dept': f'Unknown department "{raw_dept}".'})

    # 6. Sort ('total', 'savings', 'approved')
    raw_sort = params.get('sort', 'total').strip().lower()
    valid_sorts = {'total', 'savings', 'approved'}
    if raw_sort not in valid_sorts:
        raise ValidationError({'sort': f'Invalid sort "{raw_sort}". Choices are: {", ".join(sorted(valid_sorts))}.'})

    # 7. Date range (from, to)
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    raw_from = params.get('from', params.get('fromDate'))
    if raw_from:
        try:
            from_date = date.fromisoformat(raw_from.strip())
        except ValueError:
            raise ValidationError({'from': f'Invalid ISO date "{raw_from}". Format: YYYY-MM-DD.'})

    raw_to = params.get('to', params.get('toDate'))
    if raw_to:
        try:
            to_date = date.fromisoformat(raw_to.strip())
        except ValueError:
            raise ValidationError({'to': f'Invalid ISO date "{raw_to}". Format: YYYY-MM-DD.'})

    if from_date and to_date and from_date > to_date:
        raise ValidationError({'to': 'End date ("to") cannot be before start date ("from").'})

    return AnalyticsFilters(
        year=parsed_year,
        month=parsed_month,
        type=parsed_type,
        status=parsed_status,
        dept=parsed_dept,
        sort=raw_sort,
        from_date=from_date,
        to_date=to_date,
    )


def apply_slicers(qs: QuerySet, f: AnalyticsFilters) -> QuerySet:
    """
    Applies slicer filters to a Kaizen QuerySet:
    - Never includes unsubmitted drafts ('draft') in analytics.
    - Filters by Type, Status, and Department/Minifactory.
    """
    # Exclude drafts from all analytics reporting
    qs = qs.exclude(status='draft')

    if f.type != 'ALL':
        if f.type == 'Kaizen':
            qs = qs.filter(Q(classification__iexact='kaizen') | Q(classification__iexact='good_point'))
        elif f.type == 'Idea':
            # Ideas are non-kaizens or explicitly classified as Idea/None/Pending
            qs = qs.filter(Q(classification__iexact='idea') | Q(classification__iexact='none') | Q(classification__iexact='pending'))

    if f.status != 'ALL':
        group_statuses = STATUS_GROUPS.get(f.status, [])
        qs = qs.filter(status__in=group_statuses)

    if f.dept != 'ALL':
        # Match normalized code or variation
        qs = qs.filter(mini_factory__iexact=f.dept)

    return qs
