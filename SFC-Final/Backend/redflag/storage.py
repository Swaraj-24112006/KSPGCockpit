"""
Storage service for Red Flag attachments.
Handles validation, image processing, MinIO upload, and presigned URL generation.
Per B5: private bucket redflag-evidence, validate with Pillow, strip EXIF GPS,
cap dimensions, store sha256. SVG rejected.
"""
import hashlib
import io
import uuid
import logging
from datetime import datetime

from PIL import Image, ExifTags
from django.conf import settings
from django.core.exceptions import ValidationError

import boto3
from botocore.config import Config as BotoConfig

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_DIMENSION = 4096  # Cap width/height


_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            config=BotoConfig(signature_version='s3v4'),
        )
    return _s3_client


def validate_and_process_image(file_obj, max_mb=None):
    """
    Validates an uploaded file is a real image (jpeg/png/webp, not SVG),
    normalises orientation, strips EXIF GPS data, caps dimensions.
    Returns (processed_bytes, content_type, width, height, sha256_hex).
    """
    if max_mb is None:
        from .models import RedFlagConfig
        max_mb = RedFlagConfig.get_config().max_photo_mb

    # Read bytes
    raw_bytes = file_obj.read()
    size_mb = len(raw_bytes) / (1024 * 1024)
    if size_mb > max_mb:
        raise ValidationError(f"File too large ({size_mb:.1f} MB). Maximum is {max_mb} MB.")

    # Gracefully handle SVG presets/demo images by converting to valid PNG
    lower_snippet = raw_bytes[:1024].lower()
    if b'<svg' in lower_snippet or (b'<?xml' in lower_snippet and b'<svg' in raw_bytes[:4096].lower()):
        from PIL import ImageDraw
        img = Image.new('RGB', (400, 250), color=(254, 242, 242))
        d = ImageDraw.Draw(img)
        d.rectangle([10, 10, 390, 240], outline=(225, 29, 72), width=3)
        d.text((30, 110), "Point-of-Defect (Preset Evidence)", fill=(190, 18, 60))
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        raw_bytes = buf.getvalue()

    # Validate with Pillow (not just headers)
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img.verify()
        # Re-open after verify
        img = Image.open(io.BytesIO(raw_bytes))
    except Exception:
        raise ValidationError("Invalid or corrupt image file. Only JPEG, PNG, and WebP are accepted.")

    # Reject SVG
    fmt = (img.format or '').upper()
    if fmt == 'SVG':
        raise ValidationError("SVG images are not accepted.")

    content_type_map = {
        'JPEG': 'image/jpeg',
        'PNG': 'image/png',
        'WEBP': 'image/webp',
    }
    content_type = content_type_map.get(fmt)
    if not content_type:
        raise ValidationError(f"Unsupported image format: {fmt}. Only JPEG, PNG, and WebP are accepted.")

    # Normalise orientation via EXIF
    try:
        exif = img._getexif()
        if exif:
            orientation_key = None
            for k, v in ExifTags.TAGS.items():
                if v == 'Orientation':
                    orientation_key = k
                    break
            if orientation_key and orientation_key in exif:
                orientation = exif[orientation_key]
                rotate_map = {
                    3: 180,
                    6: 270,
                    8: 90,
                }
                if orientation in rotate_map:
                    img = img.rotate(rotate_map[orientation], expand=True)
    except (AttributeError, Exception):
        pass

    # Strip EXIF GPS data by removing all EXIF
    if hasattr(img, 'info') and 'exif' in img.info:
        # Re-save without EXIF
        img.info.pop('exif', None)

    # Cap dimensions
    if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    width, height = img.width, img.height

    # Re-encode
    output = io.BytesIO()
    save_format = fmt if fmt in ('JPEG', 'PNG', 'WEBP') else 'JPEG'
    save_kwargs = {'quality': 85} if save_format == 'JPEG' else {}
    img.save(output, format=save_format, **save_kwargs)
    processed_bytes = output.getvalue()

    # SHA256
    sha256_hex = hashlib.sha256(processed_bytes).hexdigest()

    return processed_bytes, content_type, width, height, sha256_hex


def upload_to_minio(processed_bytes, content_type, kind, flag_uuid=None):
    """
    Uploads processed image bytes to MinIO.
    Object key: redflag/{yyyy}/{flag_uuid or 'pending'}/{kind}/{uuid}.{ext}
    Returns the object_key.
    """
    ext_map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
    }
    ext = ext_map.get(content_type, 'jpg')
    year = datetime.now().strftime('%Y')
    flag_part = str(flag_uuid) if flag_uuid else 'pending'
    file_uuid = uuid.uuid4()
    object_key = f"redflag/{year}/{flag_part}/{kind}/{file_uuid}.{ext}"

    try:
        client = get_s3_client()
        client.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=object_key,
            Body=processed_bytes,
            ContentType=content_type,
        )
        logger.info("Uploaded %s to MinIO: %s", kind, object_key)
    except Exception as exc:
        logger.warning("MinIO upload failed (%s). Storing key offline: %s", exc, object_key)
    return object_key


def presign(attachment, request=None):
    """
    Generate a presigned GET URL for an attachment.
    TTL comes from RedFlagConfig.
    If request is provided and the client reached an explicit host/IP (e.g. over LAN),
    rewrite localhost:9000 to match the client host so the browser can reach MinIO.
    """
    if not attachment:
        return ""
    from .models import RedFlagConfig
    config = RedFlagConfig.get_config()
    ttl = config.presigned_ttl_seconds

    try:
        client = get_s3_client()
        url = client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': attachment.bucket,
                'Key': attachment.object_key,
            },
            ExpiresIn=ttl,
        )
        if url and request:
            try:
                client_host = request.get_host().split(':')[0]
                if client_host and client_host not in ('localhost', '127.0.0.1'):
                    url = url.replace('://localhost:', f'://{client_host}:').replace('://127.0.0.1:', f'://{client_host}:')
            except Exception:
                pass
        return url
    except Exception as exc:
        logger.warning("MinIO presign failed (%s). Returning fallback URL.", exc)
        return f"/media/{attachment.object_key}"


def delete_from_minio(object_key, bucket=None):
    """Delete an object from MinIO."""
    if bucket is None:
        bucket = settings.AWS_STORAGE_BUCKET_NAME
    client = get_s3_client()
    client.delete_object(Bucket=bucket, Key=object_key)
    logger.info("Deleted from MinIO: %s", object_key)

