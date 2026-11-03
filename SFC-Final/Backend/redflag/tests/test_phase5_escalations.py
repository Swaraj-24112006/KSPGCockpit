import io
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from redflag.models import (
    Plant, Department, Line, Station, ProductModel, Employee, RedFlagConfig,
    Attachment, RedFlag, StageHistory, RedFlagAuditLog,
    RedFlagContainment, RedFlagRootCause, EscalationLink
)
from redflag.enums import (
    RedFlagType, Severity, Category5M, Status, ContainmentStatus,
    AttachmentKind, EscalationModule, EscalationState
)
from redflag.permissions import (
    GROUP_PLANT_HEAD, GROUP_QUALITY_CUSTODIAN, GROUP_TARGET_PERSON,
)
from redflag.services.escalation.base import TargetEscalationError
from redflag.services.escalation.bridge import BridgeEscalationAdapter

User = get_user_model()


class Phase5EscalationTests(TestCase):
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
            designation='Operator', department=self.dept_prod, plant=self.plant
        )
        self.emp_target = Employee.objects.create(
            user=self.user_target, employee_code='E002', full_name='Bob Target',
            designation='Line Leader', department=self.dept_prod, plant=self.plant
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
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='test-bucket',
            object_key='t0.jpg',
            original_name='t0.jpg',
            content_type='image/jpeg',
            size_bytes=1024,
            sha256='a' * 64,
            uploaded_by=self.user_initiator
        )
        self.att_t1 = Attachment.objects.create(
            kind=AttachmentKind.T1_CONTAINMENT,
            bucket='test-bucket',
            object_key='t1.jpg',
            original_name='t1.jpg',
            content_type='image/jpeg',
            size_bytes=1024,
            sha256='b' * 64,
            uploaded_by=self.user_target
        )

        # Config
        self.config = RedFlagConfig.get_config()
        self.config.containment_sla_minutes = 60
        self.config.enforce_sustenance_schedule = True
        self.config.grace_period_days = 2
        self.config.save()

    def _create_flag(self):
        self.client.force_authenticate(user=self.user_initiator)
        resp = self.client.post('/api/redflags', {
            'plant': str(self.plant.id),
            'line': str(self.line.id),
            'station': str(self.station.id),
            'model': str(self.model.id),
            'redFlagType': 'Process',
            'severity': 'Critical (Line Stop)',
            'category5M': 'Machine',
            'description': 'Machining center vibration causing severe bore chatter on cylinder block.',
            'targetDepartment': str(self.dept_prod.id),
            'targetPerson': str(self.emp_target.id),
            'evidenceAttachmentId': str(self.att_t0.id),
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        return resp.json()['data']['id']

    def _contain_and_rca_flag(self, flag_id, suspect_qty=25):
        # 1. Containment
        self.client.force_authenticate(user=self.user_target)
        c_resp = self.client.post(f'/api/redflags/{flag_id}/containment', {
            'containmentAction': 'Stopped machine spindle and isolated affected batch.',
            'countermeasurePhotoId': str(self.att_t1.id),
            'suspectQtyQuarantined': suspect_qty,
            'quarantineTagNo': 'TAG-999',
            'quarantineLocation': 'Hold Area B',
            'sortingQtyInspected': 50,
            'sortingQtyOk': 40,
            'sortingQtyRejected': 10,
        }, format='json')
        self.assertEqual(c_resp.status_code, 200)

        # 2. QA approve containment
        self.client.force_authenticate(user=self.user_qa)
        app_resp = self.client.post(f'/api/redflags/{flag_id}/containment/approve', {
            'notes': 'Quarantine verified.'
        }, format='json')
        self.assertEqual(app_resp.status_code, 200)

        # 3. RCA
        self.client.force_authenticate(user=self.user_target)
        rc_resp = self.client.put(f'/api/redflags/{flag_id}/root-cause', {
            'why1': 'Bore dimension 42mm exceeded tolerance limit.',
            'why2': 'Boring bar insert chipped.',
            'why3': 'Tool life limit exceeded.',
            'why4': 'Warning overlooked.',
            'rootCause5Why': 'Lack of interlocked automatic tool-life lockout.',
            'systematicPermanentAction': 'Install PLC tool wear lockout sensor interlock.',
            'standardizationUpdates': {'controlPlan': 'Updated', 'workInstruction': 'Revised'}
        }, format='json')
        self.assertEqual(rc_resp.status_code, 200)

    def test_ppsr_escalation_lifecycle_and_idempotency(self):
        """
        PPSR escalation creates an EscalationLink, StageHistory (stage=RootCause),
        AuditLog, preserves Red Flag status, and is strictly idempotent.
        """
        flag_id = self._create_flag()
        flag_before = RedFlag.objects.get(id=flag_id)
        status_before = flag_before.status
        self.assertEqual(status_before, Status.OPEN)

        # Escalate as QA Custodian
        self.client.force_authenticate(user=self.user_qa)
        resp1 = self.client.post(f'/api/redflags/{flag_id}/escalate-ppsr', {}, format='json')
        self.assertEqual(resp1.status_code, 200)
        data1 = resp1.json()['data']

        # Check response envelope & structure
        self.assertIn('redFlag', data1)
        self.assertIn('ppsr', data1)
        self.assertIn('link', data1)

        link_data = data1['link']
        ppsr_data = data1['ppsr']
        self.assertEqual(link_data['targetModule'], 'PPSR')
        self.assertTrue(link_data['targetNo'].startswith('PPSR-'))
        self.assertEqual(link_data['state'], 'PENDING_TARGET')
        self.assertEqual(ppsr_data['ppsrNo'], link_data['targetNo'])

        # Gating invariance: Red Flag status MUST NOT change
        flag_after = RedFlag.objects.get(id=flag_id)
        self.assertEqual(flag_after.status, status_before)

        # StageHistory check: stage=RootCause, event=ESCALATED
        sh = StageHistory.objects.filter(red_flag_id=flag_id, event='ESCALATED', stage='RootCause').first()
        self.assertIsNotNone(sh)
        self.assertIn(link_data['targetNo'], sh.notes)
        self.assertEqual(sh.from_status, Status.OPEN)
        self.assertEqual(sh.to_status, Status.OPEN)

        # Audit log check
        audit = RedFlagAuditLog.objects.filter(red_flag_id=flag_id, action='ESCALATED').first()
        self.assertIsNotNone(audit)
        self.assertIn('escalation_ppsr', audit.changes)

        # Second call: IDEMPOTENT (no duplicate records, returns 200 with existing link)
        resp2 = self.client.post(f'/api/redflags/{flag_id}/escalate-ppsr', {}, format='json')
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()['data']

        self.assertEqual(data2['link']['id'], link_data['id'])
        self.assertEqual(data2['link']['targetNo'], link_data['targetNo'])
        self.assertEqual(EscalationLink.objects.filter(red_flag_id=flag_id, target_module='PPSR').count(), 1)
        self.assertEqual(StageHistory.objects.filter(red_flag_id=flag_id, event='ESCALATED', stage='RootCause').count(), 1)

        # Detail view check: linkedPpsrNo and linkedPpsrId exposed, escalatePpsr removed from allowedActions
        detail_resp = self.client.get(f'/api/redflags/{flag_id}')
        self.assertEqual(detail_resp.status_code, 200)
        detail = detail_resp.json()['data']
        self.assertEqual(detail['linkedPpsrId'], link_data['targetRefId'])
        self.assertEqual(detail['linkedPpsrNo'], link_data['targetNo'])
        self.assertNotIn('escalatePpsr', detail['allowedActions'])

    def test_kaizen_conversion_gating_and_cost_fields_omitted(self):
        """
        Kaizen conversion requires systematicPermanentAction.
        Generated Kaizen payload MUST NOT contain cost fields (costBefore/costAfter/costSavings).
        """
        flag_id = self._create_flag()

        # Gating check: Cannot convert to Kaizen without systematicPermanentAction
        self.client.force_authenticate(user=self.user_qa)
        fail_resp = self.client.post(f'/api/redflags/{flag_id}/convert-kaizen', {}, format='json')
        self.assertEqual(fail_resp.status_code, 422)
        self.assertIn('permanent action', fail_resp.json()['error'].lower())

        # Now submit containment and root cause with permanent action
        self._contain_and_rca_flag(flag_id)

        # Convert to Kaizen as QA
        self.client.force_authenticate(user=self.user_qa)
        resp = self.client.post(f'/api/redflags/{flag_id}/convert-kaizen', {}, format='json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()['data']

        self.assertIn('kaizen', data)
        self.assertIn('link', data)
        kaizen_data = data['kaizen']
        link_data = data['link']

        self.assertEqual(link_data['targetModule'], 'KAIZEN')
        self.assertTrue(link_data['targetNo'].startswith('KZ-'))
        self.assertEqual(kaizen_data['srNo'], link_data['targetNo'])

        # Verify StageHistory: stage=CAPA, event=ESCALATED
        sh = StageHistory.objects.filter(red_flag_id=flag_id, event='ESCALATED', stage='CAPA').first()
        self.assertIsNotNone(sh)
        self.assertIn(link_data['targetNo'], sh.notes)

        # CRITICAL TEST: Cost fields MUST NOT be present in the Kaizen payload
        link_obj = EscalationLink.objects.get(id=link_data['id'])
        payload = link_obj.payload
        self.assertNotIn('costBefore', payload)
        self.assertNotIn('costAfter', payload)
        self.assertNotIn('costSavings', payload)
        self.assertNotIn('cost_before', payload)
        self.assertNotIn('cost_after', payload)
        self.assertNotIn('cost_savings', payload)

        # Title and problem / countermeasure fields
        self.assertTrue(payload['title'].startswith('Poka-Yoke: Eliminate'))
        self.assertEqual(payload['counterMeasureAfter'], 'Install PLC tool wear lockout sensor interlock.')
        self.assertEqual(payload['plant'], 'MF1')
        self.assertEqual(payload['line'], 'Line 1')
        self.assertEqual(payload['station'], 'OP-10')

        # Idempotency check
        resp_dup = self.client.post(f'/api/redflags/{flag_id}/convert-kaizen', {}, format='json')
        self.assertEqual(resp_dup.status_code, 200)
        self.assertEqual(resp_dup.json()['data']['link']['id'], link_data['id'])
        self.assertEqual(EscalationLink.objects.filter(red_flag_id=flag_id, target_module='KAIZEN').count(), 1)

    def test_five_s_red_tag_linking_and_gating(self):
        """
        5S Red Tag requires containment on file with suspectQtyQuarantined > 0.
        Allowed for Target Person, Quality Custodian, or Plant Head.
        """
        flag_id = self._create_flag()

        # 1. Gating check: No containment on file -> 422
        self.client.force_authenticate(user=self.user_target)
        resp_no_cont = self.client.post(f'/api/redflags/{flag_id}/link-fives', {}, format='json')
        self.assertEqual(resp_no_cont.status_code, 422)
        self.assertIn('greater than 0', resp_no_cont.json()['error'])

        # 2. Containment with suspectQty = 0 -> 422
        self.client.post(f'/api/redflags/{flag_id}/containment', {
            'containmentAction': 'Cleaned work area.',
            'countermeasurePhotoId': str(self.att_t1.id),
            'suspectQtyQuarantined': 0,
            'quarantineLocation': 'Hold Area B',
        }, format='json')

        resp_zero_qty = self.client.post(f'/api/redflags/{flag_id}/link-fives', {}, format='json')
        self.assertEqual(resp_zero_qty.status_code, 422)
        self.assertIn('greater than 0', resp_zero_qty.json()['error'])

        # Reject attempt 1 as QA Custodian so attempt 2 can be submitted
        self.client.force_authenticate(user=self.user_qa)
        rej_resp = self.client.post(f'/api/redflags/{flag_id}/containment/reject', {
            'reason': 'Zero suspect quantity quarantined. Physical hold required.'
        }, format='json')
        self.assertEqual(rej_resp.status_code, 200)

        # 3. Containment with suspectQty = 35 -> Success
        self.client.force_authenticate(user=self.user_target)
        c2_resp = self.client.post(f'/api/redflags/{flag_id}/containment', {
            'containmentAction': 'Quarantined 35 pieces of raw stock.',
            'countermeasurePhotoId': str(self.att_t1.id),
            'suspectQtyQuarantined': 35,
            'quarantineTagNo': 'QT-35',
            'quarantineLocation': 'Hold Area C',
            'sortingQtyInspected': 35,
            'sortingQtyRejected': 35,
        }, format='json')
        self.assertEqual(c2_resp.status_code, 200)

        # Target Person executes link
        resp_link = self.client.post(f'/api/redflags/{flag_id}/link-fives', {}, format='json')
        self.assertEqual(resp_link.status_code, 200)
        data = resp_link.json()['data']

        self.assertIn('redTag', data)
        self.assertIn('link', data)
        link_data = data['link']
        tag_data = data['redTag']

        self.assertEqual(link_data['targetModule'], 'FIVES_RED_TAG')
        self.assertTrue(link_data['targetNo'].startswith('RT-'))
        self.assertEqual(tag_data['tagNo'], link_data['targetNo'])

        # Check StageHistory: stage=Containment, event=ESCALATED
        sh = StageHistory.objects.filter(red_flag_id=flag_id, event='ESCALATED', stage='Containment').first()
        self.assertIsNotNone(sh)
        self.assertIn(link_data['targetNo'], sh.notes)

        # Check payload fields
        link_obj = EscalationLink.objects.get(id=link_data['id'])
        payload = link_obj.payload
        self.assertEqual(payload['quantity'], 35)
        self.assertEqual(payload['unit'], 'pcs')
        # Category5M was 'Machine' -> category should be 'Tooling / Jig'
        self.assertEqual(payload['category'], 'Tooling / Jig')
        self.assertEqual(payload['location'], 'Hold Area C')

        # Idempotency
        resp_dup = self.client.post(f'/api/redflags/{flag_id}/link-fives', {}, format='json')
        self.assertEqual(resp_dup.status_code, 200)
        self.assertEqual(resp_dup.json()['data']['link']['id'], link_data['id'])
        self.assertEqual(EscalationLink.objects.filter(red_flag_id=flag_id, target_module='FIVES_RED_TAG').count(), 1)

    def test_gating_cannot_escalate_closed_flag(self):
        """
        Escalation endpoints must return 422 if the Red Flag is Closed.
        """
        flag_id = self._create_flag()
        self._contain_and_rca_flag(flag_id, suspect_qty=10)

        # QA starts sustenance
        self.client.force_authenticate(user=self.user_qa)
        start_resp = self.client.post(f'/api/redflags/{flag_id}/sustenance/start', {
            'notes': 'Starting watch for closure test.'
        }, format='json')
        self.assertEqual(start_resp.status_code, 200)

        # Close the flag early as Plant Head
        self.client.force_authenticate(user=self.user_plant_head)
        close_resp = self.client.post(f'/api/redflags/{flag_id}/close', {
            'closureEvidence': str(self.att_t1.id),
            'earlyClosureReason': 'Direct managerial sign-off and process shift.',
        }, format='json')
        self.assertEqual(close_resp.status_code, 200)
        flag = RedFlag.objects.get(id=flag_id)
        self.assertEqual(flag.status, Status.CLOSED)

        # Attempt PPSR -> 422
        resp_ppsr = self.client.post(f'/api/redflags/{flag_id}/escalate-ppsr', {}, format='json')
        self.assertEqual(resp_ppsr.status_code, 422)
        self.assertIn('closed', resp_ppsr.json()['error'].lower())

        # Attempt Kaizen -> 422
        resp_kz = self.client.post(f'/api/redflags/{flag_id}/convert-kaizen', {}, format='json')
        self.assertEqual(resp_kz.status_code, 422)
        self.assertIn('closed', resp_kz.json()['error'].lower())

        # Attempt 5S -> 422
        resp_fives = self.client.post(f'/api/redflags/{flag_id}/link-fives', {}, format='json')
        self.assertEqual(resp_fives.status_code, 422)
        self.assertIn('closed', resp_fives.json()['error'].lower())

    def test_permission_enforcement(self):
        """
        PPSR and Kaizen: Quality Custodian or Plant Head only (others get 403).
        5S Red Tag: Target Person, Quality Custodian, or Plant Head (others get 403).
        """
        flag_id = self._create_flag()
        self._contain_and_rca_flag(flag_id, suspect_qty=15)

        # Random user without roles -> 403 on all
        self.client.force_authenticate(user=self.user_random)
        self.assertEqual(self.client.post(f'/api/redflags/{flag_id}/escalate-ppsr', {}).status_code, 403)
        self.assertEqual(self.client.post(f'/api/redflags/{flag_id}/convert-kaizen', {}).status_code, 403)
        self.assertEqual(self.client.post(f'/api/redflags/{flag_id}/link-fives', {}).status_code, 403)

        # Target person -> 403 on PPSR & Kaizen, 200 on 5S Red Tag
        self.client.force_authenticate(user=self.user_target)
        self.assertEqual(self.client.post(f'/api/redflags/{flag_id}/escalate-ppsr', {}).status_code, 403)
        self.assertEqual(self.client.post(f'/api/redflags/{flag_id}/convert-kaizen', {}).status_code, 403)
        self.assertEqual(self.client.post(f'/api/redflags/{flag_id}/link-fives', {}).status_code, 200)

        # Plant head -> allowed on PPSR & Kaizen
        self.client.force_authenticate(user=self.user_plant_head)
        self.assertEqual(self.client.post(f'/api/redflags/{flag_id}/escalate-ppsr', {}).status_code, 200)
        self.assertEqual(self.client.post(f'/api/redflags/{flag_id}/convert-kaizen', {}).status_code, 200)

    def test_target_failure_rollback(self):
        """
        If the target adapter raises an error, the database transaction rolls back,
        nothing is linked, no StageHistory is recorded, and the caller gets a 502 Bad Gateway.
        """
        flag_id = self._create_flag()

        with patch('redflag.services.escalate_red_flag.get_escalation_adapter') as mock_get_adapter:
            mock_adapter = MagicMock()
            mock_adapter.create_from_red_flag.side_effect = TargetEscalationError("Express server timeout on POST /api/ppsrreports")
            mock_get_adapter.return_value = mock_adapter

            self.client.force_authenticate(user=self.user_qa)
            resp = self.client.post(f'/api/redflags/{flag_id}/escalate-ppsr', {}, format='json')

            # 502 Bad Gateway with clear message
            self.assertEqual(resp.status_code, 502)
            self.assertIn('Express server timeout', resp.json()['error'])

            # Nothing linked in DB
            self.assertEqual(EscalationLink.objects.filter(red_flag_id=flag_id, target_module='PPSR').count(), 0)
            self.assertEqual(StageHistory.objects.filter(red_flag_id=flag_id, event='ESCALATED').count(), 0)
            self.assertEqual(RedFlagAuditLog.objects.filter(red_flag_id=flag_id, action='ESCALATED').count(), 0)

            # Flag status unchanged
            flag = RedFlag.objects.get(id=flag_id)
            self.assertEqual(flag.status, Status.OPEN)

    def test_read_serializer_linked_fields_and_allowed_actions(self):
        """
        When all 3 escalations are linked, RedFlagReadSerializer exposes all IDs and numbers,
        and allowedActions omits escalatePpsr, convertKaizen, linkFiveS.
        """
        flag_id = self._create_flag()
        self._contain_and_rca_flag(flag_id, suspect_qty=20)

        # Check allowedActions before escalations
        self.client.force_authenticate(user=self.user_qa)
        resp_before = self.client.get(f'/api/redflags/{flag_id}')
        actions_before = resp_before.json()['data']['allowedActions']
        self.assertIn('escalatePpsr', actions_before)
        self.assertIn('convertKaizen', actions_before)
        self.assertIn('linkFiveS', actions_before)

        # Perform all 3 escalations
        self.client.post(f'/api/redflags/{flag_id}/escalate-ppsr', {}, format='json')
        self.client.post(f'/api/redflags/{flag_id}/convert-kaizen', {}, format='json')
        self.client.post(f'/api/redflags/{flag_id}/link-fives', {}, format='json')

        # Read refreshed flag
        resp_after = self.client.get(f'/api/redflags/{flag_id}')
        self.assertEqual(resp_after.status_code, 200)
        data = resp_after.json()['data']

        self.assertTrue(data['linkedPpsrNo'].startswith('PPSR-'))
        self.assertTrue(data['linkedKaizenNo'].startswith('KZ-'))
        self.assertTrue(data['linkedFiveSRedTagNo'].startswith('RT-'))
        self.assertIsNotNone(data['linkedPpsrId'])
        self.assertIsNotNone(data['linkedKaizenId'])
        self.assertIsNotNone(data['linkedFiveSRedTagId'])

        actions_after = data['allowedActions']
        self.assertNotIn('escalatePpsr', actions_after)
        self.assertNotIn('convertKaizen', actions_after)
        self.assertNotIn('linkFiveS', actions_after)

    def test_bridge_adapter_successful_http_call(self):
        """
        Verify BridgeEscalationAdapter formats headers and processes HTTP 201 response.
        """
        flag_id = self._create_flag()
        flag = RedFlag.objects.get(id=flag_id)
        adapter = BridgeEscalationAdapter(base_url='http://localhost:3000', service_token='secret_test_token')

        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = {
            'success': True,
            'data': {'id': 'target-123', 'ppsrNo': 'PPSR-2026-999'}
        }

        with patch('requests.post', return_value=mock_resp) as mock_post:
            ref_id, ref_no, target_rec = adapter.create_from_red_flag(
                EscalationModule.PPSR, flag, self.user_qa, {'test': 'payload'}
            )

            mock_post.assert_called_once()
            args, kwargs = mock_post.call_args
            self.assertEqual(args[0], 'http://localhost:3000/api/ppsrreports')
            self.assertEqual(kwargs['headers']['Authorization'], 'Bearer secret_test_token')
            self.assertEqual(ref_id, 'target-123')
            self.assertEqual(ref_no, 'PPSR-2026-999')
            self.assertEqual(target_rec, {'id': 'target-123', 'ppsrNo': 'PPSR-2026-999'})
