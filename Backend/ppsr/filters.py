"""
PPSR Filters — django-filter FilterSets for PPSR Reports & Registers
====================================================================
Filter sets for searching, status filtering, plant filtering,
and review board criteria.
"""

import django_filters
from django.db.models import Q
from .models import PpsrReport


class PpsrReportFilter(django_filters.FilterSet):
    """
    FilterSet for PpsrReport list views, register spreadsheets,
    and review board filtering.
    """
    status = django_filters.CharFilter(field_name='status', lookup_expr='exact')
    plant = django_filters.CharFilter(field_name='plant', lookup_expr='icontains')
    committee_decision = django_filters.CharFilter(field_name='committee_decision', lookup_expr='exact')
    std_status_mf = django_filters.CharFilter(field_name='std_status_mf', lookup_expr='exact')
    week = django_filters.CharFilter(field_name='week', lookup_expr='exact')
    search = django_filters.CharFilter(method='filter_search')

    class Meta:
        model = PpsrReport
        fields = ['status', 'plant', 'committee_decision', 'std_status_mf', 'week', 'search']

    def filter_search(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        val = value.strip()
        return queryset.filter(
            Q(title__icontains=val) |
            Q(ppsr_no__icontains=val) |
            Q(lead_owner__icontains=val) |
            Q(jira_number__icontains=val) |
            Q(line_station__icontains=val) |
            Q(product_component__icontains=val)
        )
