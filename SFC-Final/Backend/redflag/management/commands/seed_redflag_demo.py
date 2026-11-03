import io
import uuid
import hashlib
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from PIL import Image, ImageDraw

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone

User = get_user_model()

from redflag.models import (
    Plant, Line, Station, ProductModel, Department, Employee,
    Attachment, RedFlag, StageHistory, RedFlagAuditLog, RedFlagConfig, RedFlagSequence
)
from redflag.enums import (
    Status, RedFlagType, Severity, Category5M, Repetitive,
    AttachmentKind, CheckStatus, EscalationModule
)
from redflag.permissions import (
    GROUP_QUALITY_CUSTODIAN, GROUP_PLANT_HEAD, GROUP_TARGET_PERSON
)
from redflag.services.raise_red_flag import raise_red_flag
from redflag.services.submit_containment import submit_containment
from redflag.services.containment_approval import approve_containment
from redflag.services.save_root_cause import save_root_cause
from redflag.services.sustenance_engine import start_sustenance, log_month_check
from redflag.services.close_red_flag import close_red_flag
from redflag.services.escalate_red_flag import escalate_red_flag
from redflag.storage import upload_to_minio

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


def create_demo_png(title="DEMO EVIDENCE", subtitle="IATF 16949 SFC AUDIT"):
    """Generates a stamped valid PNG image in memory with no SVG."""
    width, height = 400, 300
    img = Image.new('RGB', (width, height), color=(240, 243, 248))
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rectangle([10, 10, width - 10, height - 10], outline=(180, 40, 40), width=3)
    # Header bar
    draw.rectangle([10, 10, width - 10, 50], fill=(210, 40, 40))
    draw.text((25, 22), "DEMO - NOT PRODUCTION", fill=(255, 255, 255))

    # Center title & details
    draw.text((30, 100), title[:40], fill=(20, 20, 20))
    draw.text((30, 130), subtitle[:45], fill=(80, 80, 80))
    draw.text((30, 240), f"Timestamp: {datetime.now(KOLKATA_TZ).strftime('%Y-%m-%d %H:%M IST')}", fill=(100, 100, 100))

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.getvalue()


class Command(BaseCommand):
    help = "Seeds the 4 canonical Red Flag demo records from server.ts through real service workflows."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forces execution even if DEBUG=False.'
        )
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Purges existing demo flags before seeding.'
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options.get('force'):
            raise CommandError(
                "seed_redflag_demo refuses to run in production (DEBUG=False). Use --force to override."
            )

        self.stdout.write("Initializing Red Flag demo environment...")

        # Purge any existing demo flags to make execution idempotent
        demo_nos = ['RF-MF1-001', 'RF-MF2-002', 'RF-MF1-003', 'RF-MF3-004']
        existing_flags = list(RedFlag.objects.filter(red_flag_no__in=demo_nos))
        for rf in existing_flags:
            StageHistory.objects.filter(red_flag=rf)._raw_delete(using='default')
            RedFlagAuditLog.objects.filter(red_flag=rf)._raw_delete(using='default')
            rf.delete()

        seq, _ = RedFlagSequence.objects.get_or_create(name='redflag')
        seq.last_value = 0
        seq.save(update_fields=['last_value'])

        # 1. Ensure Groups exist
        g_qa, _ = Group.objects.get_or_create(name=GROUP_QUALITY_CUSTODIAN)
        g_ph, _ = Group.objects.get_or_create(name=GROUP_PLANT_HEAD)
        g_tp, _ = Group.objects.get_or_create(name=GROUP_TARGET_PERSON)

        # 2. Master entities
        plant_mf1, _ = Plant.objects.get_or_create(code='MF1', defaults={'name': 'Plant MF1 - Pune Main', 'is_active': True})
        plant_mf2, _ = Plant.objects.get_or_create(code='MF2', defaults={'name': 'Plant MF2 - Chennai EGR', 'is_active': True})
        plant_mf3, _ = Plant.objects.get_or_create(code='MF3', defaults={'name': 'Plant MF3 - Pantnagar Casting', 'is_active': True})

        line_a, _ = Line.objects.get_or_create(plant=plant_mf1, name='Vacuum Pump Line A (Pune)', defaults={'is_active': True})
        line_egr, _ = Line.objects.get_or_create(plant=plant_mf2, name='EGR Welding Shop - Chennai', defaults={'is_active': True})
        line_dock, _ = Line.objects.get_or_create(plant=plant_mf3, name='Casting Receiving Dock - Pantnagar', defaults={'is_active': True})
        line_cnc, _ = Line.objects.get_or_create(plant=plant_mf1, name='CNC Machining Center 3 - Pune', defaults={'is_active': True})

        st_4, _ = Station.objects.get_or_create(line=line_a, name='Torqueing Station ST-4', defaults={'is_active': True})
        st_weld, _ = Station.objects.get_or_create(line=line_egr, name='Robot Cell Weld #2', defaults={'is_active': True})
        st_cnc, _ = Station.objects.get_or_create(line=line_cnc, name='Milling Station CNC-03', defaults={'is_active': True})
        st_dock, _ = Station.objects.get_or_create(line=line_dock, name='Dock Inward Bay 2', defaults={'is_active': True})

        m_vp, _ = ProductModel.objects.get_or_create(name='VP-200', defaults={'is_active': True})
        m_egr, _ = ProductModel.objects.get_or_create(name='EGR-TypeC', defaults={'is_active': True})
        m_casing, _ = ProductModel.objects.get_or_create(name='VP-Casing', defaults={'is_active': True})
        m_caliper, _ = ProductModel.objects.get_or_create(name='Caliper-BC', defaults={'is_active': True})

        dept_prod, _ = Department.objects.get_or_create(code='PROD', defaults={'name': 'Production', 'can_originate': True, 'can_be_target': True})
        dept_maint, _ = Department.objects.get_or_create(code='MAINT', defaults={'name': 'Maintenance', 'can_originate': True, 'can_be_target': True})
        dept_qa, _ = Department.objects.get_or_create(code='QA', defaults={'name': 'Quality', 'can_originate': True, 'can_be_target': True})
        dept_safety, _ = Department.objects.get_or_create(code='EHS', defaults={'name': 'Safety & EHS', 'can_originate': True, 'can_be_target': True})
        dept_stores, _ = Department.objects.get_or_create(code='LOG', defaults={'name': 'Logistics & Stores', 'can_originate': True, 'can_be_target': True})
        dept_tool, _ = Department.objects.get_or_create(code='TOOL', defaults={'name': 'Tooling & Die', 'can_originate': True, 'can_be_target': True})

        # 3. Users & Employees
        def _get_or_create_actor(username, full_name, dept, plant, roles=None):
            emp_code = f"EMP-{username.upper()[:6]}"
            u, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'is_active': True,
                    'is_active_employee': True,
                    'employee_id': emp_code,
                    'department': dept.name if dept else '',
                    'plant': plant.code if plant else '',
                }
            )
            u.set_password('demo_password_123')
            u.save()
            if roles:
                for r in roles:
                    u.groups.add(r)
            emp, _ = Employee.objects.get_or_create(
                user=u,
                defaults={
                    'full_name': full_name,
                    'employee_code': f"EMP-{username.upper()[:6]}",
                    'department': dept,
                    'plant': plant,
                    'is_active': True
                }
            )
            return u, emp

        u_rajesh, emp_rajesh = _get_or_create_actor('rajesh_patil', 'Rajesh Patil (Shift In-charge)', dept_prod, plant_mf1)
        u_deepak, emp_deepak = _get_or_create_actor('deepak_more', 'Deepak More (Torque Cell Tech)', dept_prod, plant_mf1, [g_tp])
        u_suresh, emp_suresh = _get_or_create_actor('suresh_kumar', 'Suresh Kumar (QA Lead)', dept_qa, plant_mf1, [g_qa])
        u_plant_head, emp_plant_head = _get_or_create_actor('plant_head', 'P. K. Sharma (Plant Head)', dept_prod, plant_mf1, [g_ph])

        plant_mf1.plant_head = emp_plant_head
        plant_mf1.save(update_fields=['plant_head'])
        plant_mf2.plant_head = emp_plant_head
        plant_mf2.save(update_fields=['plant_head'])
        plant_mf3.plant_head = emp_plant_head
        plant_mf3.save(update_fields=['plant_head'])

        u_vijay, emp_vijay = _get_or_create_actor('vijay_deshmukh', 'Vijay Deshmukh (Welding Cell Leader)', dept_prod, plant_mf2)
        u_santosh, emp_santosh = _get_or_create_actor('santosh_jadhav', 'Santosh Jadhav (Robotics PM)', dept_maint, plant_mf2, [g_tp])
        u_sunita, emp_sunita = _get_or_create_actor('sunita_rao', 'Sunita Rao (Quality Specialist)', dept_qa, plant_mf2, [g_qa])

        u_kavita, emp_kavita = _get_or_create_actor('kavita_nair', 'Kavita Nair (Safety Officer)', dept_safety, plant_mf1)
        u_rahul, emp_rahul = _get_or_create_actor('rahul_sharma', 'Rahul Sharma (Maintenance Lead)', dept_maint, plant_mf1, [g_tp])

        u_anil, emp_anil = _get_or_create_actor('anil_shinde', 'Anil Shinde (Stores & Inward QC)', dept_stores, plant_mf3)
        u_ganesh, emp_ganesh = _get_or_create_actor('ganesh_kulkarni', 'Ganesh Kulkarni (Tool Room Head)', dept_tool, plant_mf3, [g_tp])

        def _make_attachment(user, kind, title):
            raw = create_demo_png(title)
            sha = hashlib.sha256(raw).hexdigest()
            bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'redflag-evidence')
            key = upload_to_minio(raw, 'image/png', kind)
            if not key or Attachment.objects.filter(object_key=key).exists():
                key = f"demo/{uuid.uuid4().hex}_{kind.lower()}.png"
            return Attachment.objects.create(
                kind=kind,
                bucket=bucket,
                object_key=key,
                original_name=f"{kind.lower()}_demo.png",
                content_type='image/png',
                size_bytes=len(raw),
                width=400,
                height=300,
                sha256=sha,
                uploaded_by=user,
            )

        # -------------------------------------------------------------
        # Record 1: RF-MF1-001 (Under-Sustenance)
        # -------------------------------------------------------------
        self.stdout.write("Seeding Record 1: RF-MF1-001 (Under-Sustenance)...")
        att1_t0 = _make_attachment(u_rajesh, AttachmentKind.T0_EVIDENCE, "VP-200 Bolt Under-Torque Defect")
        f1 = raise_red_flag(
            user=u_rajesh,
            data={
                'plant': str(plant_mf1.id),
                'line': str(line_a.id),
                'station': str(st_4.id),
                'model': str(m_vp.id),
                'red_flag_type': RedFlagType.QUALITY,
                'red_flag_sub_type': 'Under-torque & Loose Fasteners',
                'severity': Severity.CRITICAL,
                'category_5m': Category5M.METHOD,
                'description': 'Multiple units of VP-200 Vacuum Pump housing bolts found under-torqued (target 32 Nm, actual 18 Nm). Hand torque wrench failed verification test during line audit.',
                'target_department': str(dept_prod.id),
                'target_person': str(emp_deepak.id),
                'qa_custodian': str(emp_suresh.id),
                'target_date': (timezone.now() + timedelta(days=6)).date().isoformat(),
                'evidence_attachment_id': str(att1_t0.id),
                'team_leader': 'Rajesh Patil (Supervisor)',
                'repetitive_occurrence': Repetitive.REPETITIVE,
                'raised_by_role': 'Shift Lead',
            }
        )

        att1_cont = _make_attachment(u_deepak, AttachmentKind.T1_CONTAINMENT, "Quarantined 120 VP-200 Units")
        submit_containment(
            flag_id=f1.id,
            user=u_deepak,
            data={
                'suspect_qty': 120,
                'sorting_inspected': 120,
                'sorting_ok': 120,
                'sorting_rejected': 0,
                'quarantine_location': 'Red Tag Bay ST-4',
                'action_text': 'Line stopped immediately for 35 mins. 120 suspected finished vacuum pumps quarantined in Red Tag Bay. Re-torqued 100% units using calibrated digital backup torque wrench.',
                'countermeasure_photo_id': str(att1_cont.id),
                'photo_attachment_id': str(att1_cont.id),
            }
        )

        approve_containment(f1.id, u_suresh, notes="Containment verified on torque re-checks.")

        save_root_cause(
            flag_id=f1.id,
            user=u_deepak,
            data={
                'why1': 'Why were housing bolts under-torqued? Hand torque wrench slipped before reaching 32 Nm preset threshold.',
                'why2': 'Why did wrench slip? Internal ratchet spring tension had degraded by 40%.',
                'why3': 'Why was degradation not caught? Pre-shift torque tester check was skipped by operator.',
                'why4': 'Why was check skipped? Torque tester was located 30 meters away in tool crib, leading to shortcutting.',
                'root_cause': 'Lack of station-level torque calibration tester and lack of interlock between torque wrench and SFC line conveyor.',
                'permanent_action': 'Procure and mount automated Poka-Yoke digital torque tool with Wi-Fi interlock to SFC tracker line clearance; bolts cannot proceed unless torque curve reaches 32±1.5 Nm.',
                'sop_updated': True,
                'pfmea_updated': True,
                'control_plan_updated': False,
                'opl_issued': True,
            }
        )

        escalate_red_flag(flag_id=f1.id, module=EscalationModule.PPSR, user=u_suresh)
        escalate_red_flag(flag_id=f1.id, module=EscalationModule.FIVES_RED_TAG, user=u_suresh)

        start_sustenance(
            f1.id, u_suresh,
            notes="Starting 90-day watch with Wi-Fi torque interlock in place.",
            start_date="2026-07-15"
        )
        log_month_check(
            flag_id=f1.id,
            month=1,
            user=u_suresh,
            data={
                'status': CheckStatus.PASSED,
                'auditDate': '2026-08-15',
                'observations': 'Audited 180 pumps over 5 shifts. Wi-Fi torque interlock working 100%. Zero torque escapes.',
            }
        )
        log_month_check(
            flag_id=f1.id,
            month=2,
            user=u_suresh,
            data={
                'status': CheckStatus.PASSED,
                'auditDate': '2026-09-16',
                'observations': 'Audited 220 pumps. Wi-Fi torque interlock verified. Zero torque escapes detected.',
            }
        )

        # -------------------------------------------------------------
        # Record 2: RF-MF2-002 (Closed Sustained)
        # -------------------------------------------------------------
        self.stdout.write("Seeding Record 2: RF-MF2-002 (Closed Sustained)...")
        att2_t0 = _make_attachment(u_vijay, AttachmentKind.T0_EVIDENCE, "Robot Cell #2 Welding Spatter")
        f2 = raise_red_flag(
            user=u_vijay,
            data={
                'plant': str(plant_mf2.id),
                'line': str(line_egr.id),
                'station': str(st_weld.id),
                'model': str(m_egr.id),
                'red_flag_type': RedFlagType.MACHINE,
                'red_flag_sub_type': 'Welding Spatter & Micro-voids',
                'severity': Severity.MAJOR,
                'category_5m': Category5M.MACHINE,
                'description': 'Excessive welding spatter on EGR gas flange joints, causing micro-voids and subsequent air pressure leak test failures.',
                'target_department': str(dept_maint.id),
                'target_person': str(emp_santosh.id),
                'qa_custodian': str(emp_sunita.id),
                'target_date': (timezone.now() - timedelta(days=90)).date().isoformat(),
                'evidence_attachment_id': str(att2_t0.id),
                'team_leader': 'Vijay Deshmukh (Area Leader)',
                'repetitive_occurrence': Repetitive.REPETITIVE,
                'raised_by_role': 'Cell Leader',
            }
        )

        att2_cont = _make_attachment(u_santosh, AttachmentKind.T1_CONTAINMENT, "Dye Penetrant Flange Checks")
        submit_containment(
            flag_id=f2.id,
            user=u_santosh,
            data={
                'suspect_qty': 340,
                'sorting_inspected': 340,
                'sorting_ok': 310,
                'sorting_rejected': 30,
                'quarantine_location': 'Hold Area MF2 Bay B',
                'action_text': 'Manual 100% dye penetrant inspection on all 340 suspect EGR flanges. Defective tips replaced on Robot Cell #2.',
                'countermeasure_photo_id': str(att2_cont.id),
                'photo_attachment_id': str(att2_cont.id),
            }
        )

        approve_containment(f2.id, u_sunita, notes="Quarantine count and tip change verified.")

        save_root_cause(
            flag_id=f2.id,
            user=u_santosh,
            data={
                'why1': 'Why was there weld spatter? Robot torch tip had buildup of carbon slag.',
                'why2': 'Why was slag building up? Manual torch cleaning frequency was insufficient.',
                'why3': 'Why was cleaning manual? Cell lacked automated nozzle cleaning & wire clipping station.',
                'root_cause': 'Absence of automatic inline tip dresser and anti-spatter fluid mist cycle during robot cycle home return.',
                'permanent_action': 'Installed automatic pneumatic tip dresser station that cleans nozzle after every 50 weld cycles and sprays anti-spatter agent.',
                'sop_updated': True,
                'pfmea_updated': True,
                'control_plan_updated': True,
                'opl_issued': True,
            }
        )

        escalate_red_flag(flag_id=f2.id, module=EscalationModule.KAIZEN, user=u_sunita)

        start_sustenance(
            f2.id, u_sunita,
            notes="Starting 90-day sustenance monitoring.",
            start_date="2026-04-12"
        )
        log_month_check(f2.id, 1, u_sunita, {
            'status': CheckStatus.PASSED,
            'auditDate': '2026-05-12',
            'observations': 'Automatic tip dresser operational, zero spatter across 1,400 parts.'
        })
        log_month_check(f2.id, 2, u_sunita, {
            'status': CheckStatus.PASSED,
            'auditDate': '2026-06-12',
            'observations': 'No nozzle clogging, tips within specs.'
        })
        log_month_check(f2.id, 3, u_sunita, {
            'status': CheckStatus.PASSED,
            'auditDate': '2026-07-12',
            'observations': 'Full 90 days completed without recurrence.'
        })

        att2_close = _make_attachment(u_sunita, AttachmentKind.CLOSURE_EVIDENCE, "Final Zero-Defect Validation Run")
        close_red_flag(
            flag_id=f2.id,
            user=u_sunita,
            data={
                'validation_trial_shifts': 3,
                'validation_trial_results': '3 consecutive production shifts run with zero leak escapes and zero spatter rework.',
                'closure_evidence': str(att2_close.id),
                'closure_photo_attachment_id': str(att2_close.id),
                'approved_by_production': str(emp_plant_head.id),
                'sign_off_production_head': True,
            }
        )

        # -------------------------------------------------------------
        # Record 3: RF-MF1-003 (Contained)
        # -------------------------------------------------------------
        self.stdout.write("Seeding Record 3: RF-MF1-003 (Contained)...")
        att3_t0 = _make_attachment(u_kavita, AttachmentKind.T0_EVIDENCE, "CNC-03 Door Seal Coolant Mist")
        f3 = raise_red_flag(
            user=u_kavita,
            data={
                'plant': str(plant_mf1.id),
                'line': str(line_cnc.id),
                'station': str(st_cnc.id),
                'model': str(m_casing.id),
                'red_flag_type': RedFlagType.FIVE_S,
                'red_flag_sub_type': 'Coolant Mist & Oil Puddle',
                'severity': Severity.MODERATE,
                'category_5m': Category5M.ENVIRONMENT,
                'description': 'Coolant mist escaping enclosure seals, condensing onto walkway gangway creating slip hazard and parts contamination risk.',
                'target_department': str(dept_maint.id),
                'target_person': str(emp_rahul.id),
                'qa_custodian': str(emp_suresh.id),
                'target_date': (timezone.now() + timedelta(days=5)).date().isoformat(),
                'evidence_attachment_id': str(att3_t0.id),
                'team_leader': 'Kavita Nair',
                'repetitive_occurrence': Repetitive.FIRST_TIME,
                'raised_by_role': 'Safety Officer',
            }
        )

        att3_cont = _make_attachment(u_rahul, AttachmentKind.T1_CONTAINMENT, "Absorbent Mats Applied Around CNC-03")
        submit_containment(
            flag_id=f3.id,
            user=u_rahul,
            data={
                'suspect_qty': 15,
                'sorting_inspected': 15,
                'sorting_ok': 15,
                'sorting_rejected': 0,
                'quarantine_location': 'CNC-03 Perimeter Barrier',
                'action_text': 'Placed non-slip absorbent mats around CNC-03 perimeter. WIP pallets moved 2 meters away from splash zone.',
                'countermeasure_photo_id': str(att3_cont.id),
                'photo_attachment_id': str(att3_cont.id),
            }
        )

        approve_containment(f3.id, u_suresh, notes="Immediate containment verified with absorbent mats. Viton seal replacement under procurement.")

        save_root_cause(
            flag_id=f3.id,
            user=u_rahul,
            data={
                'why1': 'Why is coolant mist escaping? Door perimeter silicone wiper seal is torn at lower left corner.',
                'why2': 'Why was it torn? Swarf chips accumulated inside door slide track.',
                'why3': 'Why did swarf accumulate? 3S daily cleaning checklist did not specify vacuuming bottom door rail.',
                'root_cause': 'Inadequate 3S Seiso cleaning standard on CNC door tracks causing seal abrasive wear.',
                'permanent_action': 'Replace silicone door gasket with chemical-resistant Viton seal and add door rail debris vacuuming to 5-minute daily 3S checklist.',
                'sop_updated': True,
                'pfmea_updated': False,
                'control_plan_updated': False,
                'opl_issued': True,
            }
        )

        escalate_red_flag(flag_id=f3.id, module=EscalationModule.FIVES_RED_TAG, user=u_suresh)

        # -------------------------------------------------------------
        # Record 4: RF-MF3-004 (Open)
        # -------------------------------------------------------------
        self.stdout.write("Seeding Record 4: RF-MF3-004 (Open)...")
        att4_t0 = _make_attachment(u_anil, AttachmentKind.T0_EVIDENCE, "Caliper Lug Casting Porosity")
        f4 = raise_red_flag(
            user=u_anil,
            data={
                'plant': str(plant_mf3.id),
                'line': str(line_dock.id),
                'station': str(st_dock.id),
                'model': str(m_caliper.id),
                'red_flag_type': RedFlagType.MATERIAL,
                'red_flag_sub_type': 'Casting Blowholes & Porosity',
                'severity': Severity.CRITICAL,
                'category_5m': Category5M.MATERIAL,
                'description': 'Brake Caliper casting lot #C-892 shows visible gas blowholes and surface porosity exceeding 1.2mm threshold at mounting lug bores.',
                'target_department': str(dept_tool.id),
                'target_person': str(emp_ganesh.id),
                'qa_custodian': str(emp_suresh.id),
                'target_date': (timezone.now() + timedelta(days=4)).date().isoformat(),
                'evidence_attachment_id': str(att4_t0.id),
                'team_leader': 'Anil Shinde',
                'repetitive_occurrence': Repetitive.FIRST_TIME,
                'raised_by_role': 'Stores Inspector',
            }
        )

        self.stdout.write(self.style.SUCCESS(
            f"\nDemo data seeding completed successfully!\n"
            f"  1. {f1.red_flag_no} - {f1.status} (Under Sustenance, M1 Passed)\n"
            f"  2. {f2.red_flag_no} - {f2.status} (Closed & Sustained)\n"
            f"  3. {f3.red_flag_no} - {f3.status} (Contained & RCA Saved)\n"
            f"  4. {f4.red_flag_no} - {f4.status} (Open - Freshly Raised)\n"
            f"All stage histories and audit logs were generated through authentic service paths."
        ))
