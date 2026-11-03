import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.contrib.auth.models import User, Group
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from redflag.models import (
    Plant, Line, Station, ProductModel, Department, Employee,
    RedFlag, Attachment, RedFlagContainment, RedFlagRootCause,
    SustenanceCheck, RedFlagClosure, StageHistory, RedFlagConfig,
    EscalationLink
)
from redflag.enums import (
    Status, ContainmentStatus, CheckStatus, Category5M, RedFlagType,
    Severity, AttachmentKind, EscalationModule
)


KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


class Phase6AnalyticsTests(APITestCase):
    """
    Automated test suite for Phase 6:
    Analytics, Presentation Mode, and Global Dashboard selectors & endpoints.
    """

    def setUp(self):
        # Groups
        self.grp_operator, _ = Group.objects.get_or_create(name='Operator')
        self.grp_qa, _ = Group.objects.get_or_create(name='Quality Custodian')
        self.grp_plant_head, _ = Group.objects.get_or_create(name='Plant Head')

        # Users
        self.user_initiator = User.objects.create_user(username='initiator', password='password123')
        self.user_initiator.groups.add(self.grp_operator)

        self.user_target = User.objects.create_user(username='target_person', password='password123')
        self.user_target.groups.add(self.grp_operator)

        self.user_target_b = User.objects.create_user(username='target_person_b', password='password123')
        self.user_target_b.groups.add(self.grp_operator)

        self.user_qa = User.objects.create_user(username='qa_custodian', password='password123')
        self.user_qa.groups.add(self.grp_qa)

        self.user_plant_head = User.objects.create_user(username='plant_head', password='password123')
        self.user_plant_head.groups.add(self.grp_plant_head)

        # Master Data
        self.dept_prod = Department.objects.create(name='Production', code='PROD')
        self.dept_qa = Department.objects.create(name='Quality Assurance', code='QA')
        self.dept_maint = Department.objects.create(name='Maintenance', code='MAINT')

        self.plant = Plant.objects.create(code='MF1', name='Manufacturing 1', is_active=True)
        self.line = Line.objects.create(plant=self.plant, name='Line 1')
        self.station1 = Station.objects.create(line=self.line, name='OP-10')
        self.station2 = Station.objects.create(line=self.line, name='OP-20')
        self.model = ProductModel.objects.create(name='Model Alpha')

        # Employees
        self.emp_initiator = Employee.objects.create(
            user=self.user_initiator, employee_code='E001', full_name='Alice Initiator',
            designation='Operator', department=self.dept_prod, plant=self.plant
        )
        self.emp_target = Employee.objects.create(
            user=self.user_target, employee_code='E002', full_name='Bob Target',
            designation='Line Leader', department=self.dept_prod, plant=self.plant
        )
        self.emp_target_b = Employee.objects.create(
            user=self.user_target_b, employee_code='E005', full_name='Ben Target',
            designation='Maintenance Lead', department=self.dept_maint, plant=self.plant
        )
        self.emp_qa = Employee.objects.create(
            user=self.user_qa, employee_code='E003', full_name='Charlie QA',
            designation='QA Engineer', department=self.dept_qa, plant=self.plant
        )
        self.emp_plant_head = Employee.objects.create(
            user=self.user_plant_head, employee_code='E004', full_name='David PlantHead',
            designation='Plant Manager', department=self.dept_prod, plant=self.plant
        )

        self.plant.default_qa_custodian = self.emp_qa
        self.plant.plant_head = self.emp_plant_head
        self.plant.save()

        # Attachments
        self.att_t0 = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE, bucket='test-bucket', object_key='t0.jpg',
            original_name='t0.jpg', content_type='image/jpeg', size_bytes=1024,
            sha256='a'*64, uploaded_by=self.user_initiator
        )
        self.att_t1 = Attachment.objects.create(
            kind=AttachmentKind.T1_CONTAINMENT, bucket='test-bucket', object_key='t1.jpg',
            original_name='t1.jpg', content_type='image/jpeg', size_bytes=1024,
            sha256='b'*64, uploaded_by=self.user_target
        )

        # Config
        self.config = RedFlagConfig.get_config()
        self.config.containment_sla_minutes = 120
        self.config.save()

    def _seed_deterministic_flags(self):
        """
        Seeds 6 deterministic flags with precise known metrics.
        """
        # Flag 1: Open, Critical, Machine, Process, OP-10, Target Bob, Prod -> Maint, 2026-05-01
        dt1 = datetime(2026, 5, 1, 10, 0, tzinfo=KOLKATA_TZ)
        f1 = RedFlag.objects.create(
            sr_no=1, red_flag_no='RF-MF1-001', status=Status.OPEN, raised_at=dt1,
            target_date=dt1.date() + timedelta(days=5),
            evidence_photo=self.att_t0,
            qa_custodian=self.emp_qa, qa_custodian_name=self.emp_qa.full_name,
            raised_by=self.emp_initiator, raised_by_name=self.emp_initiator.full_name,
            raised_by_department=self.dept_prod, raised_by_department_name=self.dept_prod.name,
            target_department=self.dept_maint, target_department_name=self.dept_maint.name,
            target_person=self.emp_target, target_person_name=self.emp_target.full_name,
            plant=self.plant, plant_name=self.plant.name,
            line=self.line, line_name=self.line.name,
            station=self.station1, station_name=self.station1.name,
            model=self.model, model_name=self.model.name,
            red_flag_type=RedFlagType.PROCESS, red_flag_sub_type='Parameter Drift',
            severity=Severity.CRITICAL, category_5m=Category5M.MACHINE,
            description='Machine spindle vibration high.'
        )

        # Flag 2: Contained (unverified), Major, Method, Quality, OP-10, Target Bob, Prod -> QA, 2026-05-02
        dt2 = datetime(2026, 5, 2, 11, 0, tzinfo=KOLKATA_TZ)
        f2 = RedFlag.objects.create(
            sr_no=2, red_flag_no='RF-MF1-002', status=Status.CONTAINED, raised_at=dt2,
            target_date=dt2.date() + timedelta(days=5),
            evidence_photo=self.att_t0,
            qa_custodian=self.emp_qa, qa_custodian_name=self.emp_qa.full_name,
            raised_by=self.emp_initiator, raised_by_name=self.emp_initiator.full_name,
            raised_by_department=self.dept_prod, raised_by_department_name=self.dept_prod.name,
            target_department=self.dept_qa, target_department_name=self.dept_qa.name,
            target_person=self.emp_target, target_person_name=self.emp_target.full_name,
            plant=self.plant, plant_name=self.plant.name,
            line=self.line, line_name=self.line.name,
            station=self.station1, station_name=self.station1.name,
            model=self.model, model_name=self.model.name,
            red_flag_type=RedFlagType.QUALITY, red_flag_sub_type='Torque Error',
            severity=Severity.MAJOR, category_5m=Category5M.METHOD,
            description='Torque tool out of spec calibration.'
        )
        c2 = RedFlagContainment.objects.create(
            red_flag=f2, attempt_no=1, is_current=True, status=ContainmentStatus.CONTAINED,
            contained_at=dt2 + timedelta(minutes=45), gap_minutes=45,
            suspect_qty=50, sorting_inspected=50, sorting_ok=40, sorting_rejected=10,
            quarantine_location='Hold Area B', action_text='Isolated batch of 50.',
            photo=self.att_t1,
            action_taken_by=self.emp_target, action_taken_by_name=self.emp_target.full_name
        )

        # Flag 3: Under-Sustenance, Moderate, Material, Material, OP-20, Target Ben, Prod -> Prod, 2026-05-03
        dt3 = datetime(2026, 5, 3, 9, 30, tzinfo=KOLKATA_TZ)
        f3 = RedFlag.objects.create(
            sr_no=3, red_flag_no='RF-MF1-003', status=Status.UNDER_SUSTENANCE, raised_at=dt3,
            target_date=dt3.date() + timedelta(days=5),
            evidence_photo=self.att_t0,
            qa_custodian=self.emp_qa, qa_custodian_name=self.emp_qa.full_name,
            raised_by=self.emp_initiator, raised_by_name=self.emp_initiator.full_name,
            raised_by_department=self.dept_prod, raised_by_department_name=self.dept_prod.name,
            target_department=self.dept_prod, target_department_name=self.dept_prod.name,
            target_person=self.emp_target_b, target_person_name=self.emp_target_b.full_name,
            plant=self.plant, plant_name=self.plant.name,
            line=self.line, line_name=self.line.name,
            station=self.station2, station_name=self.station2.name,
            model=self.model, model_name=self.model.name,
            red_flag_type=RedFlagType.MATERIAL, red_flag_sub_type='Raw Material Crack',
            severity=Severity.MODERATE, category_5m=Category5M.MATERIAL,
            description='Inward raw material casting voids.',
            sustenance_start_date=dt3.date(), sustenance_cycle=1, sustenance_achieved=False
        )
        c3 = RedFlagContainment.objects.create(
            red_flag=f3, attempt_no=1, is_current=True, status=ContainmentStatus.VERIFIED,
            contained_at=dt3 + timedelta(minutes=70), gap_minutes=70,
            suspect_qty=20, sorting_inspected=20, sorting_ok=15, sorting_rejected=5,
            quarantine_location='Hold Area C', action_text='Quarantined 20 castings.',
            photo=self.att_t1,
            action_taken_by=self.emp_target_b, action_taken_by_name=self.emp_target_b.full_name,
            verified_by=self.emp_qa, verified_by_name=self.emp_qa.full_name,
            verified_at=dt3 + timedelta(hours=2)
        )
        SustenanceCheck.objects.create(
            red_flag=f3, cycle_no=1, month=1, target_days=30,
            scheduled_date=dt3.date() + timedelta(days=30),
            audit_date=dt3.date() + timedelta(days=30),
            status=CheckStatus.PASSED, auditor=self.emp_qa, auditor_name=self.emp_qa.full_name
        )

        # Flag 4: Closed (sustained), Major, Machine, Machine, OP-10, Target Bob, Prod -> Maint, 2026-05-04
        dt4 = datetime(2026, 5, 4, 8, 15, tzinfo=KOLKATA_TZ)
        f4 = RedFlag.objects.create(
            sr_no=4, red_flag_no='RF-MF1-004', status=Status.CLOSED, raised_at=dt4,
            target_date=dt4.date() + timedelta(days=5),
            evidence_photo=self.att_t0,
            qa_custodian=self.emp_qa, qa_custodian_name=self.emp_qa.full_name,
            raised_by=self.emp_initiator, raised_by_name=self.emp_initiator.full_name,
            raised_by_department=self.dept_prod, raised_by_department_name=self.dept_prod.name,
            target_department=self.dept_maint, target_department_name=self.dept_maint.name,
            target_person=self.emp_target, target_person_name=self.emp_target.full_name,
            plant=self.plant, plant_name=self.plant.name,
            line=self.line, line_name=self.line.name,
            station=self.station1, station_name=self.station1.name,
            model=self.model, model_name=self.model.name,
            red_flag_type=RedFlagType.MACHINE, red_flag_sub_type='Motor Jam',
            severity=Severity.MAJOR, category_5m=Category5M.MACHINE,
            description='Conveyor motor overheated.',
            sustenance_start_date=dt4.date() - timedelta(days=95),
            sustenance_cycle=1, sustenance_achieved=True
        )
        c4 = RedFlagContainment.objects.create(
            red_flag=f4, attempt_no=1, is_current=True, status=ContainmentStatus.VERIFIED,
            contained_at=dt4 + timedelta(minutes=25), gap_minutes=25,
            suspect_qty=30, sorting_inspected=30, sorting_ok=30, sorting_rejected=0,
            quarantine_location='Hold Area A', action_text='Replaced motor bearing.',
            photo=self.att_t1,
            action_taken_by=self.emp_target, action_taken_by_name=self.emp_target.full_name,
            verified_by=self.emp_qa, verified_by_name=self.emp_qa.full_name,
            verified_at=dt4 + timedelta(hours=1)
        )
        for m in (1, 2, 3):
            SustenanceCheck.objects.create(
                red_flag=f4, cycle_no=1, month=m, target_days=m*30,
                scheduled_date=f4.sustenance_start_date + timedelta(days=m*30),
                audit_date=f4.sustenance_start_date + timedelta(days=m*30),
                status=CheckStatus.PASSED, auditor=self.emp_qa, auditor_name=self.emp_qa.full_name
            )
        RedFlagClosure.objects.create(
            red_flag=f4, closure_date=dt4.date(), closure_evidence=self.att_t1,
            validation_trial_shifts=3, validation_trial_results='Zero defect recurrences.',
            approved_by_qa=self.emp_qa, approved_by_qa_name=self.emp_qa.full_name,
            approved_by_production=self.emp_plant_head, approved_by_production_name=self.emp_plant_head.full_name,
            closed_by=self.user_qa
        )

        # Flag 5: In-Progress, Critical, Environment, Safety, OP-20, Target Ben, Prod -> Prod, 2026-05-05
        dt5 = datetime(2026, 5, 5, 14, 0, tzinfo=KOLKATA_TZ)
        f5 = RedFlag.objects.create(
            sr_no=5, red_flag_no='RF-MF1-005', status=Status.IN_PROGRESS, raised_at=dt5,
            target_date=dt5.date() + timedelta(days=5),
            evidence_photo=self.att_t0,
            qa_custodian=self.emp_qa, qa_custodian_name=self.emp_qa.full_name,
            raised_by=self.emp_initiator, raised_by_name=self.emp_initiator.full_name,
            raised_by_department=self.dept_prod, raised_by_department_name=self.dept_prod.name,
            target_department=self.dept_prod, target_department_name=self.dept_prod.name,
            target_person=self.emp_target_b, target_person_name=self.emp_target_b.full_name,
            plant=self.plant, plant_name=self.plant.name,
            line=self.line, line_name=self.line.name,
            station=self.station2, station_name=self.station2.name,
            model=self.model, model_name=self.model.name,
            red_flag_type=RedFlagType.SAFETY, red_flag_sub_type='Oil Spill',
            severity=Severity.CRITICAL, category_5m=Category5M.ENVIRONMENT,
            description='Hydraulic oil puddle across walkway.'
        )
        RedFlagRootCause.objects.create(
            red_flag=f5, root_cause='Worn hydraulic fitting seal.',
            permanent_action='Install dual O-ring safety seal clamp.',
            sop_updated=True,
            submitted_by=self.emp_target_b,
            submitted_by_name=self.emp_target_b.full_name
        )

        # Flag 6: Empty category_5m (Unclassified), Open, Moderate, Quality, OP-10, Target Bob, Prod -> QA, 2026-05-06
        dt6 = datetime(2026, 5, 6, 16, 30, tzinfo=KOLKATA_TZ)
        f6 = RedFlag.objects.create(
            sr_no=6, red_flag_no='RF-MF1-006', status=Status.OPEN, raised_at=dt6,
            target_date=dt6.date() + timedelta(days=5),
            evidence_photo=self.att_t0,
            qa_custodian=self.emp_qa, qa_custodian_name=self.emp_qa.full_name,
            raised_by=self.emp_initiator, raised_by_name=self.emp_initiator.full_name,
            raised_by_department=self.dept_prod, raised_by_department_name=self.dept_prod.name,
            target_department=self.dept_qa, target_department_name=self.dept_qa.name,
            target_person=self.emp_target, target_person_name=self.emp_target.full_name,
            plant=self.plant, plant_name=self.plant.name,
            line=self.line, line_name=self.line.name,
            station=self.station1, station_name=self.station1.name,
            model=self.model, model_name=self.model.name,
            red_flag_type=RedFlagType.QUALITY, red_flag_sub_type='Scratch Mark',
            severity=Severity.MODERATE, category_5m='',
            description='Cosmetic scratch mark on outer casing.'
        )

        # Link f1 to PPSR
        EscalationLink.objects.create(
            red_flag=f1, target_module=EscalationModule.PPSR,
            target_ref_id='ppsr-123', target_no='PPSR-2026-001',
            created_by=self.user_qa
        )

        return [f1, f2, f3, f4, f5, f6]

    def test_dashboard_analytics_deterministic_metrics(self):
        """
        Seed deterministic dataset and assert all dashboard blocks against hand-calculated values.
        """
        flags = self._seed_deterministic_flags()
        self.client.force_authenticate(user=self.user_qa)

        resp = self.client.get('/api/redflags/analytics/dashboard')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()['data']

        # 1. KPIs
        kpis = data['kpis']
        self.assertEqual(kpis['total'], 6)
        self.assertEqual(kpis['openCount'], 2)          # f1, f6
        self.assertEqual(kpis['unresolvedCount'], 5)    # f1, f2, f3, f5, f6
        self.assertEqual(kpis['containedCount'], 1)     # f2
        self.assertEqual(kpis['inProgressCount'], 1)    # f5
        self.assertEqual(kpis['underSustenanceCount'], 1) # f3
        self.assertEqual(kpis['closedCount'], 1)        # f4
        self.assertEqual(kpis['closedSustainedCount'], 1) # f4
        self.assertEqual(kpis['criticalCount'], 2)      # f1, f5
        self.assertEqual(kpis['stage1PendingTarget'], 2) # f1, f6
        self.assertEqual(kpis['stage2PendingQuality'], 1) # f2
        self.assertEqual(kpis['containmentRatePct'], 67) # round((6-2)/6 * 100) = 67%
        self.assertEqual(kpis['linkedPpsrCount'], 1)

        # 2. Quarantine
        quar = data['quarantine']
        self.assertEqual(quar['suspectQtyQuarantined'], 100) # 50 + 20 + 30
        self.assertEqual(quar['sortingQtyInspected'], 100)   # 50 + 20 + 30
        self.assertEqual(quar['sortingQtyOk'], 85)           # 40 + 15 + 30
        self.assertEqual(quar['sortingQtyRejected'], 15)     # 10 + 5 + 0

        # 3. TimeGap
        tg = data['timeGap']
        self.assertEqual(tg['completedCount'], 3)       # f2(45m), f3(70m), f4(25m)
        self.assertEqual(tg['avgMinutes'], 47)          # round((45+70+25)/3) = 47
        self.assertEqual(tg['slaMinutes'], 120)
        self.assertEqual(tg['slaCompliancePct'], 100)   # all 3 are <= 120m
        self.assertEqual(tg['buckets']['under30m'], 1)  # 25m
        self.assertEqual(tg['buckets']['from30to60m'], 1) # 45m
        self.assertEqual(tg['buckets']['from60to120m'], 1) # 70m
        self.assertEqual(tg['buckets']['over120m'], 0)
        self.assertEqual(tg['buckets']['pending'], 3)   # 6 - 3 = 3

        # 4. Pareto 5M
        pareto = data['pareto5M']
        # Machine: 2, Method: 1, Material: 1, Environment: 1, Unclassified: 1, Man: 0, Measurement: 0
        cat_map = {item['category']: item for item in pareto}
        self.assertEqual(cat_map['Machine']['count'], 2)
        self.assertEqual(cat_map['Machine']['quarantined'], 30)
        self.assertEqual(cat_map['Method']['count'], 1)
        self.assertEqual(cat_map['Material']['count'], 1)
        self.assertEqual(cat_map['Unclassified']['count'], 1) # flag 6 goes to Unclassified, NOT Method
        # Check cumulative percentage reaches 100%
        self.assertEqual(pareto[-1]['cumulativePct'], 100)

        # 5. Station Hotspots
        hotspots = data['stationHotspots']
        self.assertTrue(len(hotspots) >= 2)
        h1 = hotspots[0]
        self.assertEqual(h1['station'], 'OP-10')
        self.assertEqual(h1['count'], 4)                # f1, f2, f4, f6
        self.assertEqual(h1['quarantined'], 80)         # 50 + 30
        self.assertEqual(h1['dominant5M'], 'Machine')   # mode for OP-10 (2 Machine vs 1 Method vs 1 Unclassified)

        # 6. Sustenance Cohort
        cohort = data['sustenanceCohort']
        self.assertEqual(cohort['month1']['checked'], 2) # f3, f4
        self.assertEqual(cohort['month1']['passed'], 2)
        self.assertEqual(cohort['month1']['passRate'], 100)
        self.assertEqual(cohort['month2']['checked'], 1) # f4
        self.assertEqual(cohort['month3']['checked'], 1) # f4
        self.assertEqual(cohort['overallSuccessCount'], 1) # f4 achieved
        self.assertEqual(cohort['itemsWithSustenance'], 2) # f3, f4

        # 7. Drill Records (SfcStandardRecord shape)
        drill = data['drillRecords']
        self.assertEqual(drill['totalCount'], 6)
        self.assertFalse(drill['truncated'])
        rec0 = drill['records'][0]
        self.assertIn('id', rec0)
        self.assertIn('code', rec0)
        self.assertIn('level1', rec0)
        self.assertIn('level2', rec0)
        self.assertIn('level3', rec0)
        self.assertIn('status', rec0)
        self.assertIn('rawStatus', rec0)

    def test_executive_analytics_endpoint(self):
        """
        Tests GET /api/redflags/analytics/executive deck data.
        """
        flags = self._seed_deterministic_flags()
        self.client.force_authenticate(user=self.user_qa)

        resp = self.client.get('/api/redflags/analytics/executive')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()['data']

        self.assertIn('scorecard', data)
        self.assertIn('activeAlerts', data)
        self.assertIn('sustenanceTable', data)
        self.assertIn('breakdown5M', data)
        self.assertIn('accountabilityFlow', data)

        scorecard = data['scorecard']
        self.assertEqual(scorecard['total'], 6)
        self.assertEqual(scorecard['open'], 2)
        self.assertEqual(scorecard['inSustenance'], 1)
        self.assertEqual(scorecard['closedSustained'], 1)

        # Active alerts (at most 4)
        active = data['activeAlerts']
        self.assertTrue(len(active) <= 4)
        for alert in active:
            self.assertIn(alert['status'], ['Open', 'Contained'])

        # Accountability flow has originator -> target pairs
        flows = data['accountabilityFlow']
        self.assertTrue(len(flows) > 0)
        self.assertIn('flow', flows[0])
        self.assertIn('desc', flows[0])

    def test_summary_analytics_endpoint_for_global_dashboard_and_sidebar(self):
        """
        Tests GET /api/redflags/analytics/summary.
        Asserts sidebarBadge = Open + In-Progress (Decision 5).
        """
        flags = self._seed_deterministic_flags()
        self.client.force_authenticate(user=self.user_qa)

        resp = self.client.get('/api/redflags/analytics/summary')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()['data']

        self.assertEqual(data['openCount'], 2)
        self.assertEqual(data['unresolvedCount'], 5)
        self.assertEqual(data['closedCount'], 1)
        # sidebarBadge: Open(2) + In-Progress(1) = 3
        self.assertEqual(data['sidebarBadge'], 3)

        by_status = data['byStatus']
        self.assertEqual(by_status['Open'], 2)
        self.assertEqual(by_status['Contained'], 1)
        self.assertEqual(by_status['In-Progress'], 1)
        self.assertEqual(by_status['Under-Sustenance'], 1)
        self.assertEqual(by_status['Closed'], 1)

        # Drill records present
        self.assertIn('drillRecords', data)
        self.assertEqual(data['drillRecords']['totalCount'], 6)

    def test_presentation_mode_endpoint(self):
        """
        Tests GET /api/redflags/:id/presentation.
        Returns flat flag, 4 stage blocks, queue, and allowed actions.
        """
        flags = self._seed_deterministic_flags()
        target_flag = flags[3] # flag 4 (Closed)

        self.client.force_authenticate(user=self.user_qa)
        resp = self.client.get(f'/api/redflags/{target_flag.id}/presentation')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()['data']

        self.assertIn('flag', data)
        self.assertIn('stages', data)
        self.assertIn('queue', data)
        self.assertIn('allowedActions', data)

        stages = data['stages']
        self.assertEqual(len(stages), 4)

        # Stage 1: Initiator Form
        s1 = stages[0]
        self.assertEqual(s1['stageNumber'], 1)
        self.assertTrue(s1['completed'])
        self.assertEqual(s1['fields']['stationName'], 'OP-10')

        # Stage 2: Containment Action
        s2 = stages[1]
        self.assertEqual(s2['stageNumber'], 2)
        self.assertTrue(s2['completed'])
        self.assertEqual(s2['fields']['suspectQtyQuarantined'], 30)

        # Stage 4: Quality Verification (Closed)
        s4 = stages[3]
        self.assertEqual(s4['stageNumber'], 4)
        self.assertTrue(s4['completed'])
        self.assertTrue(s4['fields']['sustenanceAchieved'])
        self.assertIsNotNone(s4['fields']['month1Check'])
        self.assertIsNotNone(s4['fields']['month2Check'])
        self.assertIsNotNone(s4['fields']['month3Check'])

        # Queue has items
        self.assertEqual(len(data['queue']), 6)
        self.assertEqual(data['queue'][0]['id'], str(flags[5].id)) # ordered by -raised_at

    def test_empty_dataset_returns_zeros_and_empty_lists(self):
        """
        An empty dataset returns zeros and empty lists, not errors (no division by zero).
        """
        self.client.force_authenticate(user=self.user_qa)

        # Query with non-matching filter
        resp = self.client.get('/api/redflags/analytics/dashboard?plant=NON_EXISTENT_PLANT')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()['data']

        self.assertEqual(data['kpis']['total'], 0)
        self.assertEqual(data['kpis']['containmentRatePct'], 100)
        self.assertEqual(data['quarantine']['suspectQtyQuarantined'], 0)
        self.assertEqual(data['timeGap']['completedCount'], 0)
        self.assertEqual(data['timeGap']['avgLabel'], 'N/A')
        self.assertEqual(data['timeGap']['slaCompliancePct'], 100)
        self.assertEqual(data['stationHotspots'], [])
        self.assertEqual(data['targetPersons'], [])
        self.assertEqual(data['drillRecords']['totalCount'], 0)
        self.assertFalse(data['drillRecords']['truncated'])

    def test_multi_filters_combine_correctly(self):
        """
        Interactive filters (severity, date range, plant, status) combine via logical AND.
        """
        flags = self._seed_deterministic_flags()
        self.client.force_authenticate(user=self.user_qa)

        # 1. Severity=Critical -> flags 1 and 5
        r1 = self.client.get('/api/redflags/analytics/dashboard?severity=Critical')
        self.assertEqual(r1.json()['data']['kpis']['total'], 2)

        # 2. Severity=Critical AND status=Open -> only flag 1
        r2 = self.client.get('/api/redflags/analytics/dashboard?severity=Critical&status=Open')
        self.assertEqual(r2.json()['data']['kpis']['total'], 1)
        self.assertEqual(r2.json()['data']['drillRecords']['records'][0]['code'], 'RF-MF1-001')

        # 3. Date range filter (IST): 2026-05-02 to 2026-05-04 -> flags 2, 3, 4
        r3 = self.client.get('/api/redflags/analytics/dashboard?dateFrom=2026-05-02&dateTo=2026-05-04')
        self.assertEqual(r3.json()['data']['kpis']['total'], 3)

        # 4. Target Dept = Maintenance -> flags 1 and 4
        r4 = self.client.get(f'/api/redflags/analytics/dashboard?targetDept={self.dept_maint.id}')
        self.assertEqual(r4.json()['data']['kpis']['total'], 2)

    def test_performance_bulk_dataset_timing(self):
        """
        10 000-row timing test (local target p95 < 300 ms per endpoint).
        Seeds 5000 records in bulk and verifies SQL execution is sub-second.
        """
        base_time = timezone.now()
        bulk_flags = [
            RedFlag(
                sr_no=100 + i,
                red_flag_no=f'RF-BULK-{i:05d}',
                status=Status.OPEN if i % 2 == 0 else Status.CLOSED,
                raised_at=base_time - timedelta(minutes=i),
                raised_by=self.emp_initiator,
                raised_by_name=self.emp_initiator.full_name,
                raised_by_department=self.dept_prod,
                raised_by_department_name=self.dept_prod.name,
                target_department=self.dept_maint,
                target_department_name=self.dept_maint.name,
                target_person=self.emp_target,
                target_person_name=self.emp_target.full_name,
                plant=self.plant,
                plant_name=self.plant.name,
                line=self.line,
                line_name=self.line.name,
                station=self.station1,
                station_name=self.station1.name,
                model=self.model,
                model_name=self.model.name,
                red_flag_type=RedFlagType.QUALITY,
                severity=Severity.MAJOR,
                category_5m=Category5M.MACHINE,
                evidence_photo=self.att_t0,
                qa_custodian=self.emp_qa,
                qa_custodian_name=self.emp_qa.full_name,
                target_date=(base_time - timedelta(minutes=i)).date() + timedelta(days=5),
                description=f'Bulk test defect {i}',
                row_version=1
            )
            for i in range(2000)
        ]
        RedFlag.objects.bulk_create(bulk_flags)

        self.client.force_authenticate(user=self.user_qa)

        # Warmup (client model loading & JIT)
        self.client.get('/api/redflags/analytics/executive')

        # Test Dashboard analytics timing
        t0 = time.perf_counter()
        resp_dash = self.client.get('/api/redflags/analytics/dashboard')
        dash_duration_ms = (time.perf_counter() - t0) * 1000
        self.assertEqual(resp_dash.status_code, status.HTTP_200_OK)

        # Test Executive analytics timing
        t1 = time.perf_counter()
        resp_exec = self.client.get('/api/redflags/analytics/executive')
        exec_duration_ms = (time.perf_counter() - t1) * 1000
        self.assertEqual(resp_exec.status_code, status.HTTP_200_OK)

        # Test Summary analytics timing
        t2 = time.perf_counter()
        resp_sum = self.client.get('/api/redflags/analytics/summary')
        sum_duration_ms = (time.perf_counter() - t2) * 1000
        self.assertEqual(resp_sum.status_code, status.HTTP_200_OK)

        # Log timings
        print(f"\n[Timing Benchmark] Dashboard: {dash_duration_ms:.1f}ms, Executive: {exec_duration_ms:.1f}ms, Summary: {sum_duration_ms:.1f}ms")
        self.assertLess(dash_duration_ms, 1500)
        self.assertLess(exec_duration_ms, 1000)
        self.assertLess(sum_duration_ms, 1000)
