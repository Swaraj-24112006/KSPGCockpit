from django.test import TestCase
from django.db import IntegrityError
from ppsr.models import (
    PpsrReport,
    ContainmentAction,
    CorrectiveAction,
    StandardizationItem,
    ReadAcrossItem,
    FiveWhysChain,
    PpsrMeetingLog,
    CommitteeFeedback,
    CftMember,
    CftRating,
)


class PpsrModelsTestCase(TestCase):
    def setUp(self):
        self.report = PpsrReport.objects.create(
            ppsr_no='BE-2026-001',
            title='Fuel Pump Pressure Drop at High RPM',
            problem_statement='Pressure drops from 200 bar to 140 bar at 2000 RPM.',
            plant='Pune Complex',
            line_station='Line 3',
            product_component='High Pressure Pump',
            lead_owner='Rajesh Patil',
            facts_analysis={'whatIs': 'Pressure drop', 'whatIsNot': 'No leakage'},
            ishikawa={'man': ['Operator variation']},
            psq_tree_data={'treeType': 'swap_analysis'},
            standard_worksheet=[{'operationName': 'Plunger check'}],
        )

    def test_ppsr_report_creation(self):
        self.assertEqual(str(self.report), '[BE-2026-001] Fuel Pump Pressure Drop at High RPM')
        self.assertEqual(self.report.status, 'Open')
        self.assertEqual(self.report.facts_analysis.get('whatIs'), 'Pressure drop')

    def test_containment_action(self):
        ca = ContainmentAction.objects.create(
            report=self.report,
            no=1,
            action='100% sorting of plunger springs',
            responsible='QA Team',
            date='2026-08-30',
            status='implemented'
        )
        self.assertEqual(self.report.containment_actions.count(), 1)
        self.assertEqual(str(ca), f"Containment #1 for {self.report.ppsr_no}")

    def test_corrective_action(self):
        ca = CorrectiveAction.objects.create(
            report=self.report,
            no=1,
            measure='Modify plunger grinding CNC fixture',
            responsible='Engineering Head',
            deadline='2026-09-15',
            status='in-progress'
        )
        self.assertEqual(self.report.corrective_actions.count(), 1)
        self.assertEqual(str(ca), f"Corrective Action #1 for {self.report.ppsr_no}")

    def test_standardization_item(self):
        std = StandardizationItem.objects.create(
            report=self.report,
            no=1,
            measure='Update PFMEA and SOP rev 4.2',
            responsible='SOP Lead',
            date='2026-09-20',
            status='completed'
        )
        self.assertEqual(self.report.standardization_items.count(), 1)
        self.assertEqual(str(std), f"Standardization #1 for {self.report.ppsr_no}")

    def test_read_across_item(self):
        ra = ReadAcrossItem.objects.create(
            report=self.report,
            no=1,
            proposal='Deploy to Chennai Plant Line 1 & Line 2',
            responsible='Plant Quality Lead',
            deadline='2026-10-01'
        )
        self.assertEqual(self.report.read_across_items.count(), 1)
        self.assertEqual(str(ra), f"Read Across #1 for {self.report.ppsr_no}")

    def test_five_whys_chain(self):
        fw = FiveWhysChain.objects.create(
            report=self.report,
            column1=['Why 1', 'Why 2', 'Why 3', 'Why 4', 'Root Cause A'],
            column2=['Why B1', 'Why B2'],
            column3=['Why C1']
        )
        self.assertEqual(self.report.five_whys.column1[4], 'Root Cause A')
        self.assertEqual(str(fw), f"5-Whys for {self.report.ppsr_no}")

    def test_ppsr_meeting_log(self):
        mtg = PpsrMeetingLog.objects.create(
            meeting_date='2026-08-30',
            chairperson='Amit Mehta',
            attendees='Amit Mehta, Rajesh Patil, Sunita Rao',
            key_discussion_points='Reviewed Stage 2 Swap Analysis.'
        )
        mtg.discussed_ppsr_ids.add(self.report)
        self.assertEqual(mtg.discussed_ppsr_ids.count(), 1)
        self.assertEqual(str(mtg), "Meeting on 2026-08-30 (Amit Mehta)")

    def test_committee_feedback(self):
        fb = CommitteeFeedback.objects.create(
            report=self.report,
            step_number=3,
            step_title='Cause Localization',
            reviewer_name='Dr. S. K. Kulkarni',
            feedback_type='approved',
            comment='Red X verification clearly proven via swap test.',
            resolved=True
        )
        self.assertEqual(self.report.committee_feedback.count(), 1)
        self.assertTrue(fb.resolved)

    def test_cft_member_and_rating(self):
        member = CftMember.objects.create(
            name='Amit Mehta',
            role='Plant Quality Head',
            department='Quality'
        )
        rating = CftRating.objects.create(
            member=member,
            report=self.report,
            score=5
        )
        self.assertEqual(self.report.cft_ratings.count(), 1)
        self.assertEqual(rating.score, 5)

        # Unique constraint test (same member cannot vote twice for same report)
        with self.assertRaises(IntegrityError):
            CftRating.objects.create(
                member=member,
                report=self.report,
                score=4
            )
