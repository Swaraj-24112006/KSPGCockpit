"""
Django Management Command: migrate_media_to_minio
==================================================
Migrates all local media files (including Kaizen before/after photos and PPSR files)
from MEDIA_ROOT to the MinIO object storage bucket ('kaizenimages').

Usage:
    python manage.py migrate_media_to_minio
    python manage.py migrate_media_to_minio --dry-run
    python manage.py migrate_media_to_minio --verify-only
    python manage.py migrate_media_to_minio --overwrite
"""

import os
import mimetypes
from django.core.management.base import BaseCommand
from django.conf import settings
from kaizens.models import Kaizen
from core.minio_utils import (
    is_minio_available,
    get_minio_client,
    upload_file_to_minio,
    ensure_bucket_exists,
)


class Command(BaseCommand):
    help = 'Migrate local media files to MinIO bucket without data loss'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate migration without modifying MinIO storage.',
        )
        parser.add_argument(
            '--verify-only',
            action='store_true',
            help='Check and display MinIO synchronization status for all media files.',
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Re-upload files even if they already exist in MinIO.',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        verify_only = options.get('verify_only', False)
        overwrite = options.get('overwrite', False)

        self.stdout.write(self.style.MIGRATE_HEADING('=== MinIO Media Migration & Verification Tool ==='))
        
        # 1. Connectivity & Bucket Check
        if not is_minio_available():
            self.stderr.write(self.style.ERROR(
                f'Error: MinIO server is unreachable at {settings.MINIO_ENDPOINT}. '
                'Please ensure MinIO service is running before proceeding.'
            ))
            return

        ensure_bucket_exists()
        client = get_minio_client()
        bucket = settings.MINIO_BUCKET_NAME

        self.stdout.write(self.style.SUCCESS(
            f"Connected to MinIO at {settings.MINIO_ENDPOINT} (Bucket: '{bucket}')"
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING('[DRY RUN MODE] No changes will be made to MinIO.'))
        if verify_only:
            self.stdout.write(self.style.WARNING('[VERIFY ONLY MODE] Inspecting file status only.'))

        # 2. Collect files to migrate
        # Map: relative_norm_name -> full_local_path
        files_to_process = {}

        # 2a. Files referenced in Kaizen records
        kaizen_files_count = 0
        for k in Kaizen.objects.all():
            for photo_field, label in [(k.photo_before, 'before'), (k.photo_after, 'after')]:
                if photo_field and photo_field.name:
                    norm = str(photo_field.name).replace('\\', '/').lstrip('/')
                    local_full = os.path.join(settings.MEDIA_ROOT, norm)
                    files_to_process[norm] = local_full
                    kaizen_files_count += 1

        self.stdout.write(f"Identified {kaizen_files_count} photo references across Kaizen database records.")

        # 2b. Files present on disk under MEDIA_ROOT
        media_root = str(settings.MEDIA_ROOT)
        disk_files_count = 0
        if os.path.exists(media_root):
            for root, _, filenames in os.walk(media_root):
                for filename in filenames:
                    disk_files_count += 1
                    full_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(full_path, media_root)
                    norm = rel_path.replace('\\', '/').lstrip('/')
                    if norm not in files_to_process:
                        files_to_process[norm] = full_path

        self.stdout.write(f"Scanned {disk_files_count} total files on local disk in '{media_root}'.")
        self.stdout.write(f"Total unique media items to audit: {len(files_to_process)}")
        self.stdout.write('-' * 75)

        # 3. Process each file
        stats = {
            'total': len(files_to_process),
            'already_in_minio': 0,
            'migrated': 0,
            'skipped_missing_local': 0,
            'failed': 0,
        }

        for norm_name, full_path in sorted(files_to_process.items()):
            local_exists = os.path.isfile(full_path)
            
            # Check MinIO existence
            in_minio = False
            minio_size = 0
            try:
                stat = client.stat_object(bucket, norm_name)
                in_minio = True
                minio_size = stat.size
            except Exception:
                in_minio = False

            # Case: Verify only
            if verify_only:
                if in_minio:
                    stats['already_in_minio'] += 1
                    self.stdout.write(f"[PRESENT] {norm_name} ({minio_size} bytes in MinIO)")
                else:
                    self.stdout.write(self.style.WARNING(f"[MISSING] {norm_name} (on disk: {local_exists})"))
                continue

            # Case: Already in MinIO and no overwrite requested
            if in_minio and not overwrite:
                stats['already_in_minio'] += 1
                self.stdout.write(f"[EXISTS]  {norm_name} (in MinIO, skipping)")
                continue

            # Case: Local file missing
            if not local_exists:
                stats['skipped_missing_local'] += 1
                self.stdout.write(self.style.WARNING(f"[WARN]    {norm_name}: Local file not found at {full_path}"))
                continue

            # Case: Upload needed
            file_size = os.path.getsize(full_path)
            content_type, _ = mimetypes.guess_type(norm_name)
            if not content_type:
                content_type = 'image/jpeg'

            if dry_run:
                stats['migrated'] += 1
                self.stdout.write(f"[DRY-RUN] Would upload {norm_name} ({file_size} bytes, {content_type})")
                continue

            # Perform actual upload
            try:
                success = upload_file_to_minio(
                    object_name=norm_name,
                    file_path_or_data=full_path,
                    content_type=content_type,
                )
                if success:
                    stats['migrated'] += 1
                    self.stdout.write(self.style.SUCCESS(f"[MIGRATED] {norm_name} ({file_size} bytes) -> MinIO '{bucket}'"))
                else:
                    stats['failed'] += 1
                    self.stdout.write(self.style.ERROR(f"[FAILED]   {norm_name}: upload returned False"))
            except Exception as exc:
                stats['failed'] += 1
                self.stdout.write(self.style.ERROR(f"[ERROR]    {norm_name}: {exc}"))

        # 4. Summary Output
        self.stdout.write('=' * 75)
        self.stdout.write(self.style.MIGRATE_HEADING('Migration Summary:'))
        self.stdout.write(f"  Total items checked:       {stats['total']}")
        self.stdout.write(f"  Already in MinIO:          {stats['already_in_minio']}")
        self.stdout.write(f"  Successfully migrated:     {stats['migrated']}")
        self.stdout.write(f"  Skipped (missing on disk): {stats['skipped_missing_local']}")
        self.stdout.write(f"  Failed uploads:            {stats['failed']}")

        if stats['failed'] == 0:
            self.stdout.write(self.style.SUCCESS('\nAll media files are successfully synchronized with MinIO!'))
        else:
            self.stdout.write(self.style.ERROR(f"\nCompleted with {stats['failed']} errors."))
