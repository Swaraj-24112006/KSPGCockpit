import io
from datetime import timedelta, date
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from rest_framework.test import APIClient

from redflag.models import (
    Plant, Department, Line, Station, ProductModel, Employee, RedFlagConfig,
    Attachment, RedFlag, StageHistory, RedFlagAuditLog,
    RedFlagContainment, RedFlagRootCause, SustenanceCheck, RedFlagClosure,
)
from redflag.enums import (
    RedFlagType, Severity, Category5M, Status, ContainmentStatus,
    QaCustodianStatus, CheckStatus, AttachmentKind,
)
from redflag.permissions import (
    GROUP_PLANT_HEAD, GROUP_QUALITY_CUSTODIAN, GROUP_TARGET_PERSON,
)

User = get_user_model()


class Phase4LifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Groups
        self.ph_group, _ = Group.objects.get_or_create(name=GROUP_PLANT_HEAD)
        self.qa_group, _ = Group.objects.get_or_create(name=GROUP_QUALITY_CUSTODIAN)
        self.tp_group, _ = Group.objects.get_or_create(name=GROUP_TARGET_PERSON)

        # Users
        self.user_initiator = User.objects.create_user(username='initiator', password='pw')
        self.user_target = User.objects.create_user(username='target_person', password='pw')
        self.user_qa = User.objects.create_user(username='qa_custodian', password='pw')
        self.user_plant_head = User.objects.create_user(username='plant_head', password='pw')
        self.user_random = User.objects.create_user(username='random_user', password='pw')

        # Assign groups
        self.user_target.groups.add(self.tp_group)
        self.user_qa.groups.add(self.qa_group)
        self.user_plant_head.groups.add(self.ph_group)

        # Masters
        self.dept_prod = Department.objects.create(name='Machining', code='MACH')
        self.dept_qa = Department.objects.create(name='Quality Assurance', code='QA')

        self.plant = Plant.objects.create(code='MF1', name='Manufacturing 1', is_active=True)
        self.line = Line.objects.create(plant=self.plant, name='Line 1')
        self.station = Station.objects.create(line=self.line, name='OP-10')
        self.model = ProductModel.objects.create(name='Model Alpha')

        # Employees
        self.emp_initiator = Employee.objects.create(
            user=self.user_initiator, employee_code='E001', full_name='Alice Initiator',
            designation='E001', department=self.dept_prod, plant=self.plant
        )
        self.emp_target = Employee.objects.create(
            user=self.user_target, employee_code='E002', full_name='Bob Target',
            designation='E002', department=self.dept_prod, plant=self.plant
        )
        self.emp_qa = Employee.objects.create(
            user=self.user_qa, employee_code='E003', full_name='Charlie QA',
            designation='E003', department=self.dept_qa, plant=self.plant
        )
        self.emp_plant_head = Employee.objects.create(
            user=self.user_plant_head, employee_code='E004', full_name='David PlantHead',
            designation='E004', department=self.dept_prod, plant=self.plant
        )

        self.plant.default_qa_custodian = self.emp_qa
        self.plant.plant_head = self.emp_plant_head
        self.plant.save()

        # Attachments
        self.att_t0 = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE, bucket='test-bucket', object_key='t0.jpg',
            original_name='t0.jpg', content_type='image/jpeg', size_bytes=100, sha256='aaa',
            uploaded_by=self.user_initiator
        )
        self.att_t1 = Attachment.objects.create(
            kind=AttachmentKind.T1_CONTAINMENT, bucket='test-bucket', object_key='t1.jpg',
            original_name='t1.jpg', content_type='image/jpeg', size_bytes=100, sha256='bbb',
            uploaded_by=self.user_target
        )
        self.att_m1 = Attachment.objects.create(
            kind=AttachmentKind.SUSTENANCE_AUDIT, bucket='test-bucket', object_key='m1.jpg',
            original_name='m1.jpg', content_type='image/jpeg', size_bytes=100, sha256='ccc',
            uploaded_by=self.user_qa
        )
        self.att_closure = Attachment.objects.create(
            kind=AttachmentKind.CLOSURE_EVIDENCE, bucket='test-bucket', object_key='closure.jpg',
            original_name='closure.jpg', content_type='image/jpeg', size_bytes=100, sha256='ddd',
            uploaded_by=self.user_qa
        )

        # Config: disable schedule enforcement by default for testing rapid progression
        self.config = RedFlagConfig.get_config()
        self.config.enforce_sustenance_schedule = False
        self.config.save()

    def _raise_test_flag(self):
        """Helper to raise an initial Red Flag in Open status."""
        self.client.force_authenticate(user=self.user_initiator)
        resp = self.client.post('/api/redflags', {
            'description': 'Machining dimensional out of spec on bore 42mm',
            'evidenceAttachmentId': str(self.att_t0.id),
            'plant': str(self.plant.id),
            'line': str(self.line.id),
            'station': str(self.station.id),
            'model': str(self.model.id),
            'redFlagType': RedFlagType.QUALITY,
            'severity': Severity.CRITICAL,
            'category5M': Category5M.MACHINE,
            'targetDepartment': str(self.dept_prod.id),
            'targetPerson': str(self.emp_target.id),
            'qaCustodian': str(self.emp_qa.id),
            'targetDate': '2026-11-10',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        return resp.json()['data']

    def test_full_lifecycle_http_raise_to_closure(self):
        """
        Acceptance Test:
        Drives a Red Flag end-to-end entirely through HTTP endpoints:
        Raise (Stage 1) -> Contain (Stage 2) -> Approve Containment -> Root Cause (Stage 3) ->
        Start Sustenance -> Log Month 1, 2, 3 Audits -> Close with Evidence & Sign-offs.
        Asserts complete stage history, state machine flags, and audit log entries.
        """
        # 1. Raise (Stage 1)
        flag_data = self._raise_test_flag()
        flag_id = flag_data['id']
        self.assertEqual(flag_data['status'], 'Open')
        self.assertEqual(flag_data['containmentStatus'], 'Pending')
        self.assertEqual(flag_data['qaCustodianStatus'], 'Review Pending')
        self.assertFalse(flag_data['sustenanceAchieved'])

        # 2. Contain (Stage 2) by Target Person
        self.client.force_authenticate(user=self.user_target)
        contain_resp = self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Quarantine Bay 2',
            'quarantineTagNo': 'QTAG-901',
            'suspectQtyQuarantined': 15,
            'sortingQtyInspected': 50,
            'sortingQtyOk': 35,
            'sortingQtyRejected': 15,
            'containmentAction': 'Stopped machine, isolated 15 defective parts with red tags, verified zero leakage.',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')
        self.assertEqual(contain_resp.status_code, 200)
        flag_data = contain_resp.json()['data']
        self.assertEqual(flag_data['status'], 'Contained')
        self.assertEqual(flag_data['containmentStatus'], 'Contained')
        self.assertEqual(flag_data['suspectQtyQuarantined'], 15)
        self.assertEqual(flag_data['sortingQtyInspected'], 50)
        self.assertEqual(flag_data['sortingQtyOk'], 35)
        self.assertEqual(flag_data['sortingQtyRejected'], 15)

        # 3. Approve Containment by QA Custodian
        self.client.force_authenticate(user=self.user_qa)
        app_resp = self.client.post(f'/api/redflags/{flag_id}/containment/approve', {
            'notes': 'Physical quarantine verified on shopfloor.'
        }, format='json')
        self.assertEqual(app_resp.status_code, 200)
        flag_data = app_resp.json()['data']
        self.assertEqual(flag_data['status'], 'Contained')
        self.assertEqual(flag_data['containmentStatus'], 'Verified')
        self.assertEqual(flag_data['qaCustodianStatus'], 'Containment Approved')
        self.assertEqual(flag_data['containmentVerifiedBy'], 'Charlie QA (E003)')

        # 4. Save Root Cause & Permanent Action (Stage 3)
        self.client.force_authenticate(user=self.user_target)
        rc_resp = self.client.put(f'/api/redflags/{flag_id}/root-cause', {
            'why1': 'Bore dimension 42mm exceeded upper specification limit.',
            'why2': 'Boring bar insert suffered micro-chipping during roughing pass.',
            'why3': 'Insert tool life limit reached without being replaced on shift 1.',
            'why4': 'Tool wear counter was not reset and warning was overlooked.',
            'rootCause5Why': 'Lack of interlocked automatic tool-life lockout on CNC controller.',
            'systematicPermanentAction': 'Configured hard controller interlock preventing spindle start on expired tool life.',
            'standardizationUpdates': {
                'sopUpdated': True,
                'pfmeaUpdated': True,
                'controlPlanUpdated': True,
                'onePointLessonIssued': True
            }
        }, format='json')
        self.assertEqual(rc_resp.status_code, 200)
        flag_data = rc_resp.json()['data']
        self.assertEqual(flag_data['status'], 'In-Progress')
        self.assertEqual(flag_data['why1'], 'Bore dimension 42mm exceeded upper specification limit.')
        self.assertEqual(flag_data['standardizationUpdates']['sopUpdated'], True)

        # 5. Start Sustenance Watch by QA Custodian
        self.client.force_authenticate(user=self.user_qa)
        start_resp = self.client.post(f'/api/redflags/{flag_id}/sustenance/start', {
            'notes': 'CAPA interlock verified on CNC machine OP-10.'
        }, format='json')
        self.assertEqual(start_resp.status_code, 200)
        flag_data = start_resp.json()['data']
        self.assertEqual(flag_data['status'], 'Under-Sustenance')
        self.assertEqual(flag_data['qaCustodianStatus'], 'In Sustenance')
        self.assertIsNotNone(flag_data['sustenanceStartDate'])
        self.assertIsNotNone(flag_data['month1Check'])
        self.assertIsNotNone(flag_data['month2Check'])
        self.assertIsNotNone(flag_data['month3Check'])
        self.assertEqual(flag_data['month1Check']['status'], 'Pending')
        self.assertFalse(flag_data['sustenanceAchieved'])

        # 6. Log Month 1 Audit (Passed)
        m1_resp = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/1', {
            'status': 'Passed',
            'observations': '30-day audit: 200 parts inspected, zero defect recurrence.',
            'photoAttachmentId': str(self.att_m1.id)
        }, format='json')
        self.assertEqual(m1_resp.status_code, 200)
        flag_data = m1_resp.json()['data']
        self.assertEqual(flag_data['month1Check']['status'], 'Passed')
        self.assertFalse(flag_data['sustenanceAchieved'])
        self.assertEqual(flag_data['status'], 'Under-Sustenance')

        # 7. Log Month 2 Audit (Passed)
        m2_resp = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/2', {
            'status': 'Passed',
            'observations': '60-day audit: tool counter logs verified, zero dimensional deviations.'
        }, format='json')
        self.assertEqual(m2_resp.status_code, 200)
        flag_data = m2_resp.json()['data']
        self.assertEqual(flag_data['month2Check']['status'], 'Passed')
        self.assertFalse(flag_data['sustenanceAchieved'])

        # 8. Log Month 3 Audit (Passed) -> Sets sustenanceAchieved = True (stays Under-Sustenance)
        m3_resp = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/3', {
            'status': 'Passed',
            'observations': '90-day audit complete. 3 consecutive months with zero recurrence.'
        }, format='json')
        self.assertEqual(m3_resp.status_code, 200)
        flag_data = m3_resp.json()['data']
        self.assertEqual(flag_data['month3Check']['status'], 'Passed')
        self.assertTrue(flag_data['sustenanceAchieved'])
        self.assertEqual(flag_data['status'], 'Under-Sustenance', "Flag must NOT auto-close upon 3 passes!")

        # 9. Close Red Flag with sign-offs and closure evidence
        close_resp = self.client.post(f'/api/redflags/{flag_id}/close', {
            'closureEvidence': str(self.att_closure.id),
            'validationTrialShifts': 3,
            'validationTrialResults': 'All 3 production shifts validated with zero defects.',
            'approvedByQa': str(self.emp_qa.id),
            'approvedByProduction': str(self.emp_plant_head.id),
        }, format='json')
        self.assertEqual(close_resp.status_code, 200)
        flag_data = close_resp.json()['data']
        self.assertEqual(flag_data['status'], 'Closed')
        self.assertEqual(flag_data['qaCustodianStatus'], 'Closed Approved')
        self.assertIsNotNone(flag_data['closureDate'])
        self.assertEqual(flag_data['validationTrialShifts'], 3)
        self.assertEqual(flag_data['approvedByProduction'], 'David PlantHead (E004)')

        # 10. Assert complete stage history
        stages_logged = [h['stage'] for h in flag_data['stageHistory']]
        self.assertIn('Detection', stages_logged)
        self.assertIn('Containment', stages_logged)
        self.assertIn('RootCause', stages_logged)
        self.assertIn('CAPA', stages_logged)
        self.assertIn('Sustenance', stages_logged)
        self.assertIn('Effectiveness', stages_logged)

        # 11. Assert audit logs recorded
        audit_count = RedFlagAuditLog.objects.filter(red_flag_id=flag_id).count()
        self.assertGreaterEqual(audit_count, 6)

    def test_containment_rejection_flow(self):
        """
        Tests rejecting Stage 2 containment:
        - Target Person submits containment -> Contained.
        - QA rejects with reason -> resets to Open, status Pending.
        - Target Person re-submits -> Contained.
        - QA approves -> Verified.
        """
        flag_data = self._raise_test_flag()
        flag_id = flag_data['id']

        # Submit containment
        self.client.force_authenticate(user=self.user_target)
        self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Quarantine Bay 1',
            'containmentAction': 'Moved parts to side',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')

        # QA rejects without reason -> 400 Bad Request
        self.client.force_authenticate(user=self.user_qa)
        bad_rej = self.client.post(f'/api/redflags/{flag_id}/containment/reject', {
            'reason': ''
        }, format='json')
        self.assertEqual(bad_rej.status_code, 400)

        # QA rejects with valid reason
        rej_resp = self.client.post(f'/api/redflags/{flag_id}/containment/reject', {
            'reason': 'No sorting counts provided and quarantine tags were missing on 5 parts.'
        }, format='json')
        self.assertEqual(rej_resp.status_code, 200)
        data = rej_resp.json()['data']
        self.assertEqual(data['status'], 'Open')
        self.assertEqual(data['containmentStatus'], 'Pending')
        self.assertEqual(data['qaCustodianStatus'], 'Review Pending')

        # Check history recorded rejection
        history_events = [h['event'] for h in StageHistory.objects.filter(red_flag_id=flag_id).values('event')]
        self.assertIn('CONTAINMENT_REJECTED', history_events)

        # Target person re-submits (attempt 2)
        self.client.force_authenticate(user=self.user_target)
        resub_resp = self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Quarantine Bay 1 - Locked Cage',
            'quarantineTagNo': 'QTAG-902',
            'suspectQtyQuarantined': 20,
            'sortingQtyInspected': 20,
            'sortingQtyOk': 0,
            'sortingQtyRejected': 20,
            'containmentAction': 'Tagged all 20 rejected parts with red scrap tags inside locked cage.',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')
        self.assertEqual(resub_resp.status_code, 200)
        self.assertEqual(resub_resp.json()['data']['status'], 'Contained')

        # QA approves attempt 2
        self.client.force_authenticate(user=self.user_qa)
        app_resp = self.client.post(f'/api/redflags/{flag_id}/containment/approve', {}, format='json')
        self.assertEqual(app_resp.status_code, 200)
        self.assertEqual(app_resp.json()['data']['containmentStatus'], 'Verified')

    def test_segregation_of_duties_containment_approval(self):
        """
        The user who submitted containment cannot approve it unless they have the Plant Head role.
        """
        flag_data = self._raise_test_flag()
        flag_id = flag_data['id']

        # Target person submits containment
        self.client.force_authenticate(user=self.user_target)
        self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Bay 3',
            'containmentAction': 'Parts contained.',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')

        # Target person also tries to approve containment -> 403 Forbidden!
        self.client.force_authenticate(user=self.user_target)
        resp = self.client.post(f'/api/redflags/{flag_id}/containment/approve', {}, format='json')
        self.assertEqual(resp.status_code, 403)

        # Plant Head CAN approve containment even if related
        self.client.force_authenticate(user=self.user_plant_head)
        ph_resp = self.client.post(f'/api/redflags/{flag_id}/containment/approve', {}, format='json')
        self.assertEqual(ph_resp.status_code, 200)
        self.assertEqual(ph_resp.json()['data']['containmentStatus'], 'Verified')

    def test_audit_order_enforcement(self):
        """
        Month 2 audit cannot be logged until Month 1 is Passed.
        Month 3 audit cannot be logged until Month 2 is Passed.
        """
        flag_data = self._raise_test_flag()
        flag_id = flag_data['id']

        # Setup flag up to Under-Sustenance
        self.client.force_authenticate(user=self.user_target)
        self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Bay 1', 'containmentAction': 'Contained',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')
        self.client.put(f'/api/redflags/{flag_id}/root-cause', {
            'rootCause5Why': 'Why...', 'systematicPermanentAction': 'Action...'
        }, format='json')
        self.client.force_authenticate(user=self.user_qa)
        self.client.post(f'/api/redflags/{flag_id}/sustenance/start', {}, format='json')

        # Try Month 2 before Month 1 -> 422 Unprocessable Entity
        resp_m2 = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/2', {
            'status': 'Passed'
        }, format='json')
        self.assertEqual(resp_m2.status_code, 422)
        self.assertIn('Month 1', resp_m2.json()['error'])

        # Log Month 1 Passed
        resp_m1 = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/1', {
            'status': 'Passed'
        }, format='json')
        self.assertEqual(resp_m1.status_code, 200)

        # Try Month 3 before Month 2 -> 422 Unprocessable Entity
        resp_m3 = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/3', {
            'status': 'Passed'
        }, format='json')
        self.assertEqual(resp_m3.status_code, 422)
        self.assertIn('Month 2', resp_m3.json()['error'])

    def test_schedule_enforcement_toggle(self):
        """
        When enforce_sustenance_schedule is True, audits earlier than scheduledDate - grace are rejected.
        """
        self.config.enforce_sustenance_schedule = True
        self.config.sustenance_schedule_grace_days = 3
        self.config.save()

        flag_data = self._raise_test_flag()
        flag_id = flag_data['id']

        self.client.force_authenticate(user=self.user_target)
        self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Bay 1', 'containmentAction': 'Contained',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')
        self.client.put(f'/api/redflags/{flag_id}/root-cause', {
            'rootCause5Why': 'Why...', 'systematicPermanentAction': 'Action...'
        }, format='json')

        self.client.force_authenticate(user=self.user_qa)
        self.client.post(f'/api/redflags/{flag_id}/sustenance/start', {}, format='json')

        # Month 1 is scheduled 30 days from today. Today is < (30 - 3) = 27 days early.
        early_resp = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/1', {
            'status': 'Passed'
        }, format='json')
        self.assertEqual(early_resp.status_code, 422)
        self.assertIn('cannot be performed before', early_resp.json()['error'].lower())

    def test_recurrence_detection_resets_and_increments_cycle(self):
        """
        Recurrence Detected:
        - Sends flag back to In-Progress.
        - sustenanceAchieved remains False.
        - qaCustodianStatus becomes Review Pending.
        - sustenance_cycle is incremented to 2.
        - Next sustenance start creates cycle 2 checks.
        """
        flag_data = self._raise_test_flag()
        flag_id = flag_data['id']

        self.client.force_authenticate(user=self.user_target)
        self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Bay 1', 'containmentAction': 'Contained',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')
        self.client.put(f'/api/redflags/{flag_id}/root-cause', {
            'rootCause5Why': 'Root cause...', 'systematicPermanentAction': 'Permanent action...'
        }, format='json')

        self.client.force_authenticate(user=self.user_qa)
        self.client.post(f'/api/redflags/{flag_id}/sustenance/start', {}, format='json')

        # Month 1 passed
        self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/1', {
            'status': 'Passed'
        }, format='json')

        # Month 2: Recurrence Detected without observations -> 422
        bad_rec = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/2', {
            'status': 'Recurrence Detected',
            'observations': ''
        }, format='json')
        self.assertEqual(bad_rec.status_code, 422)

        # Month 2: Recurrence Detected with observations -> Flag reopens
        rec_resp = self.client.post(f'/api/redflags/{flag_id}/sustenance/checks/2', {
            'status': 'Recurrence Detected',
            'observations': 'Same bore dimension out-of-spec reoccurred on batch #4402.'
        }, format='json')
        self.assertEqual(rec_resp.status_code, 200)
        data = rec_resp.json()['data']
        self.assertEqual(data['status'], 'In-Progress')
        self.assertFalse(data['sustenanceAchieved'])
        self.assertEqual(data['qaCustodianStatus'], 'Review Pending')

        # Verify DB sustenance_cycle advanced to 2
        flag = RedFlag.objects.get(id=flag_id)
        self.assertEqual(flag.sustenance_cycle, 2)

        # Target person updates RCA
        self.client.force_authenticate(user=self.user_target)
        self.client.put(f'/api/redflags/{flag_id}/root-cause', {
            'rootCause5Why': 'Updated root cause...', 'systematicPermanentAction': 'New sensor added...'
        }, format='json')

        # QA starts sustenance cycle 2
        self.client.force_authenticate(user=self.user_qa)
        start2_resp = self.client.post(f'/api/redflags/{flag_id}/sustenance/start', {
            'notes': 'Restarting sustenance watch for cycle 2'
        }, format='json')
        self.assertEqual(start2_resp.status_code, 200)
        data2 = start2_resp.json()['data']
        self.assertEqual(data2['status'], 'Under-Sustenance')

        # Verify cycle 2 checks exist
        checks_cycle2 = SustenanceCheck.objects.filter(red_flag_id=flag_id, cycle_no=2)
        self.assertEqual(checks_cycle2.count(), 3)
        self.assertEqual(data2['month1Check']['status'], 'Pending')

    def test_early_closure_authorization(self):
        """
        Early closure requires:
        - Must be Under-Sustenance.
        - Non-Plant-Head cannot authorize early closure (403 Forbidden).
        - Plant Head must provide an earlyClosureReason.
        - Sets closed_early = True.
        """
        flag_data = self._raise_test_flag()
        flag_id = flag_data['id']

        self.client.force_authenticate(user=self.user_target)
        self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Bay 1', 'containmentAction': 'Contained',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')
        self.client.put(f'/api/redflags/{flag_id}/root-cause', {
            'rootCause5Why': 'Why', 'systematicPermanentAction': 'Action'
        }, format='json')

        # Cannot close from In-Progress -> 422
        self.client.force_authenticate(user=self.user_plant_head)
        invalid_state = self.client.post(f'/api/redflags/{flag_id}/close', {
            'closureEvidence': str(self.att_closure.id),
            'earlyClosureReason': 'Product line discontinued.'
        }, format='json')
        self.assertEqual(invalid_state.status_code, 422)

        # Start sustenance
        self.client.force_authenticate(user=self.user_qa)
        self.client.post(f'/api/redflags/{flag_id}/sustenance/start', {}, format='json')

        # QA tries early closure -> 403 Forbidden
        qa_close = self.client.post(f'/api/redflags/{flag_id}/close', {
            'closureEvidence': str(self.att_closure.id),
            'earlyClosureReason': 'Line discontinued.'
        }, format='json')
        self.assertEqual(qa_close.status_code, 403)

        # Plant Head closes early without reason -> 422 Unprocessable Entity
        self.client.force_authenticate(user=self.user_plant_head)
        ph_no_reason = self.client.post(f'/api/redflags/{flag_id}/close', {
            'closureEvidence': str(self.att_closure.id),
            'earlyClosureReason': ''
        }, format='json')
        self.assertEqual(ph_no_reason.status_code, 422)

        # Plant Head closes early WITH reason -> 200 OK
        ph_close = self.client.post(f'/api/redflags/{flag_id}/close', {
            'closureEvidence': str(self.att_closure.id),
            'approvedByQa': str(self.emp_qa.id),
            'approvedByProduction': str(self.emp_plant_head.id),
            'earlyClosureReason': 'Engine model discontinued from serial production. No further parts produced.'
        }, format='json')
        self.assertEqual(ph_close.status_code, 200)
        data = ph_close.json()['data']
        self.assertEqual(data['status'], 'Closed')
        self.assertTrue(data['closedEarly'])

    def test_sustenance_due_endpoint_and_management_command(self):
        """
        Tests GET /api/redflags/sustenance/due and redflag_sustenance_digest command.
        """
        flag_data = self._raise_test_flag()
        flag_id = flag_data['id']

        self.client.force_authenticate(user=self.user_target)
        self.client.post(f'/api/redflags/{flag_id}/containment', {
            'quarantineLocation': 'Bay 1', 'containmentAction': 'Contained',
            'countermeasurePhotoId': str(self.att_t1.id),
        }, format='json')
        self.client.put(f'/api/redflags/{flag_id}/root-cause', {
            'rootCause5Why': 'Why', 'systematicPermanentAction': 'Action'
        }, format='json')

        self.client.force_authenticate(user=self.user_qa)
        self.client.post(f'/api/redflags/{flag_id}/sustenance/start', {}, format='json')

        # In DB, move Month 1 check scheduled_date to tomorrow (so it's due within 7 days)
        m1_check = SustenanceCheck.objects.get(red_flag_id=flag_id, month=1)
        m1_check.scheduled_date = timezone.localdate() + timedelta(days=2)
        m1_check.save()

        # GET /api/redflags/sustenance/due?withinDays=7
        due_resp = self.client.get('/api/redflags/sustenance/due?withinDays=7')
        self.assertEqual(due_resp.status_code, 200)
        due_items = due_resp.json()['data']
        self.assertEqual(len(due_items), 1)
        self.assertEqual(due_items[0]['redFlagNo'], flag_data['redFlagNo'])
        self.assertEqual(due_items[0]['month'], 1)
        self.assertEqual(due_items[0]['daysToDue'], 2)
        self.assertFalse(due_items[0]['isOverdue'])

        # Test management command execution
        out = io.StringIO()
        call_command('redflag_sustenance_digest', days=7, stdout=out)
        output_str = out.getvalue()
        self.assertIn(flag_data['redFlagNo'], output_str)
        self.assertIn("Found 1 pending sustenance check(s)", output_str)

