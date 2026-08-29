"""
Kaizen Views — CRUD, Drafts, Submission, Evidence, Cost Savings
"""

from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q
from django.shortcuts import get_object_or_404

from kaizens.models import Kaizen, KaizenBenefit, KaizenEvidence, KaizenCostSaving
from audit.models import create_audit_log
from core.ratelimit import get_client_ip
from kaizens.serializers import (
    KaizenListSerializer,
    KaizenDetailSerializer,
    KaizenSubmitSerializer,
    KaizenEvidenceSerializer,
    KaizenCostSavingSerializer,
    KaizenCostSavingUpdateSerializer,
)
from kaizens.filters import KaizenFilter
from kaizens.validators import validate_kaizen_for_submission
from accounts.permissions import IsOwnerOrAdmin, IsReviewer, IsAdmin
from core.exceptions import InvalidWorkflowTransition, KaizenAPIException
from core.rbac import (
    require_role,
    IsCommitteeOrAbove,
    IsCoordinatorOrAdmin,
    IsOwnerOrCommitteeOrAbove,
    get_role_category,
    PERM_KAIZEN_DELETE_DRAFT,
)

import logging

logger = logging.getLogger('kaizen')



class KaizenViewSet(viewsets.ModelViewSet):
    """
    Main Kaizen CRUD ViewSet.

    Endpoints:
        GET    /api/v1/kaizens/              — List all Kaizens (filtered, paginated, sorted)
        POST   /api/v1/kaizens/              — Create a new Kaizen / Save Draft
        GET    /api/v1/kaizens/<id>/          — Get Kaizen detail
        PUT    /api/v1/kaizens/<id>/          — Update Kaizen (drafts/rework or committee review)
        PATCH  /api/v1/kaizens/<id>/          — Partial update
        DELETE /api/v1/kaizens/<id>/          — Delete (drafts only)
        POST   /api/v1/kaizens/<id>/submit/   — Submit draft for review (strict validation)
        GET    /api/v1/kaizens/drafts/         — Current user's drafts
        GET    /api/v1/kaizens/my-kaizens/     — Current user's Kaizens
    """
    permission_classes = [AllowAny]
    filterset_class = KaizenFilter
    search_fields = ['title', 'problem_before', 'counter_measure_after', 'idea_by', 'area']
    ordering_fields = [
        'sr_no', 'title', 'suggestion_date', 'cost_save', 'status',
        'created_at', 'implementation_date', 'area', 'mini_factory',
    ]
    ordering = ['-created_at']

    def get_permissions(self):
        """
        RBAC enforcement per action:
        - update / partial_update : IsOwnerOrCommitteeOrAbove (draft owner or committee/coordinator/admin)
        - destroy                 : AllowAny (view logic performs strict RBAC & ownership check)
        - list / retrieve / create / submit : AllowAny (view logic checks authenticated user)
        """
        if self.action in ('update', 'partial_update'):
            return [IsOwnerOrCommitteeOrAbove()]
        return [AllowAny()]

    def get_queryset(self):
        return Kaizen.objects.select_related(
            'created_by', 'assigned_reviewer', 'benefits'
        ).prefetch_related('evidence_files').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return KaizenListSerializer
        return KaizenDetailSerializer

    def perform_create(self, serializer):
        """Auto-generate sr_no, assign created_by, and timestamp submission if submitted."""
        from accounts.models import CustomUser

        user = self.request.user
        if not user or not user.is_authenticated:
            # Fallback to the first active user for development/unauthenticated calls
            user = (
                CustomUser.objects.filter(is_active=True).first()
                or CustomUser.objects.first()
            )
            if user is None:
                raise KaizenAPIException(
                    message='No active user exists in the system. Please create a user first.',
                    code='NO_USER',
                    status_code=503,
                )

        target_status = self.request.data.get('status', 'draft')
        submitted_at = timezone.now() if target_status == 'submitted' else None

        instance = serializer.save(
            created_by=user,
            sr_no=Kaizen.generate_sr_no(),
            status=target_status,
            submitted_at=submitted_at,
        )

        # If submitted on creation, validate all compulsory fields
        if target_status == 'submitted':
            errors = validate_kaizen_for_submission(instance)
            if errors:
                # Revert to draft if compulsory fields are missing
                instance.status = 'draft'
                instance.submitted_at = None
                instance.save(update_fields=['status', 'submitted_at'])
                raise KaizenAPIException(
                    message='Kaizen is incomplete. All compulsory fields must be filled before submission.',
                    code='INCOMPLETE_SUBMISSION',
                    status_code=422,
                    details=errors,
                )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        is_draft = serializer.instance.status == 'draft'
        return Response({
            'success': True,
            'message': 'Kaizen draft saved successfully.' if is_draft else 'Kaizen created successfully.',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({'success': True, 'data': serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Classification check — committee review
        new_classification = request.data.get('classification')
        if new_classification and new_classification != instance.classification:
            user = request.user
            if user and user.is_authenticated:
                user_role = get_role_category(user)
                if user_role not in ('committee', 'coordinator', 'admin'):
                    raise KaizenAPIException(
                        message='Access denied. Only committee members, coordinators, or admins can classify Kaizens.',
                        code='PERMISSION_DENIED',
                        status_code=status.HTTP_403_FORBIDDEN,
                    )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()

        # If status changed via review, record in audit
        new_status = request.data.get('status')
        if new_status and new_status != instance.status:
            user = request.user
            from audit.models import AuditLog
            AuditLog.objects.create(
                action=new_status,
                from_status=instance.status,
                to_status=new_status,
                performed_by=user if user.is_authenticated else None,
                remarks=request.data.get('remark', f'Status updated to {new_status} by committee.'),
            )

        return Response({
            'success': True,
            'message': 'Kaizen draft updated successfully.' if updated_instance.status == 'draft' else 'Kaizen updated successfully.',
            'data': serializer.data,
        })

    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/v1/kaizens/<id>/
        Secure Draft Deletion Pipeline:
        1. Draft status verification (status == 'draft'). Rejects non-drafts with 409 Conflict.
        2. Ownership & RBAC check:
           - Authenticated User:
             - Initiator: Can only delete their own draft (created_by == request.user or created_by is None).
             - Coordinator / Admin: Can delete across their administrative scope.
             - Rejects unauthorized users with 403 Forbidden.
           - Unauthenticated fallback (development/legacy): Fallback to system/first active user.
        3. Backend atomic database transaction with immutable audit trail logging.
        """
        from accounts.models import CustomUser

        instance = self.get_object()

        # 1. State Check: Only drafts can be deleted
        if instance.status != 'draft':
            raise KaizenAPIException(
                message=f'Cannot delete Kaizen with status "{instance.get_status_display()}". Only draft Kaizens can be deleted.',
                code='INVALID_DRAFT_STATE',
                status_code=status.HTTP_409_CONFLICT,
                details={'current_status': instance.status, 'allowed_status': 'draft'}
            )

        # 2. RBAC & Ownership Validation
        if request.user and request.user.is_authenticated:
            user_role = get_role_category(request.user)
            is_owner = (instance.created_by == request.user or instance.created_by is None)
            is_admin_or_coordinator = user_role in ('coordinator', 'admin')

            if not is_owner and not is_admin_or_coordinator:
                logger.warning(
                    f"Unauthorized draft deletion attempt: user={request.user.username} (role={user_role}) "
                    f"attempted to delete draft {instance.sr_no} owned by {instance.created_by.username if instance.created_by else 'None'}"
                )
                raise KaizenAPIException(
                    message='Access denied. You do not have permission to delete this Kaizen draft. You can only delete your own drafts.',
                    code='PERMISSION_DENIED',
                    status_code=status.HTTP_403_FORBIDDEN,
                )
            audit_user = request.user
            role_display = f"{request.user.username} ({user_role})"
        else:
            audit_user = (
                CustomUser.objects.filter(is_active=True).first()
                or CustomUser.objects.first()
            )
            role_display = audit_user.username if audit_user else "anonymous"

        # 3. Atomic Deletion and Audit Trail Logging
        client_ip = get_client_ip(request)
        draft_snapshot = {
            'id': str(instance.id),
            'sr_no': instance.sr_no,
            'title': instance.title,
            'status': instance.status,
            'created_by': instance.created_by.username if instance.created_by else None,
            'area': instance.area,
            'mini_factory': instance.mini_factory,
            'suggestion_date': str(instance.suggestion_date) if instance.suggestion_date else None,
        }

        with transaction.atomic():
            # Create audit log record before deleting the model instance
            create_audit_log(
                user=audit_user,
                action='delete',
                kaizen=None,
                previous_value=draft_snapshot,
                new_value=None,
                remarks=f"Kaizen draft {instance.sr_no} ('{instance.title}') deleted by {role_display}.",
                ip_address=client_ip,
            )

            logger.info(
                f"Kaizen draft deleted: sr_no={instance.sr_no}, id={instance.id}, "
                f"deleted_by={role_display}, ip={client_ip}"
            )

            # Perform deletion
            instance.delete()

        return Response({
            'success': True,
            'message': 'Kaizen draft deleted successfully.',
        }, status=status.HTTP_200_OK)


    # -----------------------------------------------------------------------
    # Custom Actions
    # -----------------------------------------------------------------------

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        POST /api/v1/kaizens/<id>/submit/
        Submit a draft Kaizen for review with strict compulsory validation.
        """
        kaizen = self.get_object()
        user = request.user
        user_role = get_role_category(user)

        if user.is_authenticated and kaizen.created_by != user and user_role not in ('coordinator', 'admin'):
            raise KaizenAPIException(
                message='You do not have permission to submit this draft.',
                code='PERMISSION_DENIED',
                status_code=403,
            )

        if kaizen.status not in ('draft', 'rework'):
            raise InvalidWorkflowTransition(
                message=f'Cannot submit a Kaizen with status "{kaizen.get_status_display()}".',
                details={'current_status': kaizen.status, 'allowed_from': ['draft', 'rework']},
            )

        # Strict validation of all compulsory fields
        errors = validate_kaizen_for_submission(kaizen)
        if errors:
            raise KaizenAPIException(
                message='Kaizen is incomplete. All compulsory fields must be filled before submission.',
                code='INCOMPLETE_SUBMISSION',
                status_code=422,
                details=errors,
            )

        kaizen.status = 'submitted'
        kaizen.submitted_at = timezone.now()
        kaizen.save(update_fields=['status', 'submitted_at', 'updated_at'])

        # Create workflow history
        from workflow.models import WorkflowHistory
        WorkflowHistory.objects.create(
            kaizen=kaizen,
            action='submitted',
            from_status='draft' if kaizen.status != 'rework' else 'rework',
            to_status='submitted',
            performed_by=user if user.is_authenticated else None,
            remarks='Kaizen submitted for review.',
        )

        return Response({
            'success': True,
            'message': 'Kaizen submitted for review successfully.',
            'data': KaizenDetailSerializer(kaizen).data,
        })

    @action(detail=False, methods=['get'])
    def drafts(self, request):
        """GET /api/v1/kaizens/drafts/ — Current user's draft Kaizens."""
        user = request.user
        if not user or not user.is_authenticated:
            queryset = self.get_queryset().filter(status='draft')
        else:
            queryset = self.get_queryset().filter(
                created_by=user,
                status='draft',
            )
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='my-kaizens')
    def my_kaizens(self, request):
        """GET /api/v1/kaizens/my-kaizens/ — Current user's Kaizens."""
        queryset = self.get_queryset().filter(created_by=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def assigned(self, request):
        """GET /api/v1/kaizens/assigned/ — Kaizens assigned to current user for review."""
        queryset = self.get_queryset().filter(
            assigned_reviewer=request.user,
            status__in=['submitted', 'pending'],
        )
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """GET /api/v1/kaizens/pending/ — All pending Kaizens."""
        queryset = self.get_queryset().filter(status__in=['submitted', 'pending'])
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def approved(self, request):
        """GET /api/v1/kaizens/approved/ — All approved Kaizens."""
        queryset = self.get_queryset().filter(status='approved')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def rejected(self, request):
        """GET /api/v1/kaizens/rejected/ — All rejected Kaizens."""
        queryset = self.get_queryset().filter(status='rejected')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def closed(self, request):
        """GET /api/v1/kaizens/closed/ — All closed Kaizens."""
        queryset = self.get_queryset().filter(status='closed')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = KaizenListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = KaizenListSerializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='by-srno/(?P<sr_no>[^/.]+)')
    def by_srno(self, request, sr_no=None):
        """GET /api/v1/kaizens/by-srno/<sr_no>/ — Get Kaizen by serial number."""
        kaizen = get_object_or_404(Kaizen, sr_no=sr_no)
        serializer = KaizenDetailSerializer(kaizen)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='cost-savings')
    def cost_savings(self, request):
        """
        GET /api/v1/kaizens/cost-savings/
        Aggregated cost savings report with breakdowns.
        """
        kaizens = Kaizen.objects.filter(status__in=['approved', 'good_point', 'closed'])

        # Total savings
        total = kaizens.aggregate(total=Sum('cost_save'))['total'] or 0

        # By month
        by_month = list(
            kaizens.values('month').annotate(
                total_savings=Sum('cost_save')
            ).order_by('month')
        )

        # By area
        by_area = list(
            kaizens.values('area').annotate(
                total_savings=Sum('cost_save')
            ).order_by('-total_savings')
        )

        # By mini-factory
        by_factory = list(
            kaizens.values('mini_factory').annotate(
                total_savings=Sum('cost_save')
            ).order_by('-total_savings')
        )

        # By employee (idea_by)
        by_employee = list(
            kaizens.values('idea_by').annotate(
                total_savings=Sum('cost_save')
            ).order_by('-total_savings')[:20]
        )

        return Response({
            'success': True,
            'data': {
                'total_savings_inr': float(total),
                'by_month': by_month,
                'by_area': by_area,
                'by_mini_factory': by_factory,
                'by_employee': by_employee,
            }
        })


from core.ratelimit import FileUploadRateThrottle


class KaizenEvidenceViewSet(viewsets.ModelViewSet):
    """
    Evidence upload/management for a specific Kaizen.
    POST /api/v1/kaizens/<kaizen_id>/evidence/ — Upload evidence
    GET  /api/v1/kaizens/<kaizen_id>/evidence/ — List evidence
    DELETE /api/v1/kaizens/<kaizen_id>/evidence/<id>/ — Delete evidence
    """
    serializer_class = KaizenEvidenceSerializer
    permission_classes = [AllowAny]
    throttle_classes = [FileUploadRateThrottle]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return KaizenEvidence.objects.filter(
            kaizen_id=self.kwargs['kaizen_pk']
        ).select_related('uploaded_by')

    def create(self, request, kaizen_pk=None):
        kaizen = get_object_or_404(Kaizen, pk=kaizen_pk)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Validate file
        file = request.FILES.get('file')
        if file:
            if file.size > (10 * 1024 * 1024):  # 10MB
                raise KaizenAPIException(
                    message='File size exceeds the maximum allowed size of 10MB.',
                    code='FILE_TOO_LARGE',
                    status_code=400,
                )

            if file.content_type not in ['image/jpeg', 'image/png', 'image/webp', 'image/gif']:
                raise KaizenAPIException(
                    message='Only JPEG, PNG, WebP, and GIF images are allowed.',
                    code='INVALID_FILE_TYPE',
                    status_code=400,
                )

        user = request.user if request.user and request.user.is_authenticated else None
        evidence = serializer.save(
            kaizen=kaizen,
            uploaded_by=user,
            original_filename=file.name if file else '',
            file_size=file.size if file else 0,
        )

        if evidence.file and hasattr(evidence.file, 'path') and os.path.exists(evidence.file.path):
            try:
                from core.minio_utils import upload_file_to_minio
                upload_file_to_minio(
                    object_name=evidence.file.name,
                    file_path_or_data=evidence.file.path,
                    content_type=getattr(file, 'content_type', 'image/jpeg') if file else 'image/jpeg',
                )
            except Exception as exc:
                logger.warning(f"MinIO evidence sync failed: {exc}")

        return Response({
            'success': True,
            'message': 'Evidence uploaded successfully.',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)

    def list(self, request, kaizen_pk=None):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    def destroy(self, request, kaizen_pk=None, pk=None):
        evidence = self.get_object()

        # Only owner, kaizen creator, or admin can delete
        if (
            evidence.uploaded_by != request.user and
            evidence.kaizen.created_by != request.user and
            not (request.user.role and request.user.role.name == 'admin')
        ):
            raise KaizenAPIException(
                message='You do not have permission to delete this evidence.',
                code='PERMISSION_DENIED',
                status_code=403,
            )

        # Delete the file from MinIO and storage
        if evidence.file:
            try:
                from core.minio_utils import delete_object
                delete_object(evidence.file.name)
            except Exception:
                pass
            evidence.file.delete(save=False)
        evidence.delete()

        return Response({
            'success': True,
            'message': 'Evidence deleted successfully.',
        })
