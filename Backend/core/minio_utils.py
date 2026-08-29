"""
MinIO Storage Utilities
=======================
Provides a MinIO client, bucket initialization, upload/delete helpers,
and pre-signed URL generation.
Used by image upload views and serializers.
"""

import logging
import os
import socket
import time
import json
from datetime import timedelta
import urllib3
from django.conf import settings

logger = logging.getLogger(__name__)

# Cache for MinIO reachability to prevent repeated connection hangs
_minio_health_cache = {"online": None, "last_checked": 0.0}


def is_minio_available() -> bool:
    """
    Fast, non-blocking check to verify if the MinIO service is reachable.
    Caches the result for 30 seconds to avoid repeating socket connections.
    """
    now = time.time()
    if _minio_health_cache["online"] is not None and (now - _minio_health_cache["last_checked"] < 30.0):
        return _minio_health_cache["online"]

    endpoint = getattr(settings, 'MINIO_ENDPOINT', 'localhost:9000')
    try:
        if ':' in endpoint:
            host, port_str = endpoint.split(':', 1)
            port = int(port_str)
        else:
            host = endpoint
            port = 443 if getattr(settings, 'MINIO_USE_HTTPS', False) else 80

        with socket.create_connection((host, port), timeout=0.4):
            _minio_health_cache["online"] = True
            _minio_health_cache["last_checked"] = now
            return True
    except Exception:
        _minio_health_cache["online"] = False
        _minio_health_cache["last_checked"] = now
        return False


def get_minio_client():
    """
    Return a configured MinIO Python client instance.
    Configured with region='us-east-1' and a zero-retry HTTP client with low timeout
    so that presigned URL generation stays 100% offline (no /bucket?location= network calls)
    and network operations fail immediately without stalling Django workers.
    """
    from minio import Minio

    http_client = urllib3.PoolManager(
        timeout=urllib3.Timeout(connect=0.5, read=1.0),
        retries=urllib3.Retry(total=0, connect=0, read=0, status=0),
        maxsize=10,
    )

    return Minio(
        endpoint=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_HTTPS,
        region=getattr(settings, 'MINIO_REGION', 'us-east-1'),
        http_client=http_client,
    )


def ensure_bucket_exists():
    """
    Create the MinIO bucket if it doesn't already exist.
    Sets a public-read policy so images can be accessed directly via URL.
    Called at startup via Django AppConfig.ready().
    """
    if not is_minio_available():
        logger.info("MinIO is currently offline; local filesystem storage active.")
        return

    bucket = settings.MINIO_BUCKET_NAME

    try:
        client = get_minio_client()
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info(f'MinIO: Created bucket "{bucket}"')
        else:
            logger.info(f'MinIO: Bucket "{bucket}" verified.')

        # Ensure public-read policy is always active on the bucket
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket}/*"]
                }
            ]
        }
        client.set_bucket_policy(bucket, json.dumps(policy))
        logger.info(f'MinIO: Set public-read policy on bucket "{bucket}"')
    except Exception as exc:
        logger.warning(f'MinIO: Could not initialize bucket "{bucket}": {exc}')


def upload_file_to_minio(object_name: str, file_path_or_data, content_type: str = 'image/jpeg') -> bool:
    """
    Upload a file to the MinIO bucket.
    Normalizes Windows path separators ('\\') to forward slashes ('/') to prevent S3 XMinioInvalidObjectName errors.
    """
    if not object_name or not is_minio_available():
        return False

    norm_name = str(object_name).replace('\\', '/').lstrip('/')

    try:
        client = get_minio_client()
        bucket = settings.MINIO_BUCKET_NAME

        if isinstance(file_path_or_data, str) and os.path.exists(file_path_or_data):
            size = os.path.getsize(file_path_or_data)
            with open(file_path_or_data, 'rb') as f:
                client.put_object(
                    bucket_name=bucket,
                    object_name=norm_name,
                    data=f,
                    length=size,
                    content_type=content_type,
                )
            logger.info(f"MinIO: Successfully uploaded '{norm_name}' ({size} bytes)")
            return True
        elif hasattr(file_path_or_data, 'read'):
            if hasattr(file_path_or_data, 'seek'):
                file_path_or_data.seek(0)
            data_bytes = file_path_or_data.read()
            from io import BytesIO
            stream = BytesIO(data_bytes)
            size = len(data_bytes)
            client.put_object(
                bucket_name=bucket,
                object_name=norm_name,
                data=stream,
                length=size,
                content_type=content_type,
            )
            logger.info(f"MinIO: Successfully uploaded stream '{norm_name}' ({size} bytes)")
            return True
    except Exception as exc:
        logger.warning(f"MinIO: Upload failed for '{norm_name}': {exc}")
        return False

    return False


def get_presigned_url(object_name: str, expires_seconds: int = 3600, request=None) -> str | None:
    """
    Generate an accessible GET URL for a MinIO object.
    Normalizes Windows path separators.
    If request is passed, adjusts the host so remote LAN clients (e.g. 10.22.75.203)
    reach the server host instead of failing on localhost:9000.
    """
    if not object_name or not is_minio_available():
        return None

    norm_name = str(object_name).replace('\\', '/').lstrip('/')

    try:
        client = get_minio_client()
        url = client.presigned_get_object(
            bucket_name=settings.MINIO_BUCKET_NAME,
            object_name=norm_name,
            expires=timedelta(seconds=expires_seconds),
        )

        if url and request:
            # If the request arrived from a specific host (e.g. 10.22.75.203), adjust URL host
            client_host = request.get_host().split(':')[0]
            if client_host and client_host not in ('localhost', '127.0.0.1'):
                # Replace localhost:9000 or 127.0.0.1:9000 with client_host:9000
                url = url.replace('://localhost:', f'://{client_host}:').replace('://127.0.0.1:', f'://{client_host}:')

        return url
    except Exception as exc:
        logger.debug(f'MinIO: Could not generate presigned URL for {norm_name}: {exc}')
        return None


def delete_object(object_name: str) -> bool:
    """Delete an object from MinIO. Returns True if deleted, False on error."""
    if not object_name or not is_minio_available():
        return False

    norm_name = str(object_name).replace('\\', '/').lstrip('/')

    try:
        client = get_minio_client()
        client.remove_object(settings.MINIO_BUCKET_NAME, norm_name)
        return True
    except Exception as exc:
        logger.warning(f'MinIO: Could not delete {norm_name}: {exc}')
        return False
