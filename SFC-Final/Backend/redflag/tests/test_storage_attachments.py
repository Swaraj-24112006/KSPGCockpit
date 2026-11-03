import io
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.management import call_command
from django.utils import timezone
from PIL import Image

from redflag.models import Attachment, RedFlag, Department, Plant, Employee, RedFlagConfig
from redflag.enums import AttachmentKind
from redflag.storage import validate_and_process_image, presign


class StorageAttachmentTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="test_storage_user", password="password123")
        self.config = RedFlagConfig.get_config()
        self.config.presigned_ttl_seconds = 1800  # 30 mins
        self.config.save()

    def test_image_validation_valid_jpeg(self):
        img = Image.new('RGB', (200, 150), color='blue')
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)

        processed_bytes, content_type, width, height, sha256_hex = validate_and_process_image(buf)
        self.assertEqual(content_type, 'image/jpeg')
        self.assertEqual(width, 200)
        self.assertEqual(height, 150)
        self.assertTrue(len(sha256_hex) == 64)
        self.assertTrue(len(processed_bytes) > 0)

    def test_image_validation_rejects_corrupt(self):
        buf = io.BytesIO(b'not a valid image content')
        with self.assertRaises(Exception):
            validate_and_process_image(buf)

    def test_image_validation_rejects_oversized(self):
        img = Image.new('RGB', (50, 50), color='green')
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)

        # Force max_mb = 0.00001 (10 bytes)
        with self.assertRaises(Exception):
            validate_and_process_image(buf, max_mb=0.00001)

    def test_presigned_url_generation_contains_ttl(self):
        att = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/test/T0_EVIDENCE/sample.jpg',
            uploaded_by=self.user
        )

        url = presign(att)
        self.assertIn('redflag-evidence', url)
        self.assertIn('sample.jpg', url)
        self.assertIn('X-Amz-Expires=1800', url)  # TTL from config!
        self.assertIn('X-Amz-Signature', url)

    def test_purge_orphan_attachments_command(self):
        now = timezone.now()

        # 1. Orphan older than 24h -> Should be purged
        old_orphan = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/pending/T0_EVIDENCE/old.jpg',
            uploaded_by=self.user,
        )
        # Update uploaded_at manually (auto_now_add bypass)
        Attachment.objects.filter(id=old_orphan.id).update(uploaded_at=now - timedelta(hours=25))

        # 2. Recent orphan (<24h) -> Should NOT be purged
        recent_orphan = Attachment.objects.create(
            kind=AttachmentKind.T0_EVIDENCE,
            bucket='redflag-evidence',
            object_key='redflag/2026/pending/T0_EVIDENCE/recent.jpg',
            uploaded_by=self.user,
        )

        call_command('purge_orphan_attachments')

        old_orphan.refresh_from_db()
        recent_orphan.refresh_from_db()

        self.assertIsNotNone(old_orphan.deleted_at)
        self.assertIsNone(recent_orphan.deleted_at)

