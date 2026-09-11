"""
MinIO Resilient Media Storage Backend
======================================
Stores uploaded media files (such as Kaizen before/after photos) directly
into the MinIO object storage bucket ('kaizenimages').

Features:
- Dual-tier storage: Saves to MinIO and preserves local disk backup under MEDIA_ROOT.
- Automatic Windows path normalization: converts backslashes to standard S3 forward slashes.
- Offline resilience: If MinIO is temporarily unreachable, writes locally without failing user requests.
- Intelligent URL resolution: Returns MinIO URL when available, falls back to MEDIA_URL when offline.
- Bidirectional deletion: Removes objects from both MinIO and local disk.
"""

import logging
import mimetypes
import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from core.minio_utils import (
    is_minio_available,
    get_minio_client,
    upload_file_to_minio,
    get_presigned_url,
    delete_object,
)

logger = logging.getLogger(__name__)


class MinioMediaStorage(FileSystemStorage):
    """
    Custom Django Storage backend that integrates MinIO object storage
    with local filesystem fallback and synchronization.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bucket_name = getattr(settings, 'MINIO_BUCKET_NAME', 'kaizenimages')

    def _normalize_name(self, name: str) -> str:
        """Convert Windows backslashes to S3-compliant forward slashes."""
        return str(name).replace('\\', '/').lstrip('/')

    def _save(self, name, content):
        """
        Save file to local disk first, then sync to MinIO bucket.
        """
        # Save to local filesystem
        saved_name = super()._save(name, content)
        norm_name = self._normalize_name(saved_name)

        # Sync to MinIO if service is available
        if is_minio_available():
            try:
                local_path = self.path(saved_name)
                content_type, _ = mimetypes.guess_type(norm_name)
                if not content_type:
                    content_type = 'image/jpeg'

                success = upload_file_to_minio(
                    object_name=norm_name,
                    file_path_or_data=local_path,
                    content_type=content_type,
                )
                if success:
                    logger.info(f"MinioMediaStorage: Successfully stored '{norm_name}' in bucket '{self.bucket_name}'")
                else:
                    logger.warning(f"MinioMediaStorage: MinIO upload returned False for '{norm_name}'")
            except Exception as exc:
                logger.warning(f"MinioMediaStorage: Failed to upload '{norm_name}' to MinIO: {exc}")
        else:
            logger.info(f"MinioMediaStorage: MinIO is offline; '{norm_name}' stored locally only.")

        return saved_name

    def url(self, name):
        """
        Return the MinIO presigned / public URL if MinIO is reachable and the object exists.
        Otherwise falls back to standard Django MEDIA_URL.
        """
        if not name:
            return ''

        norm_name = self._normalize_name(name)

        if is_minio_available():
            try:
                minio_url = get_presigned_url(norm_name)
                if minio_url:
                    return minio_url
            except Exception as exc:
                logger.debug(f"MinioMediaStorage: Could not get MinIO URL for '{norm_name}': {exc}")

        # Fallback to local MEDIA_URL
        return super().url(name)

    def exists(self, name):
        """
        Check existence in local storage or MinIO.
        """
        norm_name = self._normalize_name(name)
        if super().exists(name):
            return True

        if is_minio_available():
            try:
                client = get_minio_client()
                client.stat_object(self.bucket_name, norm_name)
                return True
            except Exception:
                return False

        return False

    def delete(self, name):
        """
        Delete file from both MinIO bucket and local storage.
        """
        norm_name = self._normalize_name(name)
        if is_minio_available():
            try:
                delete_object(norm_name)
                logger.info(f"MinioMediaStorage: Deleted '{norm_name}' from MinIO bucket '{self.bucket_name}'")
            except Exception as exc:
                logger.warning(f"MinioMediaStorage: Could not delete '{norm_name}' from MinIO: {exc}")

        # Remove from local filesystem
        try:
            super().delete(name)
        except Exception as exc:
            logger.debug(f"MinioMediaStorage: Local delete exception for '{name}': {exc}")
