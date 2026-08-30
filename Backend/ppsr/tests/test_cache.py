"""
Unit & Integration Tests for PPSR Redis Cache Layer (Phase 5)
=============================================================
Tests cache hits, database query reduction, signal-driven cache
invalidation, deterministic key generation, and fault tolerance.
"""

from decimal import Decimal
from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from ppsr.models import PpsrReport, CftMember, CftRating, PpsrMeetingLog
from ppsr.cache import (
    cache_get,
    cache_set,
    leaderboard_key,
    summary_key,
    register_list_key,
    sheet_key,
    meetings_key,
    invalidate_leaderboard,
    invalidate_summary,
    invalidate_register,
    invalidate_sheet,
    invalidate_meetings,
    invalidate_all_for_report,
)


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'KEY_PREFIX': 'ppsr',
    }
})
class PpsrCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        self.report1 = PpsrReport.objects.create(
            ppsr_no='BE-2026-001',
            title='Vacuum Pump Oil Leakage',
            problem_statement='Oil leakage detected at high RPM.',
            status='Open',
            plant='Plant A',
            line_station='MF1 Vacuum Line',
            lead_owner='Alice Johnson',
            cost_save_per_month=Decimal('5000.00'),
            cost_save_per_annum=Decimal('60000.00'),
        )
        self.report2 = PpsrReport.objects.create(
            ppsr_no='BE-2026-002',
            title='EGR Valve Flange Distortion',
            problem_statement='Flange out of flatness spec.',
            status='In-Progress',
            plant='Plant B',
            line_station='MF2 EGR Line',
            lead_owner='Bob Smith',
            cost_save_per_month=Decimal('3000.00'),
            cost_save_per_annum=Decimal('36000.00'),
        )

        self.member = CftMember.objects.create(
            name='Dr. Brown',
            role='Quality Head',
            department='QA',
            is_active=True,
        )
        self.rating = CftRating.objects.create(
            member=self.member,
            report=self.report1,
            score=5,
        )

    # ── Leaderboard Cache Tests ──────────────────────────────────────────────

    def test_leaderboard_cached_on_first_hit(self):
        """Second GET to /awards/leaderboard/ must return cached data without DB queries."""
        resp1 = self.client.get('/api/ppsr/awards/leaderboard/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second call should hit cache and run 0 database queries
        with self.assertNumQueries(0):
            resp2 = self.client.get('/api/ppsr/awards/leaderboard/')
        self.assertEqual(resp1.data, resp2.data)

    def test_leaderboard_cache_invalidated_on_cft_rating_save(self):
        """Saving or updating a CftRating must clear the leaderboard cache."""
        key = leaderboard_key('2026', 'July', 'All', 'All')
        cache_set(key, {'dummy': True}, 300)
        self.assertIsNotNone(cache_get(key))

        # Update rating through API or model save to trigger signal
        self.rating.score = 4
        self.rating.save()

        self.assertIsNone(cache_get(key))

    def test_leaderboard_keys_differ_by_month(self):
        """Different month parameters must produce independent cache keys."""
        key_july = leaderboard_key('2026', 'July', 'All', 'All')
        key_aug = leaderboard_key('2026', 'August', 'All', 'All')
        self.assertNotEqual(key_july, key_aug)

    # ── Summary Cache Tests ──────────────────────────────────────────────────

    def test_summary_cached_on_first_hit(self):
        """Second GET to /reports/summary/ must return cached aggregation with 0 queries."""
        resp1 = self.client.get('/api/ppsr/reports/summary/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        with self.assertNumQueries(0):
            resp2 = self.client.get('/api/ppsr/reports/summary/')
        self.assertEqual(resp1.data, resp2.data)

    def test_summary_invalidated_on_report_save(self):
        """Creating or modifying a PpsrReport must clear summary cache."""
        cache_set(summary_key(), {'total_count': 99}, 120)
        self.assertIsNotNone(cache_get(summary_key()))

        # Modify report
        self.report1.status = 'Closed'
        self.report1.save()

        self.assertIsNone(cache_get(summary_key()))

    # ── Register List Cache Tests ────────────────────────────────────────────

    def test_register_keys_differ_by_filter(self):
        """Different filter combinations must produce deterministic distinct keys."""
        key_open = register_list_key({'status': 'Open', 'plant': 'All'})
        key_closed = register_list_key({'status': 'Closed', 'plant': 'All'})
        self.assertNotEqual(key_open, key_closed)

    def test_register_key_ignores_format_param(self):
        """The 'format' and 'csrfmiddlewaretoken' query params must not affect cache key."""
        key_a = register_list_key({'status': 'Open', 'format': 'json'})
        key_b = register_list_key({'status': 'Open'})
        self.assertEqual(key_a, key_b)

    def test_register_list_cached_and_invalidated_on_report_update(self):
        """Register list is cached on request and invalidated when any report is updated."""
        resp1 = self.client.get('/api/ppsr/reports/?status=Open')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        key = register_list_key({'status': 'Open'})
        self.assertIsNotNone(cache_get(key))

        # Modifying a report clears register cache via signal / perform_update
        self.report1.title = 'Updated Title'
        self.report1.save()

        self.assertIsNone(cache_get(key))

    # ── Sheet Inspect Cache Tests ────────────────────────────────────────────

    def test_sheet_cache_scoped_per_report(self):
        """Updating report A must clear cache for report A while preserving report B cache."""
        key_a = sheet_key(str(self.report1.id))
        key_b = sheet_key(str(self.report2.id))

        cache_set(key_a, {'id': str(self.report1.id)}, 300)
        cache_set(key_b, {'id': str(self.report2.id)}, 300)

        # Invalidate report A only
        invalidate_sheet(str(self.report1.id))

        self.assertIsNone(cache_get(key_a))
        self.assertIsNotNone(cache_get(key_b))

    def test_sheet_inspect_endpoint_cached(self):
        """GET /reports/{id}/sheet/ caches full serialized output."""
        resp1 = self.client.get(f'/api/ppsr/reports/{self.report1.id}/sheet/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        with self.assertNumQueries(0):
            resp2 = self.client.get(f'/api/ppsr/reports/{self.report1.id}/sheet/')
        self.assertEqual(resp1.data, resp2.data)

    # ── Meetings Cache Tests ─────────────────────────────────────────────────

    def test_meetings_cached_and_invalidated(self):
        """Meetings list is cached and cleared when a new meeting is created."""
        resp1 = self.client.get('/api/ppsr/meetings/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        self.assertIsNotNone(cache_get(meetings_key()))

        # Creating meeting clears cache
        PpsrMeetingLog.objects.create(
            meeting_date='2026-09-12',
            chairperson='Chair 1',
            attendees='Attendees list',
            key_discussion_points='Discussion notes',
        )
        self.assertIsNone(cache_get(meetings_key()))

    # ── Cache Resilience & Fault Tolerance Tests ─────────────────────────────

    def test_cache_miss_returns_none_not_exception(self):
        """cache_get on missing key returns None without throwing exceptions."""
        result = cache_get('nonexistent:key:v1')
        self.assertIsNone(result)
