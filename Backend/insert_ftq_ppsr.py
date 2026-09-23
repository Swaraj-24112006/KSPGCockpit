"""
Insert PPSR Report PPSR/2026/jul/03 into the database.
Handles all sections:
- Header Information
- Section 1: Definition of the Problem (with Initial Spec-Limit Graph)
- Section 2: Facts Analysis (IS / IS NOT)
- Section 3: Containment Actions
- Section 4a: Cause Localization (Ishikawa 6M)
- Section 4b: Root Cause Analysis (5x Why with branch headings)
- Section 5: Corrective Actions
- Section 6: Effectiveness (with Sustained Trend and Effectiveness Spec-Limit Graph)
- Section 7: Standardization
- Section 8: Read Across / Lessons Learned
- Section 9: Completion & Approvals
"""

import os
import sys
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from ppsr.models import (
    PpsrReport,
    ContainmentAction,
    CorrectiveAction,
    StandardizationItem,
    ReadAcrossItem,
    FiveWhysChain,
)
from ppsr.serializers import PpsrReportDetailSerializer

def insert_ppsr():
    ppsr_number = "PPSR/2026/jul/03"
    print(f"Creating / Updating PPSR entry: {ppsr_number}...")

    # Clean up existing test/duplicate entries if any
    PpsrReport.objects.filter(ppsr_no=ppsr_number).delete()
    PpsrReport.objects.filter(ppsr_no="BE-2026-009").delete()

    # Step 1: Baseline Defect Trend Data
    initial_defect_trend_data = [
        {"date": "2026-06-04", "defectsCount": 12, "defects_count": 12, "stage": "Initial Baseline"},
        {"date": "2026-06-05", "defectsCount": 5, "defects_count": 5, "stage": "Initial Baseline"},
        {"date": "2026-06-11", "defectsCount": 21, "defects_count": 21, "stage": "Initial Baseline"},
        {"date": "2026-06-12", "defectsCount": 5, "defects_count": 5, "stage": "Initial Baseline"},
        {"date": "2026-06-13", "defectsCount": 16, "defects_count": 16, "stage": "Initial Baseline"},
        {"date": "2026-06-17", "defectsCount": 50, "defects_count": 50, "stage": "Initial Baseline"},
        {"date": "2026-06-19", "defectsCount": 26, "defects_count": 26, "stage": "Initial Baseline"},
        {"date": "2026-06-20", "defectsCount": 36, "defects_count": 36, "stage": "Initial Baseline"}
    ]

    # Step 1: Initial Spec-Limit Trend Graph (Specification 1.87-2.52, NOK higher side 2.58 to 2.62)
    initial_spec_limit_graph = {
        "lsl": 1.87,
        "usl": 2.52,
        "measurements": [2.35, 2.42, 2.48, 2.58, 2.60, 2.59, 2.62, 2.61]
    }

    # Step 1: Facts Analysis (IS / IS NOT)
    facts_analysis = {
        "whatIs": "Specification (1.87-2.52) Ring Regulation-2 Nok (2.58 to 2.62)",
        "what_is": "Specification (1.87-2.52) Ring Regulation-2 Nok (2.58 to 2.62)",
        "whatIsNot": "Specification (1.87-2.52) Ring Regulation-2 Ok (2.32 to 2.40)",
        "what_is_not": "Specification (1.87-2.52) Ring Regulation-2 Ok (2.32 to 2.40)",
        "whereIs": "After Ring Regulation-1 cycle complete",
        "where_is": "After Ring Regulation-1 cycle complete",
        "whereIsNot": "After Ring Regulation-1 cycle complete",
        "where_is_not": "After Ring Regulation-1 cycle complete",
        "howIs": "Daily 12-15 Nos rejection",
        "how_is": "Daily 12-15 Nos rejection",
        "howIsNot": "Daily 2-3 Nos rejection",
        "how_is_not": "Daily 2-3 Nos rejection",
        "whenIs": "During ring Regulation-2 Nok Shows in HMI",
        "when_is": "During ring Regulation-2 Nok Shows in HMI",
        "whenIsNot": "During Ring Regulation-2 Ok Shows in HMI",
        "when_is_not": "During Ring Regulation-2 Ok Shows in HMI",
    }

    # Step 3: Ishikawa 6M
    ishikawa = {
        "man": ["Unskilled operator -> New M/P"],
        "machine": ["Part not clamp", "Load cell loose", "Air pressure low"],
        "material": [
            "Wrong spring -> Spring stiffness Nok",
            "Loose burr found in spool valve area (Selected root cause)",
            "Setting ring position Nok -> Setting ring width Nok",
            "Spool valve area"
        ],
        "methods": ["JES not follow", "Part wrong loading"],
        "method": ["JES not follow", "Part wrong loading"],
        "milieu": ["Dust", "Temperature"],
        "environment": ["Dust", "Temperature"],
        "measurement": ["Machine calibration overdue"],
        "measurements": ["Machine calibration overdue"]
    }

    # Step 3: 5-Whys Branch Headings
    psq_tree_data = {
        "five_whys_headings": {
            "column1": "Branch 1 (Technical Root Cause): Loose burr in spool valve area",
            "column2": "Branch 2 (Detection / Systemic Cause)"
        }
    }

    # Step 4: Effectiveness Trend Data & Spec Limit Graph
    defect_trend_data = [
        {"date": "2026-07-03", "defectsCount": 0, "defects_count": 0, "stage": "After Tool Replaced"},
        {"date": "2026-07-04", "defectsCount": 0, "defects_count": 0, "stage": "Sustained Run"},
        {"date": "2026-07-05", "defectsCount": 0, "defects_count": 0, "stage": "Standardized"}
    ]
    effectiveness_chart_data = [
        {"name": "2026-07-03", "value": 0},
        {"name": "2026-07-04", "value": 0},
        {"name": "2026-07-05", "value": 0}
    ]
    effectiveness_spec_limit_graph = {
        "lsl": 1.87,
        "usl": 2.52,
        "measurements": [2.34, 2.36, 2.38, 2.35, 2.37, 2.39, 2.35, 2.38]
    }

    # Step 5: Signatures
    completion_signatures = {
        "projectLeader": "Signed - Nagaraj Kashipudi",
        "project_leader": "Signed - Nagaraj Kashipudi",
        "coachHeadOfDept": "Signed",
        "coach_head_of_dept": "Signed",
        "steeringCommittee": "Signed",
        "steering_committee": "Signed",
        "completedOn": "2026-08-26",
        "completed_on": "2026-08-26"
    }

    # Create central PpsrReport
    report = PpsrReport.objects.create(
        ppsr_no=ppsr_number,
        title="FTQ Improvement",
        problem_statement="Ring Regulation-2 Nok for higher side",
        status="Closed",
        plant="Sensors & Actuators",
        line_station="Line-3, Station-110",
        product_component="HR-13",
        amount_defects="36 Nos",
        discovered_on=date(2026, 7, 1),
        discovered_by="operator",
        repeat_case="no",
        initial_evidence_type="data",
        lead_owner="Nagaraj Kashipudi",
        project_leader="Nagaraj Kashipudi",
        team_members="Priyabrata Das",
        target_date=date(2026, 8, 26),
        facts_analysis=facts_analysis,
        initial_defect_trend_data=initial_defect_trend_data,
        initial_spec_limit_graph=initial_spec_limit_graph,
        cause_localization_approach="both",
        ishikawa=ishikawa,
        psq_tree_data=psq_tree_data,
        standard_worksheet=[],
        effectiveness_evidence=(
            "Before Corrective Action: Rejections trending between 5 and 50 Nos across observation days.\n"
            "After Corrective Action: 0 rejections sustained across subsequent production runs."
        ),
        evidence_type="data",
        defect_trend_data=defect_trend_data,
        effectiveness_chart_data=effectiveness_chart_data,
        effectiveness_spec_limit_graph=effectiveness_spec_limit_graph,
        read_across_explanation="Unique model",
        completion_signatures=completion_signatures,
        # Spreadsheet metrics derived from available facts
        std_status_mf="Completed",
        std_date=date(2026, 7, 2),
        eff_days_std=1,
        responsibility="Nagaraj Kashipudi",
        ppsr_end_date=date(2026, 8, 26),
        eff_days_close_ppsr=56,
        committee_decision="Approved",
        committee_decision_date=date(2026, 8, 26),
        steering_committee_sign="Signed"
    )

    # Section 3: Containment Actions
    ContainmentAction.objects.create(
        report=report,
        no=1,
        action="100% Shows in HMI",
        responsible="Ramesh.S",
        date=date(2026, 7, 1),
        status="implemented"
    )

    # Section 4b: 5-Whys
    FiveWhysChain.objects.create(
        report=report,
        column1=[
            "Loose burr in spool valve area",
            "Burr was not clear during machining",
            "Drill \u00d83 was worn out",
            "Tool life was not change",
            "Tool life was not defined / Part was skipped in naked eye"
        ],
        column2=[
            "Frequently inspector was change",
            "Skilled inspector not available"
        ],
        column3=[]
    )

    # Section 5: Corrective Actions
    CorrectiveAction.objects.create(
        report=report,
        no=1,
        measure="100% Containment Done",
        responsible="Hemant R",
        deadline=date(2026, 7, 1),
        status="completed"
    )
    CorrectiveAction.objects.create(
        report=report,
        no=2,
        measure="Tool Replaced",
        responsible="Bhupendra",
        deadline=date(2026, 7, 2),
        status="completed"
    )

    # Section 7: Standardization
    StandardizationItem.objects.create(
        report=report,
        no=1,
        measure="Tool life defined in Control Plan",
        responsible="Chavan",
        date=date(2026, 7, 2),
        status="completed"
    )
    StandardizationItem.objects.create(
        report=report,
        no=2,
        measure="Refresh training provided to the concern persons",
        responsible="Chavan",
        date=date(2026, 7, 2),
        status="completed"
    )

    # Section 8: Read Across
    ReadAcrossItem.objects.create(
        report=report,
        no=1,
        proposal="It is Unique model – Not applicable",
        responsible="Nagaraj Kashipudi",
        deadline=date(2026, 8, 26)
    )

    print(f"SUCCESS: PPSR {report.ppsr_no} created successfully (ID: {report.id})")

    # Verify serialization
    serializer = PpsrReportDetailSerializer(instance=report)
    ser_data = serializer.data
    print("Verification checks:")
    print(" - ppsrNo:", ser_data.get('ppsrNo'))
    print(" - title:", ser_data.get('title'))
    print(" - plant:", ser_data.get('plant'))
    print(" - lineStation:", ser_data.get('lineStation'))
    print(" - initialSpecLimitGraph:", ser_data.get('initialSpecLimitGraph'))
    print(" - effectivenessSpecLimitGraph:", ser_data.get('effectivenessSpecLimitGraph'))
    print(" - fiveWhysList:", ser_data.get('fiveWhysList'))
    print(" - containmentActions count:", len(ser_data.get('containmentActionsList', [])))
    print(" - correctiveActions count:", len(ser_data.get('correctiveActionsList', [])))
    print(" - standardization count:", len(ser_data.get('standardizationList', [])))
    print(" - readAcross count:", len(ser_data.get('readAcrossList', [])))
    print(" - completionSignatures:", ser_data.get('completionSignatures'))

if __name__ == '__main__':
    insert_ppsr()
