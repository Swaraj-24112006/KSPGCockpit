"""
Unit Tests for Kaizen Analytics Foundation (Phase 1)
====================================================
Tests status groups, department references, headcount models,
and shared filter validation.
"""

from decimal import Decimal
from django.test import TestCase, RequestFactory
from rest_framework.exceptions import ValidationError
from kaizens.models import Kaizen, Department, AnnualHeadcount, LegacyYearlySummary
from kaizens.analytics.constants import STATUS_GROUPS, CLOSED, OPEN, REJECTED, DEFAULT_DEPARTMENTS
from kaizens.analytics.filters import parse_analytics_filters, apply_slicers, AnalyticsFilters


class AnalyticsFoundationTests(TestCase):
    def test_status_group_coverage_and_disjointness(self):
        """
        Verify every status choice on the Kaizen model (except 'draft') belongs to
        exactly one group in STATUS_GROUPS.
        """
        all_choices = [c[0] for c in Kaizen.STATUS_CHOICES if c[0] != 'draft']

        for choice in all_choices:
            matching_groups = []
            for g_name, g_statuses in STATUS_GROUPS.items():
                if choice.lower() in [s.lower() for s in g_statuses]:
                    matching_groups.append(g_name)

            self.assertEqual(
                len(matching_groups), 1,
                f"Status '{choice}' must belong to exactly one status group, but found: {matching_groups}"
            )

    def test_department_seeding_and_fields(self):
        """Verify Department table structure and defaults."""
        Department.objects.all().delete()
        for d in DEFAULT_DEPARTMENTS:
            Department.objects.create(
                code=d['code'],
                display_name=d['display_name'],
                description=d['description'],
                color=d['color'],
                sort_order=d['sort_order'],
            )

        self.assertEqual(Department.objects.count(), 8)
        mf1 = Department.objects.get(code='MF1')
        self.assertEqual(mf1.display_name, 'MF 1')
        self.assertEqual(mf1.description, 'Vacuum & Oil Pump')

    def test_filter_parser_valid_params(self):
        """Verify parse_analytics_filters with valid query parameters."""
        factory = RequestFactory()
        req = factory.get('/api/kaizen/analytics/executive/?year=2026&month=3&type=Kaizen&status=Closed&dept=MF1&sort=savings')
        f = parse_analytics_filters(req)

        self.assertEqual(f.year, 2026)
        self.assertEqual(f.month, 3)
        self.assertEqual(f.type, 'Kaizen')
        self.assertEqual(f.status, 'Closed')
        self.assertEqual(f.dept, 'MF1')
        self.assertEqual(f.sort, 'savings')

    def test_filter_parser_rejects_unknown_values(self):
        """Verify parse_analytics_filters raises ValidationError (400) on invalid inputs."""
        factory = RequestFactory()

        # Invalid type
        req = factory.get('/api/kaizen/analytics/executive/?type=InvalidType')
        with self.assertRaises(ValidationError):
            parse_analytics_filters(req)

        # Invalid status
        req = factory.get('/api/kaizen/analytics/executive/?status=UnknownStatus')
        with self.assertRaises(ValidationError):
            parse_analytics_filters(req)

        # Invalid sort
        req = factory.get('/api/kaizen/analytics/executive/?sort=invalid_sort')
        with self.assertRaises(ValidationError):
            parse_analytics_filters(req)

        # Invalid month
        req = factory.get('/api/kaizen/analytics/executive/?month=15')
        with self.assertRaises(ValidationError):
            parse_analytics_filters(req)
