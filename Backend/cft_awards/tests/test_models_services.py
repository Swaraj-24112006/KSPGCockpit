"""
CFT Awards — Model + Service Tests
====================================
Tests for core business logic: member creation, cycle management,
attendance toggling, and award nomination/approval.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from cft_awards.models import (
    CftMember,
    CFTMember,
    AwardCycle,
    AttendanceRecord,
    MonthlyAward,
    CFTEvaluationSession,
    CFTRating,
    CFTSessionMember,
    AwardCategory,
)
from kaizens.models import Kaizen, KaizenBenefit
from cft_awards import services, selectors



User = get_user_model()


class CftMemberServiceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='testadmin', password='pass', employee_id='EMP-TEST-01'
        )

    def test_create_member(self):
        member = services.create_cft_member(
            name='Test Member',
            role='Quality Lead',
            department='Quality',
            mini_factory='MF1',
            created_by=self.admin,
        )
        self.assertIsNotNone(member.pk)
        self.assertEqual(member.name, 'Test Member')
        self.assertTrue(member.is_active)

    def test_deactivate_member(self):
        member = services.create_cft_member(
            name='To Deactivate', role='Operator', department='Operations', mini_factory='MF2'
        )
        services.deactivate_cft_member(member=member, actor=self.admin)
        member.refresh_from_db()
        self.assertFalse(member.is_active)

    def test_active_members_selector_excludes_inactive(self):
        services.create_cft_member(name='Active',   role='R', department='Quality', mini_factory='MF1')
        m2 = services.create_cft_member(name='Inactive', role='R', department='Quality', mini_factory='MF1')
        services.deactivate_cft_member(member=m2)
        qs = selectors.get_all_active_members(mini_factory='MF1')
        names = list(qs.values_list('name', flat=True))
        self.assertIn('Active', names)
        self.assertNotIn('Inactive', names)


class AwardCycleServiceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin2', password='pass', employee_id='EMP-TEST-02'
        )
        self.member = services.create_cft_member(
            name='Cycle Member', role='Lead', department='Operations', mini_factory='MF1'
        )

    def test_create_cycle_populates_attendance(self):
        cycle = services.create_award_cycle(
            title='August 2026 MF1',
            mini_factory='MF1',
            month=8,
            year=2026,
            auto_populate_members=True,
            created_by=self.admin,
        )
        self.assertTrue(AttendanceRecord.objects.filter(cycle=cycle, member=self.member).exists())

    def test_finalize_cycle(self):
        cycle = services.create_award_cycle(
            title='Sept 2026 MF1', mini_factory='MF1', month=9, year=2026
        )
        services.finalize_award_cycle(cycle=cycle, actor=self.admin)
        cycle.refresh_from_db()
        self.assertTrue(cycle.is_finalized)

    def test_cannot_finalize_twice(self):
        from django.core.exceptions import ValidationError
        cycle = services.create_award_cycle(
            title='Oct 2026 MF1', mini_factory='MF1', month=10, year=2026
        )
        services.finalize_award_cycle(cycle=cycle, actor=self.admin)
        with self.assertRaises(ValidationError):
            services.finalize_award_cycle(cycle=cycle, actor=self.admin)


class AttendanceServiceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin3', password='pass', employee_id='EMP-TEST-03'
        )
        self.member = services.create_cft_member(
            name='Att Member', role='Lead', department='Maintenance', mini_factory='MF2'
        )
        self.cycle = services.create_award_cycle(
            title='Nov 2026 MF2', mini_factory='MF2', month=11, year=2026,
            auto_populate_members=False,
        )

    def test_toggle_attendance(self):
        record = services.toggle_attendance(
            cycle=self.cycle, member=self.member, is_present=True, marked_by=self.admin
        )
        self.assertTrue(record.is_present)

    def test_bulk_attendance_update(self):
        m2 = services.create_cft_member(
            name='Member 2', role='Op', department='Operations', mini_factory='MF2'
        )
        services.bulk_update_attendance(
            cycle=self.cycle,
            attendance_data=[
                {'member_id': self.member.pk, 'is_present': True},
                {'member_id': m2.pk, 'is_present': False},
            ],
            marked_by=self.admin,
        )
        self.assertTrue(
            AttendanceRecord.objects.get(cycle=self.cycle, member=self.member).is_present
        )
        self.assertFalse(
            AttendanceRecord.objects.get(cycle=self.cycle, member=m2).is_present
        )


class AwardNominationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin4', password='pass', employee_id='EMP-TEST-04'
        )
        self.member = services.create_cft_member(
            name='Award Member', role='Lead', department='Quality', mini_factory='MF1'
        )
        self.cycle = services.create_award_cycle(
            title='Dec 2026 MF1', mini_factory='MF1', month=12, year=2026,
            auto_populate_members=False,
        )

    def test_nominate_award(self):
        award = services.nominate_award(
            cycle=self.cycle,
            member=self.member,
            award_type='best_kaizen',
            citation='Outstanding improvement',
            nominated_by=self.admin,
        )
        self.assertEqual(award.status, 'nominated')
        self.assertEqual(award.award_type, 'best_kaizen')

    def test_approve_award(self):
        award = services.nominate_award(
            cycle=self.cycle, member=self.member, award_type='innovation',
        )
        services.approve_award(award=award, actor=self.admin)
        award.refresh_from_db()
        self.assertEqual(award.status, 'approved')
        self.assertIsNotNone(award.approved_at)

    def test_cannot_nominate_in_finalized_cycle(self):
        from django.core.exceptions import ValidationError
        services.finalize_award_cycle(cycle=self.cycle, actor=self.admin)
        with self.assertRaises(ValidationError):
            services.nominate_award(
                cycle=self.cycle, member=self.member, award_type='team_player'
            )


class CFTEvaluationSessionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='eval_lead', password='password123', employee_id='EMP-EVAL-01'
        )

    def test_create_evaluation_session_fields(self):
        session = CFTEvaluationSession.objects.create(
            month='August',
            year=2026,
            opened_by=self.user,
            status='OPEN',
        )
        self.assertIsNotNone(session.id)
        self.assertEqual(session.month, 'August')
        self.assertEqual(session.year, 2026)
        self.assertEqual(session.opened_by, self.user)
        self.assertEqual(session.status, 'OPEN')
        self.assertIsNotNone(session.opened_at)
        self.assertIsNotNone(session.updated_at)

    def test_unique_month_year_constraint(self):
        CFTEvaluationSession.objects.create(
            month='August',
            year=2026,
            opened_by=self.user,
            status='OPEN',
        )
        with self.assertRaises(IntegrityError):
            CFTEvaluationSession.objects.create(
                month='August',
                year=2026,
                opened_by=self.user,
                status='OPEN',
            )

    def test_get_or_create_evaluation_session_persists_exactly_one(self):
        session1, created1 = services.get_or_create_evaluation_session(
            month='September',
            year=2026,
            opened_by=self.user,
        )
        self.assertTrue(created1)
        self.assertEqual(session1.month, 'September')
        self.assertEqual(session1.year, 2026)
        self.assertEqual(session1.status, 'OPEN')

        # Second call for the same month/year
        session2, created2 = services.get_or_create_evaluation_session(
            month='September',
            year=2026,
            opened_by=self.user,
        )
        self.assertFalse(created2)
        self.assertEqual(session1.id, session2.id)
        self.assertEqual(CFTEvaluationSession.objects.filter(month='September', year=2026).count(), 1)

    def test_session_status_transitions(self):
        session, _ = services.get_or_create_evaluation_session(
            month='October',
            year=2026,
            opened_by=self.user,
        )
        self.assertEqual(session.status, 'OPEN')

        finalized_session = services.finalize_evaluation_session(session=session, actor=self.user)
        self.assertEqual(finalized_session.status, 'FINALIZED')

        # Test locked status assignment
        finalized_session.status = 'LOCKED'
        finalized_session.save()
        finalized_session.refresh_from_db()
        self.assertEqual(finalized_session.status, 'LOCKED')

    def test_session_attendance_and_overrides_update(self):
        session, _ = services.get_or_create_evaluation_session(
            month='November',
            year=2026,
            opened_by=self.user,
        )
        # Update attendance
        services.update_session_attendance(
            session=session,
            present_member_ids=[1, 2, 3],
            actor=self.user,
        )
        session.refresh_from_db()
        self.assertEqual(session.present_member_ids, [1, 2, 3])

        # Update category overrides
        services.update_session_overrides(
            session=session,
            category_overrides={'KZ-101': 'MF2'},
            actor=self.user,
        )
        session.refresh_from_db()
        self.assertEqual(session.category_overrides, {'KZ-101': 'MF2'})

    def test_session_attendance_requires_at_least_one_member(self):
        session, _ = services.get_or_create_evaluation_session(
            month='December',
            year=2026,
            opened_by=self.user,
        )
        with self.assertRaises(ValidationError):
            services.update_session_attendance(
                session=session,
                present_member_ids=[],
                actor=self.user,
            )

    def test_cft_session_member_unique_constraint(self):
        session, _ = services.get_or_create_evaluation_session(
            month='January',
            year=2027,
            opened_by=self.user,
        )
        member = CftMember.objects.filter(is_active=True).first()
        self.assertIsNotNone(member)

        # Unique constraint on (session, member)
        with self.assertRaises(IntegrityError):
            CFTSessionMember.objects.create(
                session=session,
                member=member,
                present=True,
            )

    def test_cft_member_alias(self):
        self.assertIs(CFTMember, CftMember)


class AwardCategoryTests(TestCase):
    def test_default_categories_seeded(self):
        categories = services.ensure_default_award_categories()
        self.assertEqual(len(categories), 6)
        codes = [c.code for c in categories]
        self.assertListEqual(codes, ['MF1', 'MF2', 'MF3', 'Machining', 'Quality', 'Maintenance'])

        # Check winner counts
        mf2 = AwardCategory.objects.get(code='MF2')
        self.assertEqual(mf2.winner_count, 2)
        mf1 = AwardCategory.objects.get(code='MF1')
        self.assertEqual(mf1.winner_count, 1)

    def test_get_all_active_categories_selector(self):
        cats = selectors.get_all_active_categories()
        self.assertEqual(cats.count(), 6)


class KaizenCategoryResolutionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='kz_user', password='pass', employee_id='EMP-KZ-01')

    def test_resolve_by_explicit_minifactory(self):
        k1 = Kaizen(sr_no='KZ-001', mini_factory='MF1', created_by=self.user)
        self.assertEqual(services.resolve_kaizen_category(k1), 'MF1')

        k2 = Kaizen(sr_no='KZ-002', mini_factory='MF2', created_by=self.user)
        self.assertEqual(services.resolve_kaizen_category(k2), 'MF2')

        k3 = Kaizen(sr_no='KZ-003', mini_factory='MF3', created_by=self.user)
        self.assertEqual(services.resolve_kaizen_category(k3), 'MF3')

    def test_resolve_by_good_point_classification(self):
        k = Kaizen(sr_no='KZ-004', classification='good_point', created_by=self.user)
        self.assertEqual(services.resolve_kaizen_category(k), 'Quality')

    def test_resolve_by_area_and_machine(self):
        k_qual = Kaizen(sr_no='KZ-005', area='Metrology CMM Lab', created_by=self.user)
        self.assertEqual(services.resolve_kaizen_category(k_qual), 'Quality')

        k_maint = Kaizen(sr_no='KZ-006', area='Electrical Utility Room', machine='Blower Fan 02', created_by=self.user)
        self.assertEqual(services.resolve_kaizen_category(k_maint), 'Maintenance')

        k_mach = Kaizen(sr_no='KZ-007', area='Tooling Shop', machine='CNC Milling Station 4', created_by=self.user)
        self.assertEqual(services.resolve_kaizen_category(k_mach), 'Machining')

    def test_fallback_default_is_mf1(self):
        k = Kaizen(sr_no='KZ-008', created_by=self.user)
        self.assertEqual(services.resolve_kaizen_category(k), 'MF1')


class KaizenEligibilityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='lead_eval', password='pass', employee_id='EMP-LEAD-01')
        self.session, _ = services.get_or_create_evaluation_session(
            month='August',
            year=2026,
            opened_by=self.user,
        )

    def test_eligible_status_allowed(self):
        for st in ('approved', 'good point', 'good_point', 'closed', 'submitted', 'pending'):
            k = Kaizen(
                sr_no=f'KZ-EL-{st[:4]}',
                status=st,
                month='August',
                created_by=self.user,
            )
            self.assertTrue(
                services.is_kaizen_eligible_for_session(k, self.session),
                f"Status '{st}' should be eligible"
            )

    def test_ineligible_status_rejected(self):
        for st in ('draft', 'rejected', 'rework'):
            k = Kaizen(
                sr_no=f'KZ-INEL-{st}',
                status=st,
                month='August',
                created_by=self.user,
            )
            self.assertFalse(
                services.is_kaizen_eligible_for_session(k, self.session),
                f"Status '{st}' should NOT be eligible"
            )

    def test_get_eligible_kaizens_selector_with_filters(self):
        # Create eligible kaizens
        k1 = Kaizen.objects.create(
            sr_no='KZ-2026-101',
            title='CNC Chuck Vibration Reduction',
            status='approved',
            month='August',
            mini_factory='MF1',
            area='Machining Cell',
            machine='CNC-01',
            created_by=self.user,
        )
        KaizenBenefit.objects.create(kaizen=k1, productivity=True, quality=False)

        k2 = Kaizen.objects.create(
            sr_no='KZ-2026-102',
            title='Metrology Calibration Fixture',
            status='closed',
            month='August',
            mini_factory='MF2',
            area='Quality Lab',
            created_by=self.user,
        )
        KaizenBenefit.objects.create(kaizen=k2, productivity=False, quality=True)

        # Ineligible kaizen (wrong month and draft status)
        Kaizen.objects.create(
            sr_no='KZ-2026-999',
            title='Draft Idea',
            status='draft',
            month='July',
            created_by=self.user,
        )

        # Selector with no filters
        all_eligible = selectors.get_eligible_kaizens_for_session(self.session)
        sr_nos = [k.sr_no for k in all_eligible]
        self.assertIn('KZ-2026-101', sr_nos)
        self.assertIn('KZ-2026-102', sr_nos)
        self.assertNotIn('KZ-2026-999', sr_nos)

        # Filter by search
        search_results = selectors.get_eligible_kaizens_for_session(self.session, search='Vibration')
        self.assertEqual(len(search_results), 1)
        self.assertEqual(search_results[0].sr_no, 'KZ-2026-101')

        # Filter by benefit 'q' (quality)
        quality_benefit_results = selectors.get_eligible_kaizens_for_session(self.session, benefit='q')
        self.assertEqual(len(quality_benefit_results), 1)
        self.assertEqual(quality_benefit_results[0].sr_no, 'KZ-2026-102')

        # Filter by category
        mf1_results = selectors.get_eligible_kaizens_for_session(self.session, category='MF1')
        self.assertEqual(len(mf1_results), 1)
        self.assertEqual(mf1_results[0].sr_no, 'KZ-2026-101')



