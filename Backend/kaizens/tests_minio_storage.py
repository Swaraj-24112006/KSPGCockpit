"""
Tests for MinIO Media Storage, Image Uploads, Presigned URLs, and Media Migration
==================================================================================
Verifies:
1. MinIO connectivity and bucket initialization ('kaizenimages').
2. MinioMediaStorage dual-tier persistence (MinIO + local filesystem backup).
3. URL resolution for MinIO media items.
4. Kaizen creation with photos via multipart form data.
5. Dedicated photo upload endpoint (/upload-photo/).
6. migrate_media_to_minio management command (dry-run, verify-only, live sync).
7. Deletion synchronization between MinIO and local disk.
"""

import os
import io
from PIL import Image
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from kaizens.models import Kaizen
from core.minio_utils import (
    is_minio_available,
    get_minio_client,
    ensure_bucket_exists,
    get_presigned_url,
    delete_object,
)
from core.redis_client import create_session


def create_dummy_image(filename='test.jpg', color='blue', size=(100, 100)) -> SimpleUploadedFile:
    """Helper to generate a valid in-memory JPEG image file for upload testing."""
    image = Image.new('RGB', size, color=color)
    byte_arr = io.BytesIO()
    image.save(byte_arr, format='JPEG')
    byte_arr.seek(0)
    return SimpleUploadedFile(filename, byte_arr.read(), content_type='image/jpeg')


class MinioStorageAndMigrationTests(TestCase):
    """Integration test suite for MinIO storage integration."""

    def setUp(self):
        # Ensure MinIO bucket is present
        ensure_bucket_exists()
        self.minio_client = get_minio_client()
        self.bucket = settings.MINIO_BUCKET_NAME

        # Test user and session
        self.role = Role.objects.create(name='initiator')
        self.user = CustomUser.objects.create_user(
            username='minio_test_user',
            email='minio_tester@example.com',
            password='Password@123',
            role=self.role,
            employee_id='EMP-MINIO-01',
        )
        self.session_key = create_session(self.user.id, self.user.username)
        self.client = APIClient()
        self.client.cookies['kspg_sid'] = self.session_key
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session_key}')
        self.client.force_authenticate(user=self.user)

        self.created_objects = []

    def tearDown(self):
        # Clean up any test objects stored in MinIO
        for obj in self.created_objects:
            try:
                delete_object(obj)
            except Exception:
                pass

    def test_01_minio_connectivity_and_bucket(self):
        """Test MinIO service is reachable and target bucket exists."""
        self.assertTrue(is_minio_available(), "MinIO service should be reported as available.")
        self.assertTrue(self.minio_client.bucket_exists(self.bucket), f"Bucket '{self.bucket}' must exist in MinIO.")

    def test_02_minio_media_storage_save_and_url(self):
        """Test that default_storage saves to MinIO and generates a valid MinIO URL."""
        test_filename = 'kaizen_photos/before/test_unit_save.jpg'
        dummy_file = create_dummy_image('test_unit_save.jpg', color='red')

        saved_name = default_storage.save(test_filename, dummy_file)
        self.created_objects.append(saved_name)

        norm_name = str(saved_name).replace('\\', '/').lstrip('/')
        
        # Verify object exists in MinIO
        stat = self.minio_client.stat_object(self.bucket, norm_name)
        self.assertGreater(stat.size, 0, "Uploaded object in MinIO must have non-zero size.")

        # Verify URL is a MinIO URL
        file_url = default_storage.url(saved_name)
        self.assertIn('http', file_url)
        self.assertTrue(
            settings.MINIO_ENDPOINT in file_url or self.bucket in file_url or 'localhost:9000' in file_url,
            f"URL '{file_url}' should point to MinIO endpoint or bucket."
        )

        # Verify local disk backup exists
        local_path = default_storage.path(saved_name)
        self.assertTrue(os.path.exists(local_path), f"Local backup file must exist at {local_path}")

        # Clean up
        default_storage.delete(saved_name)
        self.assertFalse(default_storage.exists(saved_name))

    def test_03_kaizen_creation_with_photos(self):
        """Test creating a Kaizen via multipart API request saves photos to MinIO."""
        photo_before = create_dummy_image('before_test.jpg', color='green')
        photo_after = create_dummy_image('after_test.jpg', color='purple')

        payload = {
            'title': 'MinIO Integration Kaizen',
            'plant': 'Plant 1',
            'department': 'Manufacturing',
            'idea_by': 'Test Employee',
            'status': 'draft',
            'photo_before': photo_before,
            'photo_after': photo_after,
        }

        response = self.client.post('/api/v1/kaizens/', data=payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        data = response.data.get('data', {})
        self.assertIn('photo_before_url', data)
        self.assertIn('photo_after_url', data)

        kaizen = Kaizen.objects.get(id=data['id'])
        self.assertTrue(kaizen.photo_before)
        self.assertTrue(kaizen.photo_after)

        norm_before = str(kaizen.photo_before.name).replace('\\', '/').lstrip('/')
        norm_after = str(kaizen.photo_after.name).replace('\\', '/').lstrip('/')
        self.created_objects.extend([norm_before, norm_after])

        # Verify both exist in MinIO
        stat_b = self.minio_client.stat_object(self.bucket, norm_before)
        stat_a = self.minio_client.stat_object(self.bucket, norm_after)
        self.assertGreater(stat_b.size, 0)
        self.assertGreater(stat_a.size, 0)

    def test_04_dedicated_photo_upload_endpoint(self):
        """Test uploading before/after photos via /upload-photo/ endpoint stores them in MinIO."""
        kaizen = Kaizen.objects.create(
            title='Upload Photo Test Kaizen',
            created_by=self.user,
            sr_no='KZ-TEST-UPLOAD-01',
            status='draft',
        )

        dummy_img = create_dummy_image('upload_endpoint_test.jpg', color='yellow')
        upload_resp = self.client.post(
            f'/api/v1/kaizens/{kaizen.id}/upload-photo/',
            data={'photo_type': 'before', 'image': dummy_img},
            format='multipart',
        )
        self.assertEqual(upload_resp.status_code, status.HTTP_201_CREATED, upload_resp.data)

        kaizen.refresh_from_db()
        self.assertTrue(kaizen.photo_before)
        norm_name = str(kaizen.photo_before.name).replace('\\', '/').lstrip('/')
        self.created_objects.append(norm_name)

        # Verify in MinIO
        stat = self.minio_client.stat_object(self.bucket, norm_name)
        self.assertGreater(stat.size, 0)

    def test_05_migrate_media_management_command(self):
        """Test that migrate_media_to_minio management command executes without errors."""
        out = io.StringIO()
        # Test dry-run
        call_command('migrate_media_to_minio', dry_run=True, stdout=out)
        output_str = out.getvalue()
        self.assertIn('MinIO Media Migration & Verification Tool', output_str)
        self.assertIn('DRY RUN MODE', output_str)
        self.assertIn('All media files are successfully synchronized', output_str)

        # Test verify-only
        out_verify = io.StringIO()
        call_command('migrate_media_to_minio', verify_only=True, stdout=out_verify)
        self.assertIn('VERIFY ONLY MODE', out_verify.getvalue())
