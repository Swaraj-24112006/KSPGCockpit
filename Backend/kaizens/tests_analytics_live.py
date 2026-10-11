"""
Tests for Kaizen Live Analytics Endpoints (Phase 6)
===================================================
Covers:
1. Golden fixture reproducing benchmark numbers (406 total, 339/67, 369/34/3, 8 departments, 11 months).
2. Reconciliation invariant across all dimension sums.
3. Cross-endpoint reconciliation between Dashboard, Executive, and Employee Leaderboard.
4. Audited savings filtering to Closed kaizens only.
5. Slicer behaviors (YoY invariance vs dimension filtering).
6. Edge cases (empty database, missing headcount, unassigned idea owners).
7. Contributor normalization and deterministic ranking.
8. Filter validation and error handling (400 on invalid params).
"""

from datetime import date
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from kaizens.models import Kaizen, Department, AnnualHeadcount, LegacyYearlySummary
from kaizens.analytics.constants import DEFAULT_DEPARTMENTS


class KaizenLiveAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create test user for created_by FK
        User = get_user_model()
        self.user, _ = User.objects.get_or_create(username='analytics_tester', defaults={'email': 'test@example.com'})

        # Seed standard 8 departments
        Department.objects.all().delete()
        for d in DEFAULT_DEPARTMENTS:
            Department.objects.create(
                code=d['code'],
                display_name=d['display_name'],
                description=d['description'],
                color=d['color'],
                sort_order=d['sort_order'],
            )

        # Seed AnnualHeadcount for 2025 and 2026
        AnnualHeadcount.objects.update_or_create(year=2025, defaults={'headcount': 298})
        AnnualHeadcount.objects.update_or_create(year=2026, defaults={'headcount': 305})

    def test_golden_fixture_benchmark(self):
        """
        Reproduce exact benchmark from specification:
        - Total: 406
        - Classification: 339 Kaizen, 67 Idea
        - Status: 369 Closed (367 approved, 2 good_point), 34 Open (submitted), 3 Reject (rejected)
        - Months (1 to 11): 17, 30, 21, 17, 14, 40, 53, 69, 69, 47, 29
        - Departments: MF2: 133, MF1: 78, MC: 71, Maintenance: 62, MF3: 23, QA: 19, OTH: 15, NCM: 5
        - Department percentages round to: 33, 19, 17, 15, 6, 5, 4, 1
        """
        Kaizen.objects.all().delete()

        # Month distribution mapping (month -> count)
        month_counts = {
            1: 17, 2: 30, 3: 21, 4: 17, 5: 14, 6: 40,
            7: 53, 8: 69, 9: 69, 10: 47, 11: 29
        }
        self.assertEqual(sum(month_counts.values()), 406)

        # Department distribution mapping
        dept_distribution = {
            'MF2': 133, 'MF1': 78, 'MC': 71, 'Maintenance': 62,
            'MF3': 23, 'QA': 19, 'OTH': 15, 'NCM': 5
        }
        self.assertEqual(sum(dept_distribution.values()), 406)

        # Build list of 406 records
        dept_pool = []
        for d, count in dept_distribution.items():
            dept_pool.extend([d] * count)

        month_pool = []
        for m, count in month_counts.items():
            month_pool.extend([m] * count)

        # Status pool: 367 approved, 2 good_point, 34 submitted, 3 rejected
        status_pool = (['approved'] * 367) + (['good_point'] * 2) + (['submitted'] * 34) + (['rejected'] * 3)

        # Classification pool: 339 kaizen, 67 idea
        class_pool = (['kaizen'] * 339) + (['idea'] * 67)

        kaizens_to_create = []
        for i in range(406):
            m = month_pool[i]
            d = dept_pool[i]
            s = status_pool[i]
            c = class_pool[i]
            cost = Decimal('1000.00') if s in ('approved', 'good_point') else Decimal('500.00')

            kaizens_to_create.append(Kaizen(
                sr_no=f"KZ-BENCH-{i+1:04d}",
                title=f"Benchmark Kaizen {i+1}",
                suggestion_date=date(2025, m, min(i % 28 + 1, 28)),
                mini_factory=d,
                status=s,
                classification=c,
                idea_by=f"Operator {(i % 50) + 1}",
                cost_save=cost,
                created_by=self.user,
            ))

        Kaizen.objects.bulk_create(kaizens_to_create)

        # Query Executive API for 2025
        res = self.client.get('/api/kaizen/analytics/executive/?year=2025&month=ALL&type=ALL&status=ALL&dept=ALL')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        # 1. Total
        self.assertEqual(data['total'], 406)

        # 2. Classification
        type_map = {t['key']: t['count'] for t in data['typeSplit']}
        self.assertEqual(type_map.get('Kaizen'), 339)
        self.assertEqual(type_map.get('Idea'), 67)

        # 3. Status
        status_map = {s['key']: s['count'] for s in data['statusSummary']}
        self.assertEqual(status_map.get('Closed'), 369)
        self.assertEqual(status_map.get('Open'), 34)
        self.assertEqual(status_map.get('Reject'), 3)

        # 4. Months
        month_data_map = {m['month']: m['count'] for m in data['monthTrend']}
        for m_num, expected_count in month_counts.items():
            self.assertEqual(month_data_map.get(m_num), expected_count, f"Month {m_num} mismatch")

        # 5. Departments
        dept_data_map = {d['code']: (d['count'], round(d['pct'])) for d in data['deptVolume']}
        self.assertEqual(dept_data_map['MF2'], (133, 33))
        self.assertEqual(dept_data_map['MF1'], (78, 19))
        self.assertEqual(dept_data_map['MC'], (71, 17))
        self.assertEqual(dept_data_map['Maintenance'], (62, 15))
        self.assertEqual(dept_data_map['MF3'], (23, 6))
        self.assertEqual(dept_data_map['QA'], (19, 5))
        self.assertEqual(dept_data_map['OTH'], (15, 4))
        self.assertEqual(dept_data_map['NCM'], (5, 1))

    def test_reconciliation_invariant(self):
        """
        Verify that for any filter set:
        - sum(typeSplit.count) == total
        - sum(statusSummary.count) == total
        - sum(deptVolume.count) == total
        - sum(monthTrend.count) == total (when looking at full past year)
        """
        Kaizen.objects.all().delete()
        Kaizen.objects.create(
            sr_no="KZ-REC-001",
            title="K1", suggestion_date=date(2025, 1, 10), mini_factory="MF1",
            status="approved", classification="kaizen", idea_by="Alice", cost_save=Decimal('5000'),
            created_by=self.user
        )
        Kaizen.objects.create(
            sr_no="KZ-REC-002",
            title="K2", suggestion_date=date(2025, 2, 15), mini_factory="MF2",
            status="submitted", classification="idea", idea_by="Bob", cost_save=Decimal('2000'),
            created_by=self.user
        )
        Kaizen.objects.create(
            sr_no="KZ-REC-003",
            title="K3", suggestion_date=date(2025, 3, 20), mini_factory="MC",
            status="rejected", classification="kaizen", idea_by="Charlie", cost_save=Decimal('1000'),
            created_by=self.user
        )

        res = self.client.get('/api/kaizen/analytics/executive/?year=2025&month=ALL&type=ALL&status=ALL&dept=ALL')
        self.assertEqual(res.status_code, 200)
        data = res.json()

        total = data['total']
        self.assertEqual(total, 3)

        sum_types = sum(t['count'] for t in data['typeSplit'])
        self.assertEqual(sum_types, total)

        sum_status = sum(s['count'] for s in data['statusSummary'])
        self.assertEqual(sum_status, total)

        sum_depts = sum(d['count'] for d in data['deptVolume'])
        self.assertEqual(sum_depts, total)

        sum_months = sum(m['count'] for m in data['monthTrend'])
        self.assertEqual(sum_months, total)

    def test_cross_endpoint_reconciliation(self):
        """
        Verify Dashboard, Executive, and Employee Leaderboard agree on:
        - Total kaizens
        - Closed count
        - Audited savings (Closed only)
        """
        Kaizen.objects.all().delete()
        # 1 Approved (Closed) with 10,000 savings
        Kaizen.objects.create(
            sr_no="KZ-CROSS-001",
            title="K1", suggestion_date=date(2026, 1, 5), mini_factory="MF1",
            status="approved", classification="kaizen", idea_by="Alice", cost_save=Decimal('10000'),
            created_by=self.user
        )
        # 1 Good Point (Closed) with 5,000 savings
        Kaizen.objects.create(
            sr_no="KZ-CROSS-002",
            title="K2", suggestion_date=date(2026, 2, 10), mini_factory="MF1",
            status="good_point", classification="kaizen", idea_by="Alice", cost_save=Decimal('5000'),
            created_by=self.user
        )
        # 1 Pending/Submitted (Open) with 2,000 pending savings -> must NOT count toward savings
        Kaizen.objects.create(
            sr_no="KZ-CROSS-003",
            title="K3", suggestion_date=date(2026, 3, 15), mini_factory="MF2",
            status="submitted", classification="idea", idea_by="Bob", cost_save=Decimal('2000'),
            created_by=self.user
        )
        # 1 Rejected with 3,000 savings -> must NOT count toward savings
        Kaizen.objects.create(
            sr_no="KZ-CROSS-004",
            title="K4", suggestion_date=date(2026, 4, 20), mini_factory="MF2",
            status="rejected", classification="kaizen", idea_by="Bob", cost_save=Decimal('3000'),
            created_by=self.user
        )

        # 1. Dashboard
        res_dash = self.client.get('/api/kaizen/analytics/dashboard/?from=2026-01-01&to=2026-12-31')
        self.assertEqual(res_dash.status_code, 200)
        d_dash = res_dash.json()

        # 2. Executive
        res_exec = self.client.get('/api/kaizen/analytics/executive/?year=2026&month=ALL&type=ALL&status=ALL&dept=ALL')
        self.assertEqual(res_exec.status_code, 200)
        d_exec = res_exec.json()

        # 3. Employees
        res_emp = self.client.get('/api/kaizen/analytics/employees/?year=2026&month=ALL&type=ALL&status=ALL&dept=ALL')
        self.assertEqual(res_emp.status_code, 200)
        d_emp = res_emp.json()

        expected_total = 4
        expected_closed = 2
        expected_savings = 15000.0

        # Assert total agreement
        self.assertEqual(d_dash['summary']['total'], expected_total)
        self.assertEqual(d_exec['total'], expected_total)
        self.assertEqual(d_emp['kpis']['totalKaizens'], expected_total)

        # Assert Closed agreement
        self.assertEqual(d_dash['summary']['approved'], expected_closed)
        closed_exec = next(s['count'] for s in d_exec['statusSummary'] if s['key'] == 'Closed')
        self.assertEqual(closed_exec, expected_closed)
        closed_emp = sum(e['approved'] for e in d_emp['employees'])
        self.assertEqual(closed_emp, expected_closed)

        # Assert Audited Savings agreement (Closed only)
        self.assertEqual(float(d_dash['summary']['totalSavings']), expected_savings)
        savings_exec = sum(d['savings'] for d in d_exec['deptSavings'])
        self.assertEqual(float(savings_exec), expected_savings)
        self.assertEqual(float(d_emp['kpis']['savings']), expected_savings)

    def test_slicers_yoy_invariance(self):
        """
        Year and Month slicers must NOT alter the YoY benchmark series
        in the Executive endpoint, but MUST filter dimension breakdowns.
        """
        Kaizen.objects.all().delete()
        Kaizen.objects.create(
            sr_no="KZ-YOY-2025",
            title="K-2025", suggestion_date=date(2025, 6, 1), mini_factory="MF1",
            status="approved", classification="kaizen", idea_by="Op1",
            created_by=self.user
        )
        Kaizen.objects.create(
            sr_no="KZ-YOY-2026",
            title="K-2026", suggestion_date=date(2026, 6, 1), mini_factory="MF1",
            status="approved", classification="kaizen", idea_by="Op2",
            created_by=self.user
        )

        res_2025 = self.client.get('/api/kaizen/analytics/executive/?year=2025')
        d_2025 = res_2025.json()

        res_2026 = self.client.get('/api/kaizen/analytics/executive/?year=2026')
        d_2026 = res_2026.json()

        # YoY data should contain all years in both requests
        years_2025 = [y['year'] for y in d_2025['yoy']]
        years_2026 = [y['year'] for y in d_2026['yoy']]
        self.assertEqual(years_2025, years_2026)

        # But total and breakdowns reflect selected year
        self.assertEqual(d_2025['total'], 1)
        self.assertEqual(d_2026['total'], 1)

    def test_leaderboard_normalization_and_unassigned(self):
        """
        1. Name normalization collapses '  John Doe  ', 'john doe', 'JOHN DOE' into 1 contributor.
        2. Blank/null idea_by is excluded from individual roster and counted in unassigned.
        """
        Kaizen.objects.all().delete()
        Kaizen.objects.create(
            sr_no="KZ-NORM-001",
            title="K1", suggestion_date=date(2026, 1, 1), mini_factory="MF1",
            status="approved", idea_by="  John Doe  ", cost_save=Decimal('1000'),
            created_by=self.user
        )
        Kaizen.objects.create(
            sr_no="KZ-NORM-002",
            title="K2", suggestion_date=date(2026, 1, 2), mini_factory="MF1",
            status="approved", idea_by="john doe", cost_save=Decimal('2000'),
            created_by=self.user
        )
        Kaizen.objects.create(
            sr_no="KZ-NORM-003",
            title="K3", suggestion_date=date(2026, 1, 3), mini_factory="MF1",
            status="submitted", idea_by="JOHN DOE", cost_save=Decimal('3000'),
            created_by=self.user
        )
        # Unassigned (blank idea_by)
        Kaizen.objects.create(
            sr_no="KZ-NORM-004",
            title="K4", suggestion_date=date(2026, 1, 4), mini_factory="MF2",
            status="approved", idea_by="", cost_save=Decimal('5000'),
            created_by=self.user
        )

        res = self.client.get('/api/kaizen/analytics/employees/?year=2026')
        self.assertEqual(res.status_code, 200)
        d = res.json()

        # Exactly 1 named contributor
        self.assertEqual(len(d['employees']), 1)
        john = d['employees'][0]
        self.assertEqual(john['total'], 3)
        self.assertEqual(john['approved'], 2)
        self.assertEqual(float(john['savings']), 3000.0)

        # Unassigned tracking
        self.assertEqual(d['unassigned']['total'], 1)
        self.assertEqual(float(d['unassigned']['savings']), 5000.0)

        # Invariant: employee totals + unassigned total == overall total
        self.assertEqual(john['total'] + d['unassigned']['total'], d['kpis']['totalKaizens'])

    def test_empty_database_edge_case(self):
        """Empty database returns zero values without division by zero or errors."""
        Kaizen.objects.all().delete()
        AnnualHeadcount.objects.all().delete()

        res = self.client.get('/api/kaizen/analytics/executive/?year=2026')
        self.assertEqual(res.status_code, 200)
        d = res.json()
        self.assertEqual(d['total'], 0)

        res_emp = self.client.get('/api/kaizen/analytics/employees/?year=2026')
        self.assertEqual(res_emp.status_code, 200)
        d_emp = res_emp.json()
        self.assertEqual(d_emp['kpis']['contributors'], 0)
        self.assertIsNone(d_emp['kpis']['perEmployee'])
        self.assertIsNone(d_emp['kpis']['topContributor'])

    def test_validation_error_on_invalid_parameters(self):
        """Unknown or invalid filter parameters must return 400."""
        # Bad month
        res = self.client.get('/api/kaizen/analytics/executive/?month=99')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Bad status
        res = self.client.get('/api/kaizen/analytics/executive/?status=UnknownStatus')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Bad department
        res = self.client.get('/api/kaizen/analytics/executive/?dept=InvalidDept')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
