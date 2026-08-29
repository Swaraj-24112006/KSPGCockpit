"""
Kaizen Filters — Advanced filtering using django-filter
"""

import django_filters
from .models import Kaizen


class KaizenFilter(django_filters.FilterSet):
    """
    Comprehensive filter for Kaizen list endpoints.
    Supports all filtering requirements from the specification.
    """
    # Text search
    sr_no = django_filters.CharFilter(lookup_expr='icontains')
    title = django_filters.CharFilter(lookup_expr='icontains')
    keyword = django_filters.CharFilter(method='keyword_search', label='Keyword search')

    # Exact match filters
    status = django_filters.ChoiceFilter(choices=Kaizen.STATUS_CHOICES)
    classification = django_filters.ChoiceFilter(choices=Kaizen.CLASSIFICATION_CHOICES)

    # Text filters with partial match
    area = django_filters.CharFilter(lookup_expr='icontains')
    mini_factory = django_filters.CharFilter(lookup_expr='icontains')
    location = django_filters.CharFilter(lookup_expr='icontains')
    machine = django_filters.CharFilter(lookup_expr='icontains')
    idea_by = django_filters.CharFilter(lookup_expr='icontains')
    implemented_by = django_filters.CharFilter(lookup_expr='icontains')
    month = django_filters.CharFilter(lookup_expr='iexact')

    # Date range filters
    suggestion_date_from = django_filters.DateFilter(
        field_name='suggestion_date', lookup_expr='gte'
    )
    suggestion_date_to = django_filters.DateFilter(
        field_name='suggestion_date', lookup_expr='lte'
    )
    created_from = django_filters.DateTimeFilter(
        field_name='created_at', lookup_expr='gte'
    )
    created_to = django_filters.DateTimeFilter(
        field_name='created_at', lookup_expr='lte'
    )

    # FK filters
    created_by = django_filters.NumberFilter(field_name='created_by__id')
    assigned_reviewer = django_filters.NumberFilter(field_name='assigned_reviewer__id')
    department = django_filters.CharFilter(
        field_name='created_by__department', lookup_expr='icontains'
    )

    # Benefit filters
    benefit_productivity = django_filters.BooleanFilter(field_name='benefits__productivity')
    benefit_quality = django_filters.BooleanFilter(field_name='benefits__quality')
    benefit_cost = django_filters.BooleanFilter(field_name='benefits__cost')
    benefit_delivery = django_filters.BooleanFilter(field_name='benefits__delivery')
    benefit_safety = django_filters.BooleanFilter(field_name='benefits__safety')
    benefit_morale = django_filters.BooleanFilter(field_name='benefits__morale')

    # Cost range
    cost_save_min = django_filters.NumberFilter(field_name='cost_save', lookup_expr='gte')
    cost_save_max = django_filters.NumberFilter(field_name='cost_save', lookup_expr='lte')

    class Meta:
        model = Kaizen
        fields = []  # All fields defined above explicitly

    def keyword_search(self, queryset, name, value):
        """Search across multiple text fields."""
        from django.db.models import Q
        return queryset.filter(
            Q(title__icontains=value) |
            Q(problem_before__icontains=value) |
            Q(counter_measure_after__icontains=value) |
            Q(result__icontains=value) |
            Q(remark__icontains=value) |
            Q(idea_by__icontains=value) |
            Q(area__icontains=value) |
            Q(machine__icontains=value)
        )
