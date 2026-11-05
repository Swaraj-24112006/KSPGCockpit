"""
MinIO Object Storage Service for Safety Desk Media & Evidence.
Configured via .env (default API port 9000, console 9001).
"""

import io
import base64
import uuid
from datetime import timedelta
from django.conf import settings
from minio import Minio
from minio.error import S3Error

_minio_client = None

def get_minio_client():
    global _minio_client
    if _minio_client is None:
        try:
            _minio_client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE
            )
            # Ensure bucket exists
            bucket_name = settings.MINIO_BUCKET_NAME
            if not _minio_client.bucket_exists(bucket_name):
                _minio_client.make_bucket(bucket_name)
        except Exception as e:
            print(f"[MinIO Warning] Unable to connect to MinIO on {settings.MINIO_ENDPOINT}: {e}")
            _minio_client = None
    return _minio_client


def upload_base64_image(base64_data: str, prefix: str = "safety") -> str:
    """
    Uploads a Base64 encoded image string (e.g., from CameraModal) to MinIO.
    Returns the MinIO object URL or falls back to data URI if MinIO is offline.
    """
    if not base64_data or not base64_data.startswith("data:image"):
        return base64_data

    client = get_minio_client()
    if not client:
        return base64_data  # Graceful fallback when MinIO is not running locally

    try:
        header, encoded = base64_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        
        # Determine content type
        content_type = "image/png"
        if "image/jpeg" in header or "image/jpg" in header:
            content_type = "image/jpeg"
        elif "image/webp" in header:
            content_type = "image/webp"

        ext = "png"
        if "jpeg" in content_type:
            ext = "jpg"
        elif "webp" in content_type:
            ext = "webp"

        file_name = f"{prefix}/{uuid.uuid4().hex}.{ext}"
        bucket_name = settings.MINIO_BUCKET_NAME

        data_stream = io.BytesIO(image_bytes)
        client.put_object(
            bucket_name=bucket_name,
            object_name=file_name,
            data=data_stream,
            length=len(image_bytes),
            content_type=content_type
        )

        protocol = "https" if settings.MINIO_SECURE else "http"
        return f"{protocol}://{settings.MINIO_ENDPOINT}/{bucket_name}/{file_name}"

    except Exception as e:
        print(f"[MinIO Upload Error]: {e}")
        return base64_data


def upload_file_obj(file_obj, prefix: str = "uploads") -> str:
    """
    Uploads a standard uploaded file object to MinIO.
    """
    client = get_minio_client()
    if not client:
        return ""

    try:
        bucket_name = settings.MINIO_BUCKET_NAME
        ext = file_obj.name.split('.')[-1] if '.' in file_obj.name else 'bin'
        file_name = f"{prefix}/{uuid.uuid4().hex}.{ext}"
        
        client.put_object(
            bucket_name=bucket_name,
            object_name=file_name,
            data=file_obj,
            length=file_obj.size,
            content_type=file_obj.content_type
        )

        protocol = "https" if settings.MINIO_SECURE else "http"
        return f"{protocol}://{settings.MINIO_ENDPOINT}/{bucket_name}/{file_name}"
    except Exception as e:
        print(f"[MinIO File Upload Error]: {e}")
        return ""

