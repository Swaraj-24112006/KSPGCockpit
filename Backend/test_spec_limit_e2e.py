"""
End-to-end test: Create a PPSR report with spec-limit graph data via the API,
then query the database to verify all values were persisted correctly.

Run from Backend directory:
    python test_spec_limit_e2e.py
"""

import os
import sys
import json
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.test import RequestFactory
from ppsr.models import PpsrReport
from ppsr.serializers import PpsrReportDetailSerializer

# --- Test payload matching what the frontend sends ---
TEST_PAYLOAD = {
    "title": "E2E Test - Spec-Limit Trend Graph Validation",
    "problemStatement": "Testing that spec-limit graph data persists end-to-end.",
    "leadOwner": "Test Engineer",
    "status": "Open",
    "plant": "Pune Assembly & Paint Complex",
    "lineStation": "Line 3 Station 5",
    "productComponent": "Bearing Housing Assembly",
    "amountDefects": "5",
    "discoveredOn": "2026-09-21",
    "discoveredBy": "Quality Inspector",
    "repeatCase": "no",
    "initialEvidenceType": "data",

    # Initial defect trend data (existing feature)
    "initialDefectTrendData": [
        {"date": "13-12-2027", "defectsCount": 6.2, "stage": "Initial Baseline"},
        {"date": "14-12-2027", "defectsCount": 3.5, "stage": "Observation"},
        {"date": "15-12-2027", "defectsCount": 1.1, "stage": "Investigation"},
    ],

    # NEW: Initial Spec-Limit Trend Graph
    "initialSpecLimitGraph": {
        "usl": 7.25,
        "lsl": 5.50,
        "measurements": [6.19, 6.39, 8.24, 6.22, 6.19]
    },

    # Facts analysis
    "factsAnalysis": {
        "whatIs": "Dimensional variation", "whatIsNot": "Surface defect",
        "whereIs": "Station 5", "whereIsNot": "Station 3",
        "howIs": "Out of tolerance", "howIsNot": "Visual defect",
        "whenIs": "Shift A", "whenIsNot": "Shift B"
    },

    # Effectiveness evidence
    "effectivenessEvidence": "Defect count reduced from 6.2 to 0.1 after PLC cycle tune.",
    "evidenceType": "data",

    # Defect trend data (Step 4)
    "defectTrendData": [
        {"date": "Day 1 (Initial)", "defectsCount": 6.2},
        {"date": "Day 2 (Manual)", "defectsCount": 3.5},
        {"date": "Day 3 (Current)", "defectsCount": 0.1},
    ],

    # NEW: Effectiveness Spec-Limit Trend Graph
    "effectivenessSpecLimitGraph": {
        "usl": 7.25,
        "lsl": 5.50,
        "measurements": [6.19, 6.39, 8.24, 6.22, 6.19]
    },

    "effectivenessChartData": [
        {"name": "Day 1", "value": 6.2},
        {"name": "Day 2", "value": 3.5},
        {"name": "Day 3", "value": 0.1},
    ],

    # Containment actions
    "containmentActionsList": [
        {"no": 1, "action": "Isolate defective batch", "responsible": "Test Engineer", "date": "2026-09-21", "status": "implemented"}
    ],

    # Corrective actions
    "correctiveActionsList": [
        {"no": 1, "measure": "Adjust PLC cycle time", "responsible": "Test Engineer", "deadline": "2026-09-25", "status": "completed"}
    ],

    # Completion signatures
    "completionSignatures": {
        "projectLeader": "Test Engineer",
        "steeringCommittee": "QA Manager",
        "completedOn": "2026-09-21"
    }
}


def run_test():
    print("=" * 70)
    print("PPSR E2E TEST - Spec-Limit Trend Graph Data Persistence")
    print("=" * 70)

    # Step 1: Count existing reports
    count_before = PpsrReport.objects.count()
    print(f"\n[1] Reports in DB before test: {count_before}")

    # Step 2: Serialize and create via serializer (same as ViewSet.create)
    print("\n[2] Creating PPSR report via serializer...")
    serializer = PpsrReportDetailSerializer(data=TEST_PAYLOAD)
    if not serializer.is_valid():
        print(f"   VALIDATION ERRORS: {json.dumps(serializer.errors, indent=2)}")
        return False

    report = serializer.save()
    print(f"   Report created: {report.ppsr_no} (id={report.id})")

    # Step 3: Verify report count
    count_after = PpsrReport.objects.count()
    print(f"\n[3] Reports in DB after test: {count_after} (delta: +{count_after - count_before})")
    assert count_after == count_before + 1, "Report count mismatch!"

    # Step 4: Reload from DB and verify fields
    print("\n[4] Reloading from database...")
    db_report = PpsrReport.objects.get(id=report.id)

    # Basic fields
    checks = [
        ("title", db_report.title, TEST_PAYLOAD["title"]),
        ("problem_statement", db_report.problem_statement, TEST_PAYLOAD["problemStatement"]),
        ("lead_owner", db_report.lead_owner, TEST_PAYLOAD["leadOwner"]),
        ("plant", db_report.plant, TEST_PAYLOAD["plant"]),
        ("status", db_report.status, TEST_PAYLOAD["status"]),
    ]

    all_pass = True
    for field, actual, expected in checks:
        ok = actual == expected
        status = "PASS" if ok else "FAIL"
        print(f"   [{status}] {field}: {repr(actual)}")
        if not ok:
            print(f"      Expected: {repr(expected)}")
            all_pass = False

    # Step 5: Verify Initial Spec-Limit Graph
    print("\n[5] Verifying INITIAL Spec-Limit Graph data...")
    initial_graph = db_report.initial_spec_limit_graph
    print(f"   Raw DB value: {json.dumps(initial_graph)}")

    expected_initial = TEST_PAYLOAD["initialSpecLimitGraph"]
    if isinstance(initial_graph, dict) and initial_graph:
        usl_ok = initial_graph.get("usl") == expected_initial["usl"]
        lsl_ok = initial_graph.get("lsl") == expected_initial["lsl"]
        meas_ok = initial_graph.get("measurements") == expected_initial["measurements"]

        print(f"   [{'PASS' if usl_ok else 'FAIL'}] USL: {initial_graph.get('usl')} (expected {expected_initial['usl']})")
        print(f"   [{'PASS' if lsl_ok else 'FAIL'}] LSL: {initial_graph.get('lsl')} (expected {expected_initial['lsl']})")
        print(f"   [{'PASS' if meas_ok else 'FAIL'}] Measurements: {initial_graph.get('measurements')}")
        center = (initial_graph.get('usl', 0) + initial_graph.get('lsl', 0)) / 2
        print(f"   Center Line (computed): {center}")

        if not (usl_ok and lsl_ok and meas_ok):
            all_pass = False
    else:
        print(f"   [FAIL] initial_spec_limit_graph is empty or not a dict!")
        all_pass = False

    # Step 6: Verify Effectiveness Spec-Limit Graph
    print("\n[6] Verifying EFFECTIVENESS Spec-Limit Graph data...")
    eff_graph = db_report.effectiveness_spec_limit_graph
    print(f"   Raw DB value: {json.dumps(eff_graph)}")

    expected_eff = TEST_PAYLOAD["effectivenessSpecLimitGraph"]
    if isinstance(eff_graph, dict) and eff_graph:
        usl_ok = eff_graph.get("usl") == expected_eff["usl"]
        lsl_ok = eff_graph.get("lsl") == expected_eff["lsl"]
        meas_ok = eff_graph.get("measurements") == expected_eff["measurements"]

        print(f"   [{'PASS' if usl_ok else 'FAIL'}] USL: {eff_graph.get('usl')} (expected {expected_eff['usl']})")
        print(f"   [{'PASS' if lsl_ok else 'FAIL'}] LSL: {eff_graph.get('lsl')} (expected {expected_eff['lsl']})")
        print(f"   [{'PASS' if meas_ok else 'FAIL'}] Measurements: {eff_graph.get('measurements')}")
        center = (eff_graph.get('usl', 0) + eff_graph.get('lsl', 0)) / 2
        print(f"   Center Line (computed): {center}")

        if not (usl_ok and lsl_ok and meas_ok):
            all_pass = False
    else:
        print(f"   [FAIL] effectiveness_spec_limit_graph is empty or not a dict!")
        all_pass = False

    # Step 7: Verify existing fields still work
    print("\n[7] Verifying existing defect trend data still persists...")
    initial_trend = db_report.initial_defect_trend_data
    eff_trend = db_report.defect_trend_data
    eff_chart = db_report.effectiveness_chart_data

    trend_ok = isinstance(initial_trend, list) and len(initial_trend) == 3
    eff_ok = isinstance(eff_trend, list) and len(eff_trend) == 3
    chart_ok = isinstance(eff_chart, list) and len(eff_chart) == 3

    print(f"   [{'PASS' if trend_ok else 'FAIL'}] initial_defect_trend_data: {len(initial_trend) if isinstance(initial_trend, list) else 'N/A'} entries")
    print(f"   [{'PASS' if eff_ok else 'FAIL'}] defect_trend_data: {len(eff_trend) if isinstance(eff_trend, list) else 'N/A'} entries")
    print(f"   [{'PASS' if chart_ok else 'FAIL'}] effectiveness_chart_data: {len(eff_chart) if isinstance(eff_chart, list) else 'N/A'} entries")

    if not (trend_ok and eff_ok and chart_ok):
        all_pass = False

    # Step 8: Verify containment/corrective actions
    print("\n[8] Verifying child objects...")
    containment_count = db_report.containment_actions.count()
    corrective_count = db_report.corrective_actions.count()
    print(f"   [{'PASS' if containment_count == 1 else 'FAIL'}] Containment actions: {containment_count}")
    print(f"   [{'PASS' if corrective_count == 1 else 'FAIL'}] Corrective actions: {corrective_count}")

    if containment_count != 1 or corrective_count != 1:
        all_pass = False

    # Step 9: Test API serialization roundtrip
    print("\n[9] Testing serializer output roundtrip (to_representation)...")
    output_serializer = PpsrReportDetailSerializer(db_report)
    output_data = output_serializer.data

    camel_initial = output_data.get('initialSpecLimitGraph')
    camel_eff = output_data.get('effectivenessSpecLimitGraph')

    camel_initial_ok = isinstance(camel_initial, dict) and camel_initial.get('usl') == 7.25
    camel_eff_ok = isinstance(camel_eff, dict) and camel_eff.get('usl') == 7.25

    print(f"   [{'PASS' if camel_initial_ok else 'FAIL'}] initialSpecLimitGraph in output: {json.dumps(camel_initial) if camel_initial else 'MISSING'}")
    print(f"   [{'PASS' if camel_eff_ok else 'FAIL'}] effectivenessSpecLimitGraph in output: {json.dumps(camel_eff) if camel_eff else 'MISSING'}")

    if not (camel_initial_ok and camel_eff_ok):
        all_pass = False

    # Summary
    print("\n" + "=" * 70)
    if all_pass:
        print("ALL TESTS PASSED - Spec-Limit Trend Graph data persists correctly!")
    else:
        print("SOME TESTS FAILED - Review the output above.")
    print("=" * 70)

    # Cleanup
    print(f"\n[Cleanup] Deleting test report {report.ppsr_no}...")
    db_report.delete()
    print(f"   Test report deleted. DB count: {PpsrReport.objects.count()}")

    return all_pass


if __name__ == '__main__':
    success = run_test()
    sys.exit(0 if success else 1)
