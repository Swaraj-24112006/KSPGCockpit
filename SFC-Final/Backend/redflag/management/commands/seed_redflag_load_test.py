import time
from datetime import timedelta
from zoneinfo import ZoneInfo
from django.core.management.base import BaseCommand
from django.utils import timezone

from redflag.models import (
    Plant, Line, Station, ProductModel, Department, Employee,
    Attachment, RedFlag, RedFlagContainment, StageHistory
)
from redflag.enums import (
    Status, RedFlagType, Severity, Category5M, Repetitive,
    AttachmentKind, ContainmentStatus
)

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


class Command(BaseCommand):
    help = "Bulk seeds high-volume realistic test flags (e.g. 10 000 flags) for stress and performance benchmarking."

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10000,
            help='Total number of flags to seed (default: 10000).'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for bulk_create operations (default: 1000).'
        )
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Purges all previous load test flags prefixed with RF-LOAD-.'
        )

    def handle(self, *args, **options):
        if options.get('clean'):
            self.stdout.write("Purging existing load test flags (RF-LOAD-*)...")
            deleted, _ = RedFlag.objects.filter(red_flag_no__startswith='RF-LOAD-').delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} load test records."))
            return

        total_count = options.get('count', 10000)
        batch_size = options.get('batch_size', 1000)

        # Ensure minimal dependencies
        plant = Plant.objects.first()
        line = Line.objects.first()
        station = Station.objects.first()
        model = ProductModel.objects.first()
        dept_prod = Department.objects.filter(code='PROD').first() or Department.objects.first()
        dept_maint = Department.objects.filter(code='MAINT').first() or Department.objects.last()
        emp_qa = Employee.objects.filter(department__code='QA').first() or Employee.objects.first()
        emp_target = Employee.objects.filter(department__code='PROD').first() or Employee.objects.last()

        # Shared placeholder attachment
        att, _ = Attachment.objects.get_or_create(
            object_key='load_test_evidence.png',
            defaults={
                'kind': AttachmentKind.T0_EVIDENCE,
                'bucket': 'redflag-evidence',
                'original_name': 'load_test.png',
                'content_type': 'image/png',
                'size_bytes': 1024,
                'width': 100,
                'height': 100,
                'sha256': '0' * 64,
            }
        )

        now = timezone.now()
        severities = [Severity.MINOR, Severity.MODERATE, Severity.MAJOR, Severity.CRITICAL]
        categories_5m = [Category5M.MAN, Category5M.MACHINE, Category5M.MATERIAL, Category5M.METHOD, Category5M.MEASUREMENT, Category5M.ENVIRONMENT]
        defect_types = [RedFlagType.QUALITY, RedFlagType.MACHINE, RedFlagType.PROCESS, RedFlagType.SAFETY, RedFlagType.MATERIAL, RedFlagType.FIVES]
        statuses = [Status.OPEN, Status.CONTAINED, Status.IN_PROGRESS, Status.UNDER_SUSTENANCE, Status.CLOSED]

        self.stdout.write(f"Generating and bulk inserting {total_count} flags in batches of {batch_size}...")
        t_start = time.perf_counter()

        total_inserted = 0
        current_sr = RedFlag.objects.count() + 1000

        for batch_offset in range(0, total_count, batch_size):
            current_batch_size = min(batch_size, total_count - batch_offset)
            flags_to_create = []

            for i in range(current_batch_size):
                idx = batch_offset + i
                raised_dt = now - timedelta(minutes=idx * 25)
                st = statuses[idx % len(statuses)]
                sev = severities[idx % len(severities)]
                cat = categories_5m[idx % len(categories_5m)]
                dt_type = defect_types[idx % len(defect_types)]
                sr_num = current_sr + idx

                rf = RedFlag(
                    sr_no=sr_num,
                    red_flag_no=f"RF-LOAD-{sr_num:06d}",
                    status=st,
                    raised_at=raised_dt,
                    target_date=raised_dt.date() + timedelta(days=5),
                    raised_by=emp_target,
                    raised_by_name=emp_target.full_name if emp_target else 'Load Test Initiator',
                    raised_by_department=dept_prod,
                    raised_by_department_name=dept_prod.name if dept_prod else 'Production',
                    target_department=dept_maint,
                    target_department_name=dept_maint.name if dept_maint else 'Maintenance',
                    target_person=emp_target,
                    target_person_name=emp_target.full_name if emp_target else 'Load Test Target',
                    qa_custodian=emp_qa,
                    qa_custodian_name=emp_qa.full_name if emp_qa else 'QA Custodian',
                    plant=plant,
                    plant_name=plant.name if plant else 'Plant MF1',
                    line=line,
                    line_name=line.name if line else 'Line A',
                    station=station,
                    station_name=station.name if station else 'Station ST-1',
                    model=model,
                    model_name=model.name if model else 'Model VP-100',
                    red_flag_type=dt_type,
                    red_flag_sub_type=f"{dt_type} Defect Sample",
                    severity=sev,
                    category_5m=cat,
                    repetitive_occurrence=Repetitive.FIRST_TIME,
                    description=f"Load test simulated non-conformance flag #{idx} for stress benchmark.",
                    evidence_photo=att,
                    sustenance_start_date=raised_dt.date() if st in (Status.UNDER_SUSTENANCE, Status.CLOSED) else None,
                    sustenance_achieved=(st == Status.CLOSED),
                    row_version=1,
                )
                flags_to_create.append(rf)

            created_flags = RedFlag.objects.bulk_create(flags_to_create)

            # Create current containments for flags that are past Open
            containments = []
            for rf in created_flags:
                if rf.status != Status.OPEN:
                    containments.append(
                        RedFlagContainment(
                            red_flag=rf,
                            attempt_no=1,
                            is_current=True,
                            action_taken_by=emp_target,
                            action_taken_by_name=emp_target.full_name if emp_target else 'Target',
                            contained_at=rf.raised_at + timedelta(minutes=35),
                            gap_minutes=35,
                            suspect_qty=50 + (rf.sr_no % 100),
                            quarantine_location='Load Test Hold Area',
                            sorting_inspected=50 + (rf.sr_no % 100),
                            sorting_ok=40 + (rf.sr_no % 100),
                            sorting_rejected=10,
                            action_text='Quarantined batch and adjusted tool calibration.',
                            photo=att,
                            status=ContainmentStatus.VERIFIED if rf.status in (Status.UNDER_SUSTENANCE, Status.CLOSED) else ContainmentStatus.CONTAINED,
                        )
                    )

            if containments:
                RedFlagContainment.objects.bulk_create(containments)

            total_inserted += len(created_flags)
            self.stdout.write(f"  Inserted {total_inserted}/{total_count} flags...")

        duration = time.perf_counter() - t_start
        rate = total_count / duration if duration > 0 else 0
        self.stdout.write(self.style.SUCCESS(
            f"\nLoad test seeding complete!\n"
            f"Successfully inserted {total_count} records in {duration:.2f}s ({rate:.0f} records/sec)."
        ))
