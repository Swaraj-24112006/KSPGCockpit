import logging
import importlib
from datetime import timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from redflag.models import SustenanceCheck
from redflag.enums import Status, CheckStatus

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Generate digest of pending sustenance checks that are due or overdue, and invoke notification hook if configured."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Lookahead window in days to detect upcoming checks (default: 7).'
        )

    def handle(self, *args, **options):
        days = options.get('days', 7)
        today = timezone.localdate()
        cutoff_date = today + timedelta(days=days)

        self.stdout.write(f"Scanning for sustenance checks due on or before {cutoff_date} (within {days} days)...")

        pending_checks = SustenanceCheck.objects.filter(
            status=CheckStatus.PENDING,
            scheduled_date__lte=cutoff_date,
            red_flag__deleted_at__isnull=True,
            red_flag__status=Status.UNDER_SUSTENANCE
        ).select_related('red_flag', 'red_flag__plant', 'red_flag__qa_custodian').order_by('scheduled_date')

        overdue_items = []
        upcoming_items = []

        for check in pending_checks:
            days_to_due = (check.scheduled_date - today).days
            is_overdue = days_to_due < 0

            item_data = {
                'check_id': str(check.id),
                'red_flag_id': str(check.red_flag_id),
                'red_flag_no': check.red_flag.red_flag_no,
                'plant': check.red_flag.plant_name,
                'cycle_no': check.cycle_no,
                'month': check.month,
                'scheduled_date': check.scheduled_date.strftime('%Y-%m-%d'),
                'days_to_due': days_to_due,
                'is_overdue': is_overdue,
                'qa_custodian': check.red_flag.qa_custodian_name,
            }

            if is_overdue:
                overdue_items.append(item_data)
            else:
                upcoming_items.append(item_data)

        total_due = len(overdue_items) + len(upcoming_items)
        self.stdout.write(self.style.SUCCESS(
            f"Found {total_due} pending sustenance check(s): {len(overdue_items)} overdue, {len(upcoming_items)} upcoming."
        ))

        if overdue_items:
            self.stdout.write(self.style.WARNING("\n=== OVERDUE SUSTENANCE CHECKS ==="))
            for item in overdue_items:
                self.stdout.write(
                    f"  * {item['red_flag_no']} (M{item['month']}, Cyc #{item['cycle_no']}) - "
                    f"Due: {item['scheduled_date']} ({abs(item['days_to_due'])} days OVERDUE) - "
                    f"Plant: {item['plant']} - QA: {item['qa_custodian']}"
                )

        if upcoming_items:
            self.stdout.write(self.style.NOTICE("\n=== UPCOMING SUSTENANCE CHECKS ==="))
            for item in upcoming_items:
                self.stdout.write(
                    f"  * {item['red_flag_no']} (M{item['month']}, Cyc #{item['cycle_no']}) - "
                    f"Due: {item['scheduled_date']} (in {item['days_to_due']} days) - "
                    f"Plant: {item['plant']} - QA: {item['qa_custodian']}"
                )

        logger.info(
            "Sustenance digest completed: %d total (%d overdue, %d upcoming).",
            total_due, len(overdue_items), len(upcoming_items)
        )

        # Invoke custom project notification hook if configured
        hook_path = getattr(settings, 'REDFLAG_NOTIFICATION_HOOK', None)
        if hook_path:
            try:
                module_name, func_name = hook_path.rsplit('.', 1)
                mod = importlib.import_module(module_name)
                hook_func = getattr(mod, func_name)
                hook_func(
                    overdue=overdue_items,
                    upcoming=upcoming_items,
                    total=total_due,
                    cutoff_date=cutoff_date
                )
                self.stdout.write(self.style.SUCCESS(f"Notification hook '{hook_path}' executed successfully."))
            except Exception as e:
                logger.error("Failed to execute notification hook %s: %s", hook_path, e, exc_info=True)
                self.stderr.write(self.style.ERROR(f"Error calling notification hook: {e}"))

