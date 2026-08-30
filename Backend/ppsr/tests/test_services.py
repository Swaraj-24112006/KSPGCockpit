from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from ppsr.models import PpsrReport, CftMember, CftRating
from ppsr.services import (
    generate_ppsr_number,
    calculate_spreadsheet_metrics,
    get_ppsr_award_category,
    get_award_leaderboard,
)


class PpsrServicesTestCase(TestCase):
    def test_generate_ppsr_number_sequence(self):
        year = date.today().year
        # Initial number
        num1 = generate_ppsr_number()
        self.assertEqual(num1, f"BE-{year}-001")

        # Create record with num1
        PpsrReport.objects.create(
            ppsr_no=num1,
            title="PPSR Test 1",
            problem_statement="Problem 1",
            plant="Pune Complex",
            lead_owner="Rajesh"
        )

        # Next number increments
        num2 = generate_ppsr_number()
        self.assertEqual(num2, f"BE-{year}-002")

    def test_calculate_spreadsheet_metrics(self):
        created_at = date(2026, 8, 1)
        std_date = date(2026, 8, 15)
        ppsr_end_date = date(2026, 8, 25)

        metrics = calculate_spreadsheet_metrics(
            prod_qty_before=1000,
            rejected_qty_before=80,    # 8.00%
            prod_qty_after=1000,
            rejected_qty_after=10,     # 1.00%
            cust_demand_qty_month=5000,
            per_set_rejection_cost=Decimal('150.00'),
            created_at=created_at,
            std_date=std_date,
            ppsr_end_date=ppsr_end_date,
        )

        self.assertEqual(metrics['pct_before'], 8.0)
        self.assertEqual(metrics['pct_after'], 1.0)
        self.assertEqual(metrics['cust_demand_qty_annum'], 60000)
        self.assertEqual(metrics['qty_month_before_rej_pct'], 400) # 5000 * 8%
        self.assertEqual(metrics['qty_month_after_rej_pct'], 50)   # 5000 * 1%
        self.assertEqual(metrics['qty_month_saved_rej_pct'], 350)  # 400 - 50
        self.assertEqual(metrics['cost_save_per_month'], Decimal('52500.00')) # 350 * 150
        self.assertEqual(metrics['cost_save_per_annum'], Decimal('630000.00')) # 52500 * 12
        self.assertEqual(metrics['eff_days_std'], 14)
        self.assertEqual(metrics['eff_days_close_ppsr'], 24)

    def test_get_ppsr_award_category(self):
        # MF1: Vacuum / Fuel pump
        r1 = PpsrReport(title="Fuel Pump Line Issue", line_station="MF1 Vacuum Line", product_component="Pump")
        self.assertEqual(get_ppsr_award_category(r1), "MF1")

        # MF2: EGR
        r2 = PpsrReport(title="EGR Valve Actuator", line_station="Line 2", product_component="EGR")
        self.assertEqual(get_ppsr_award_category(r2), "MF2")

        # MF3: Sensor / BPV
        r3 = PpsrReport(title="Bypass Valve Leakage", line_station="MF3 Assembly", product_component="Sensor")
        self.assertEqual(get_ppsr_award_category(r3), "MF3")

        # Machining: CNC / Quality / CMM
        r4 = PpsrReport(title="Housing Bore Tolerance", line_station="Machining CNC 04", product_component="Housing")
        self.assertEqual(get_ppsr_award_category(r4), "Machining")

    def test_get_award_leaderboard(self):
        r1 = PpsrReport.objects.create(
            ppsr_no="BE-2026-010",
            title="MF1 Quality PPSR",
            problem_statement="Issue 1",
            plant="Pune",
            line_station="MF1 Assembly",
            lead_owner="Lead 1"
        )
        r2 = PpsrReport.objects.create(
            ppsr_no="BE-2026-020",
            title="EGR Valve Fix",
            problem_statement="Issue 2",
            plant="Pune",
            line_station="MF2 Line",
            lead_owner="Lead 2"
        )

        m1 = CftMember.objects.create(name="Reviewer 1", role="Quality Head")
        m2 = CftMember.objects.create(name="Reviewer 2", role="Operations Head")

        # r1 gets 5 + 4 = 9
        CftRating.objects.create(member=m1, report=r1, score=5)
        CftRating.objects.create(member=m2, report=r1, score=4)

        # r2 gets 5 + 5 = 10
        CftRating.objects.create(member=m1, report=r2, score=5)
        CftRating.objects.create(member=m2, report=r2, score=5)

        leaderboard = get_award_leaderboard()
        self.assertEqual(len(leaderboard), 2)
        # Rank 1: r2 with 10 pts
        self.assertEqual(leaderboard[0]['ppsr_no'], "BE-2026-020")
        self.assertEqual(leaderboard[0]['total_score'], 10)
        self.assertEqual(leaderboard[0]['category'], "MF2")

        # Rank 2: r1 with 9 pts
        self.assertEqual(leaderboard[1]['ppsr_no'], "BE-2026-010")
        self.assertEqual(leaderboard[1]['total_score'], 9)
        self.assertEqual(leaderboard[1]['category'], "MF1")
