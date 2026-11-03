from datetime import timedelta
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from redflag.models import Attachment
from redflag.storage import delete_from_minio

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Purge unlinked orphan attachments older than 24 hours from MinIO and mark deleted."

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Age threshold in hours (default: 24).'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List orphan attachments without deleting them.'
        )

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(hours=hours)

        orphans = Attachment.objects.filter(
            red_flag__isnull=True,
            deleted_at__isnull=True,
            uploaded_at__lt=cutoff
        )

        count = orphans.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS(f"No orphan attachments found older than {hours} hours."))
            return

        self.stdout.write(f"Found {count} orphan attachment(s) older than {hours} hours.")

        if dry_run:
            for att in orphans:
                self.stdout.write(f"  [DRY RUN] Would delete: {att.id} ({att.object_key})")
            return

        purged = 0
        for att in orphans:
            try:
                delete_from_minio(att.object_key, att.bucket)
            except Exception as e:
                logger.warning("Failed to delete MinIO object %s: %s", att.object_key, e)

            att.deleted_at = timezone.now()
            att.save(update_fields=['deleted_at'])
            purged += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully purged {purged} orphan attachment(s)."))

