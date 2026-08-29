"""
Kaizen Image Upload Views — Local File System Storage
=====================================================
Provides a dedicated endpoint for uploading before/after photos.
Images are saved locally under MEDIA_ROOT and served via MEDIA_URL.

POST /api/v1/kaizens/<pk>/upload-photo/
    Accepts: multipart/form-data with:
        - photo_type: 'before' or 'after'
        - image: the image file
    Returns: saved file path + full URL to access image

GET /api/v1/kaizens/<pk>/photo-urls/
    Returns full URLs for both before and after photos.

DELETE /api/v1/kaizens/<pk>/delete-photo/<photo_type>/
    Removes a photo from disk and clears the DB field.
"""

import uuid
import logging
import os
from pathlib import Path

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status as drf_status

from kaizens.models import Kaizen
from core.ratelimit import FileUploadRateThrottle

logger = logging.getLogger(__name__)


def build_photo_url(request, file_field) -> str | None:
    """
    Build the full absolute URL for a photo stored in MEDIA_ROOT or MinIO.
    Uses Django's request object to build scheme + host.
    """
    if not file_field:
        return None
    try:
        from core.minio_utils import get_presigned_url, is_minio_available
        if is_minio_available() and hasattr(file_field, 'name') and file_field.name:
            minio_url = get_presigned_url(file_field.name, request=request)
            if minio_url:
                return minio_url
    except Exception:
        pass

    try:
        # file_field.url returns the MEDIA_URL relative path
        relative_url = file_field.url
        # Build absolute URL: http://localhost:8000/media/kaizen_photos/before/...
        if request:
            return request.build_absolute_uri(relative_url)
        return relative_url
    except Exception:
        return None


class KaizenPhotoUploadView(APIView):
    """
    POST /api/v1/kaizens/<pk>/upload-photo/
    Upload a before or after photo. Saved to local MEDIA_ROOT.
    Rate limited to 10 requests/minute/user.
    """
    permission_classes = [AllowAny]
    throttle_classes = [FileUploadRateThrottle]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        kaizen = get_object_or_404(Kaizen, pk=pk)

        photo_type = request.data.get('photo_type', '').strip().lower()
        if photo_type not in ('before', 'after'):
            return Response({
                'success': False,
                'error': {'message': 'photo_type must be "before" or "after"'}
            }, status=drf_status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({
                'success': False,
                'error': {'message': 'No image file provided. Use field name "image".'}
            }, status=drf_status.HTTP_400_BAD_REQUEST)

        # Validate content type
        content_type = image_file.content_type
        if content_type not in settings.ALLOWED_IMAGE_TYPES:
            return Response({
                'success': False,
                'error': {'message': f'File type {content_type} not allowed. Use JPEG, PNG, WebP, or GIF.'}
            }, status=drf_status.HTTP_400_BAD_REQUEST)

        # Validate file size
        if image_file.size > settings.MAX_UPLOAD_SIZE_BYTES:
            return Response({
                'success': False,
                'error': {'message': f'File too large. Max size is {settings.MAX_UPLOAD_SIZE_MB}MB.'}
            }, status=drf_status.HTTP_400_BAD_REQUEST)

        # Delete old photo file if it exists
        old_field = getattr(kaizen, f'photo_{photo_type}')
        if old_field:
            try:
                if hasattr(old_field, 'path') and os.path.exists(old_field.path):
                    os.remove(old_field.path)
                    logger.info(f'Deleted old {photo_type} photo: {old_field.path}')
            except Exception as e:
                logger.warning(f'Could not delete old photo {old_field}: {e}')
            try:
                from core.minio_utils import delete_object
                delete_object(old_field.name)
            except Exception:
                pass

        # Save new file locally first
        if photo_type == 'before':
            kaizen.photo_before = image_file
            kaizen.save(update_fields=['photo_before'])
            saved_field = kaizen.photo_before
        else:
            kaizen.photo_after = image_file
            kaizen.save(update_fields=['photo_after'])
            saved_field = kaizen.photo_after

        # Sync to MinIO bucket (kaizenimages)
        minio_url = None
        try:
            from core.minio_utils import upload_file_to_minio, get_presigned_url, is_minio_available
            if is_minio_available() and saved_field and hasattr(saved_field, 'path') and os.path.exists(saved_field.path):
                upload_file_to_minio(
                    object_name=saved_field.name,
                    file_path_or_data=saved_field.path,
                    content_type=content_type,
                )
                minio_url = get_presigned_url(saved_field.name, request=request)
                logger.info(f"MinIO: Synced photo to bucket '{settings.MINIO_BUCKET_NAME}': {saved_field.name}")
        except Exception as e:
            logger.warning(f"MinIO sync failed: {e}")

        photo_url = build_photo_url(request, saved_field)
        logger.info(f'Saved {photo_type} photo for Kaizen {kaizen.sr_no}: {saved_field.name}')

        return Response({
            'success': True,
            'message': f'{photo_type.capitalize()} photo uploaded successfully.',
            'data': {
                'photo_type': photo_type,
                'file_path': saved_field.name,
                'url': photo_url,
                'minio_url': minio_url,
            }
        }, status=drf_status.HTTP_201_CREATED)


class KaizenPhotoUrlsView(APIView):
    """
    GET /api/v1/kaizens/<pk>/photo-urls/
    Returns absolute URLs for both before and after photos.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        kaizen = get_object_or_404(Kaizen, pk=pk)

        return Response({
            'success': True,
            'data': {
                'kaizen_id': str(kaizen.id),
                'sr_no': kaizen.sr_no,
                'photo_before': {
                    'file_path': kaizen.photo_before.name if kaizen.photo_before else None,
                    'url': build_photo_url(request, kaizen.photo_before),
                },
                'photo_after': {
                    'file_path': kaizen.photo_after.name if kaizen.photo_after else None,
                    'url': build_photo_url(request, kaizen.photo_after),
                },
            }
        })


class KaizenPhotoDeleteView(APIView):
    """
    DELETE /api/v1/kaizens/<pk>/delete-photo/<photo_type>/
    Remove before or after photo from disk and clear DB field.
    """
    permission_classes = [AllowAny]

    def delete(self, request, pk, photo_type):
        if photo_type not in ('before', 'after'):
            return Response({
                'success': False,
                'error': {'message': 'photo_type must be "before" or "after"'}
            }, status=400)

        kaizen = get_object_or_404(Kaizen, pk=pk)
        field = getattr(kaizen, f'photo_{photo_type}')

        if not field:
            return Response({
                'success': False,
                'error': {'message': f'No {photo_type} photo exists for this Kaizen.'}
            }, status=404)

        # Delete file from disk
        file_path = field.path
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                logger.warning(f'Could not delete photo file {file_path}: {e}')

        # Also delete from MinIO bucket
        try:
            from core.minio_utils import delete_object
            delete_object(field.name)
            logger.info(f"MinIO: Deleted {field.name} from bucket")
        except Exception as e:
            logger.warning(f"MinIO delete skipped/failed: {e}")

        # Clear DB field
        setattr(kaizen, f'photo_{photo_type}', None)
        kaizen.save(update_fields=[f'photo_{photo_type}'])


        return Response({
            'success': True,
            'message': f'{photo_type.capitalize()} photo deleted.',
        })
