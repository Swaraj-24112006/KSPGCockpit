"""
Unit Tests for PPSR DRF Serializers (Phase 3)
==============================================
Tests validation, nested writes, metrics calculation triggers, and
JSON formatting across all PPSR serializers.
"""

from datetime import date
from decimal import Decimal
from django.test import TestCase
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
from ppsr.serializers import (
    ContainmentActionSerializer,
    CorrectiveActionSerializer,
    StandardizationItemSerializer,
    ReadAcrossItemSerializer,
    FiveWhysChainSerializer,
    PpsrReportListSerializer,
    PpsrReportDetailSerializer,
    PpsrMetricsSerializer,
    PpsrMeetingLogSerializer,
    CommitteeFeedbackSerializer,
    CftMemberSerializer,
    CftRatingSerializer,
    AwardLeaderboardSerializer,
)


class PpsrSerializersTestCase(TestCase):
    def setUp(self):
        self.report = PpsrReport.objects.create(
            ppsr_no='BE-2026-001',
            title='Engine Valve Leakage',
            problem_statement='High rejection rate during pressure testing.',
            plant='Plant A',
            line_station='MF1 Vacuum Line',
            lead_owner='John Doe',
            prod_qty_before=1000,
            rejected_qty_before=50,
            cust_demand_qty_month=10000,
            per_set_rejection_cost=Decimal('15.50'),
        )

    # ------------------------------------------------------------------------
    # Task 3.1 Tests — Child Action Serializers
    # ------------------------------------------------------------------------
    def test_child_action_serializers(self):
        # Containment action
        c_data = {
            'no': 1,
            'action': 'Quarantine batch',
            'responsible': 'Alice',
            'date': '2026-09-01',
            'status': 'implemented',
        }
        c_serializer = ContainmentActionSerializer(data=c_data)
        self.assertTrue(c_serializer.is_valid(), c_serializer.errors)

        # Corrective action
        cor_data = {
            'no': 1,
            'measure': 'Replace seal gasket model',
            'responsible': 'Bob',
            'deadline': '2026-09-15',
            'status': 'completed',
        }
        cor_serializer = CorrectiveActionSerializer(data=cor_data)
        self.assertTrue(cor_serializer.is_valid(), cor_serializer.errors)

        # Standardization item
        std_data = {
            'no': 1,
            'measure': 'Update SOP v2.1',
            'responsible': 'Charlie',
            'date': '2026-09-10',
            'status': 'completed',
        }
        std_serializer = StandardizationItemSerializer(data=std_data)
        self.assertTrue(std_serializer.is_valid(), std_serializer.errors)

        # Read across item
        ra_data = {
            'no': 1,
            'proposal': 'Apply to Line 2',
            'responsible': 'Dave',
            'deadline': '2026-09-20',
        }
        ra_serializer = ReadAcrossItemSerializer(data=ra_data)
        self.assertTrue(ra_serializer.is_valid(), ra_serializer.errors)

        # Five whys chain
        fw_data = {
            'column1': ['Why 1', 'Why 2', 'Why 3'],
            'column2': ['Why A', 'Why B'],
            'column3': [],
        }
        fw_serializer = FiveWhysChainSerializer(data=fw_data)
        self.assertTrue(fw_serializer.is_valid(), fw_serializer.errors)

    # ------------------------------------------------------------------------
    # Task 3.2 Tests — Lightweight List Serializer
    # ------------------------------------------------------------------------
    def test_ppsr_report_list_serializer(self):
        # Attach 5-whys chain to test root cause summary
        FiveWhysChain.objects.create(
            report=self.report,
            column1=['Seal worn out', 'Improper torque setting'],
        )

        serializer = PpsrReportListSerializer(self.report)
        data = serializer.data

        self.assertEqual(data['ppsr_no'], 'BE-2026-001')
        self.assertEqual(data['title'], 'Engine Valve Leakage')
        self.assertEqual(data['plant'], 'Plant A')
        self.assertEqual(data['root_cause_analysis'], 'Seal worn out -> Improper torque setting')
        # Check omitted heavy fields
        self.assertNotIn('facts_analysis', data)
        self.assertNotIn('ishikawa', data)
        self.assertNotIn('psq_tree_data', data)

    # ------------------------------------------------------------------------
    # Task 3.3 Tests — Full Detail Serializer with Nested Create & Update
    # ------------------------------------------------------------------------
    def test_ppsr_report_detail_serializer_nested_create(self):
        payload = {
            'title': 'Piston Pin Clearance Defect',
            'problem_statement': 'Clearance out of tolerance.',
            'plant': 'Plant B',
            'lead_owner': 'Jane Smith',
            'containment_actions': [
                {
                    'no': 1,
                    'action': '100% sorting',
                    'responsible': 'Jane',
                    'date': '2026-09-02',
                    'status': 'implemented',
                }
            ],
            'corrective_actions': [
                {
                    'no': 1,
                    'measure': 'Recalibrate CNC lathe',
                    'responsible': 'Tooling Dept',
                    'deadline': '2026-09-12',
                    'status': 'planned',
                }
            ],
            'five_whys': {
                'column1': ['Tool wear', 'High feed rate'],
                'column2': [],
                'column3': [],
            }
        }

        serializer = PpsrReportDetailSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        new_report = serializer.save()

        # Check auto-generated PPSR number
        self.assertTrue(new_report.ppsr_no.startswith('BE-'))
        self.assertEqual(new_report.containment_actions.count(), 1)
        self.assertEqual(new_report.containment_actions.first().action, '100% sorting')
        self.assertEqual(new_report.corrective_actions.count(), 1)
        self.assertIsNotNone(new_report.five_whys)
        self.assertEqual(new_report.five_whys.column1, ['Tool wear', 'High feed rate'])

    def test_ppsr_report_detail_serializer_nested_update(self):
        # Create initial report
        payload = {
            'title': 'Original Report Title',
            'problem_statement': 'Initial problem statement.',
            'plant': 'Plant C',
            'lead_owner': 'Mark',
            'containment_actions': [
                {
                    'no': 1,
                    'action': 'Old containment',
                    'responsible': 'Mark',
                    'date': '2026-09-01',
                    'status': 'planned',
                }
            ]
        }
        serializer = PpsrReportDetailSerializer(data=payload)
        self.assertTrue(serializer.is_valid())
        report_inst = serializer.save()

        # Perform update payload
        update_payload = {
            'title': 'Updated Report Title',
            'containment_actions': [
                {
                    'no': 1,
                    'action': 'New containment step 1',
                    'responsible': 'Mark',
                    'date': '2026-09-05',
                    'status': 'proven',
                },
                {
                    'no': 2,
                    'action': 'New containment step 2',
                    'responsible': 'Sarah',
                    'date': '2026-09-06',
                    'status': 'implemented',
                }
            ]
        }
        upd_serializer = PpsrReportDetailSerializer(report_inst, data=update_payload, partial=True)
        self.assertTrue(upd_serializer.is_valid(), upd_serializer.errors)
        updated_inst = upd_serializer.save()

        self.assertEqual(updated_inst.title, 'Updated Report Title')
        self.assertEqual(updated_inst.containment_actions.count(), 2)
        actions = list(updated_inst.containment_actions.all())
        self.assertEqual(actions[0].action, 'New containment step 1')
        self.assertEqual(actions[1].action, 'New containment step 2')

    # ------------------------------------------------------------------------
    # Task 3.4 Tests — Metrics Calculator Serializer
    # ------------------------------------------------------------------------
    def test_ppsr_metrics_serializer_validation_computes_fields(self):
        metrics_payload = {
            'prod_qty_before': 2000,
            'rejected_qty_before': 100,  # 5%
            'prod_qty_after': 2000,
            'rejected_qty_after': 20,    # 1%
            'cust_demand_qty_month': 5000,
            'per_set_rejection_cost': '10.00',
        }
        serializer = PpsrMetricsSerializer(instance=self.report, data=metrics_payload, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_report = serializer.save()

        self.assertEqual(updated_report.pct_before, 5.0)
        self.assertEqual(updated_report.pct_after, 1.0)
        self.assertEqual(updated_report.cust_demand_qty_annum, 60000)
        self.assertEqual(updated_report.qty_month_before_rej_pct, 250)
        self.assertEqual(updated_report.qty_month_after_rej_pct, 50)
        self.assertEqual(updated_report.qty_month_saved_rej_pct, 200)
        self.assertEqual(updated_report.cost_save_per_month, Decimal('2000.00'))
        self.assertEqual(updated_report.cost_save_per_annum, Decimal('24000.00'))

    # ------------------------------------------------------------------------
    # Task 3.5 Tests — Meeting Log Serializer
    # ------------------------------------------------------------------------
    def test_ppsr_meeting_log_serializer(self):
        meeting_data = {
            'meeting_date': '2026-09-05',
            'chairperson': 'Quality Director',
            'attendees': 'Alice, Bob, Charlie',
            'key_discussion_points': 'Reviewed 8D reports for Plant A.',
            'discussed_ppsr_ids': [str(self.report.id)],
        }
        serializer = PpsrMeetingLogSerializer(data=meeting_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        meeting = serializer.save()

        self.assertEqual(meeting.chairperson, 'Quality Director')
        self.assertEqual(meeting.discussed_ppsr_ids.count(), 1)
        self.assertEqual(meeting.discussed_ppsr_ids.first(), self.report)

    # ------------------------------------------------------------------------
    # Task 3.6 Tests — Committee Feedback Serializer Step Validation
    # ------------------------------------------------------------------------
    def test_committee_feedback_serializer_step_number_validation(self):
        valid_data = {
            'report': str(self.report.id),
            'step_number': 3,
            'step_title': 'Step 3 Localisation',
            'reviewer_name': 'Committee Lead',
            'feedback_type': 'clarification',
            'comment': 'Please attach PSQ tree diagram.',
        }
        valid_serializer = CommitteeFeedbackSerializer(data=valid_data)
        self.assertTrue(valid_serializer.is_valid(), valid_serializer.errors)

        invalid_data = {**valid_data, 'step_number': 9}
        invalid_serializer = CommitteeFeedbackSerializer(data=invalid_data)
        self.assertFalse(invalid_serializer.is_valid())
        self.assertIn('step_number', invalid_serializer.errors)

    # ------------------------------------------------------------------------
    # Task 3.7 Tests — CFT Member & Rating Serializers
    # ------------------------------------------------------------------------
    def test_cft_member_and_rating_serializers(self):
        member = CftMember.objects.create(name='Dr. Smith', role='CFT Evaluator', department='Quality')
        rating_data = {
            'member_id': str(member.id),
            'report_id': str(self.report.id),
            'score': 5,
        }
        rating_serializer = CftRatingSerializer(data=rating_data)
        self.assertTrue(rating_serializer.is_valid(), rating_serializer.errors)
        rating = rating_serializer.save()

        self.assertEqual(rating.member, member)
        self.assertEqual(rating.report, self.report)
        self.assertEqual(rating.score, 5)

        read_serializer = CftRatingSerializer(rating)
        self.assertEqual(read_serializer.data['member_name'], 'Dr. Smith')
        self.assertEqual(read_serializer.data['report_ppsr_no'], 'BE-2026-001')

    # ------------------------------------------------------------------------
    # Task 3.8 Tests — Award Leaderboard Serializer
    # ------------------------------------------------------------------------
    def test_award_leaderboard_serializer(self):
        board_data = {
            'report_id': str(self.report.id),
            'ppsr_no': self.report.ppsr_no,
            'title': self.report.title,
            'lead_owner': self.report.lead_owner,
            'plant': self.report.plant,
            'status': self.report.status,
            'total_score': 15,
            'votes_count': 3,
            'category': 'MF1',
        }
        serializer = AwardLeaderboardSerializer(data=board_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.data['total_score'], 15)
        self.assertEqual(serializer.data['category'], 'MF1')
