import json
import logging
from djangorestframework_camel_case.render import CamelCaseJSONRenderer
from rest_framework.views import exception_handler
from rest_framework import status, exceptions
from django.core.exceptions import ValidationError as DjangoValidationError

logger = logging.getLogger(__name__)

class EnvelopeCamelCaseJSONRenderer(CamelCaseJSONRenderer):
    """
    Combines CamelCase transformation and envelope formatting:
    Success responses become: {"success": True, "data": ...}
    Error responses become: {"success": False, "error": ..., "details": ...}
    """
    def render(self, data, accepted_media_type=None, renderer_context=None):
        if renderer_context is not None:
            response = renderer_context.get('response')
            if response is not None and status.is_success(response.status_code):
                # Wrap in success envelope if not already enveloped
                if isinstance(data, dict) and ('success' in data or 'data' in data):
                    enveloped_data = data
                else:
                    enveloped_data = {
                        'success': True,
                        'data': data
                    }
                return super().render(enveloped_data, accepted_media_type, renderer_context)
            elif response is not None and not status.is_success(response.status_code):
                # Wrap in error envelope if not already
                if isinstance(data, dict) and 'success' in data:
                    return super().render(data, accepted_media_type, renderer_context)

                error_msg = "An error occurred"
                details = data
                if isinstance(data, dict):
                    if 'detail' in data:
                        error_msg = str(data['detail'])
                        details = {k: v for k, v in data.items() if k != 'detail'}
                    elif 'error' in data:
                        error_msg = str(data['error'])
                elif isinstance(data, list):
                    error_msg = "; ".join(str(x) for x in data)

                enveloped_data = {
                    'success': False,
                    'error': error_msg,
                    'details': details if details else {}
                }
                return super().render(enveloped_data, accepted_media_type, renderer_context)

        return super().render(data, accepted_media_type, renderer_context)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that standardizes errors:
    {
      "success": false,
      "error": "Error message",
      "details": { field: [msgs] }
    }
    """
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'message_dict'):
            exc = exceptions.ValidationError(detail=exc.message_dict)
        elif hasattr(exc, 'messages'):
            exc = exceptions.ValidationError(detail={'non_field_errors': exc.messages})
        else:
            exc = exceptions.ValidationError(detail=str(exc))

    response = exception_handler(exc, context)

    if response is not None:
        data = response.data
        error_msg = "Validation or processing error"
        details = {}

        if isinstance(data, dict):
            if 'detail' in data:
                error_msg = str(data['detail'])
                details = {k: v for k, v in data.items() if k != 'detail'}
            else:
                error_msg = "Invalid input data"
                details = data
        elif isinstance(data, list):
            error_msg = "; ".join(str(x) for x in data)
            details = {'non_field_errors': data}
        else:
            error_msg = str(data)

        response.data = {
            'success': False,
            'error': error_msg,
            'details': details
        }
    else:
        logger.exception("Unhandled server exception: %s", exc)

    return response
