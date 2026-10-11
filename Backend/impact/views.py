"""
Impact Views — Assessment CRUD, Impact Items, Actions, Resources
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from kaizens.models import Kaizen
from .models import ImpactAssessment, ImpactItem, ImpactAction, AllocatedResource
from .serializers import (
    ImpactAssessmentSerializer,
    ImpactAssessmentCreateSerializer,
    ImpactItemSerializer,
    ImpactActionSerializer,
    ImpactActionCreateSerializer,
    AllocatedResourceSerializer,
)
from accounts.permissions import IsReviewerOrAdmin, IsActionOwner
from core.exceptions import KaizenAPIException


# -----------------------------------------------------------------------
# Impact Assessment endpoints (nested under /kaizens/<id>/)
# -----------------------------------------------------------------------

@api_view(['GET', 'POST', 'PUT', 'PATCH'])
@permission_classes([AllowAny])
def impact_assessment_view(request, kaizen_id):
    """
    GET/POST/PUT /api/v1/kaizens/<id>/impact-assessment/
    Retrieve, create, or update the impact assessment for a Kaizen.
    Supports both integer id and sr_no strings.
    """
    if str(kaizen_id).isdigit():
        kaizen = get_object_or_404(Kaizen, pk=int(kaizen_id))
    else:
        kaizen = get_object_or_404(Kaizen, sr_no=kaizen_id)

    if request.method == 'GET':
        try:
            assessment = kaizen.impact_assessment
        except ImpactAssessment.DoesNotExist:
            return Response({
                'success': True,
                'data': None,
                'message': 'No impact assessment exists for this Kaizen yet.',
            })
        serializer = ImpactAssessmentSerializer(assessment)
        return Response({'success': True, 'data': serializer.data})

    else:
        # Idempotent POST / PUT / PATCH: get_or_create
        assessment, _ = ImpactAssessment.objects.get_or_create(kaizen=kaizen)

        # Set review metadata
        assessment.decided_in_review = True
        if not assessment.reviewed_date:
            assessment.reviewed_date = timezone.now().date()
        if request.user.is_authenticated and not assessment.reviewed_by:
            assessment.reviewed_by = request.user

        # 1. Update 4 standard impact items from camelCase or snake_case
        category_map = {
            'five_m': request.data.get('fiveMChange') or request.data.get('five_m_change'),
            'safety': request.data.get('safetyImpact') or request.data.get('safety_impact'),
            'pfd': request.data.get('pfdUpdate') or request.data.get('pfd_update'),
            'pfmea': request.data.get('pfmeaUpdate') or request.data.get('pfmea_update'),
        }

        for cat_key, cat_data in category_map.items():
            if isinstance(cat_data, dict):
                item, _ = ImpactItem.objects.get_or_create(
                    assessment=assessment,
                    category=cat_key,
                )
                if 'required' in cat_data:
                    item.required = bool(cat_data['required'])
                if 'description' in cat_data:
                    item.description = cat_data['description'] or ''
                if 'assignedTo' in cat_data or 'assigned_to_name' in cat_data:
                    item.assigned_to_name = cat_data.get('assignedTo') or cat_data.get('assigned_to_name') or ''
                
                # status mapping
                stat = cat_data.get('status')
                if stat:
                    s_lower = str(stat).lower().replace(' ', '_').replace('-', '_')
                    if s_lower in ('completed', 'closed'):
                        item.status = 'completed'
                    elif s_lower in ('not_required', 'notrequired'):
                        item.status = 'not_required'
                    elif s_lower in ('in_progress', 'inprogress'):
                        item.status = 'in_progress'
                    else:
                        item.status = 'pending'
                
                if 'completedBy' in cat_data or 'completed_by_name' in cat_data:
                    item.completed_by_name = cat_data.get('completedBy') or cat_data.get('completed_by_name') or ''
                if 'completedDate' in cat_data or 'completed_date' in cat_data:
                    item.completed_date = cat_data.get('completedDate') or cat_data.get('completed_date') or None
                if 'notes' in cat_data:
                    item.notes = cat_data.get('notes') or ''
                
                item.save()

        # 2. Update allocated resources
        resources_list = request.data.get('allocatedResources') or request.data.get('allocated_resources')
        if isinstance(resources_list, list):
            assessment.allocated_resources.all().delete()
            for r in resources_list:
                if isinstance(r, dict) and (r.get('name') or r.get('taskAssigned') or r.get('employee_name')):
                    AllocatedResource.objects.create(
                        assessment=assessment,
                        employee_name=r.get('name') or r.get('employee_name') or '',
                        role_description=r.get('role') or r.get('role_description') or 'Quality Engineer',
                        task_assigned=r.get('taskAssigned') or r.get('task_assigned') or 'Impact Resolution'
                    )

        # 3. Closure metadata
        closure_status = request.data.get('overallClosureStatus') or request.data.get('overall_closure_status')
        if closure_status:
            c_lower = str(closure_status).lower().replace(' ', '_').replace('-', '_')
            if 'fully' in c_lower or 'closed' in c_lower:
                assessment.overall_closure_status = 'fully_closed'
                if not assessment.closure_date:
                    assessment.closure_date = timezone.now()
            elif 'action' in c_lower:
                assessment.overall_closure_status = 'actions_allocated'
            elif 'progress' in c_lower:
                assessment.overall_closure_status = 'in_progress'
            else:
                assessment.overall_closure_status = 'pending_review'

        if 'closureRemarks' in request.data:
            assessment.closure_remarks = request.data.get('closureRemarks') or ''
        elif 'closure_remarks' in request.data:
            assessment.closure_remarks = request.data.get('closure_remarks') or ''

        if request.user.is_authenticated and not assessment.closed_by:
            assessment.closed_by = request.user

        assessment.save()
        assessment.update_closure_status()

        # 4. Bidirectional Sync with ImpactAction for 5M Change
        five_m_item = assessment.impact_items.filter(category='five_m').first()
        if five_m_item and five_m_item.required:
            action_qs = ImpactAction.objects.filter(kaizen=kaizen, category__in=['five_m', 'method'])
            action = action_qs.first()
            if not action:
                action = ImpactAction.objects.create(
                    assessment=assessment,
                    kaizen=kaizen,
                    category='method',
                    department=kaizen.mini_factory or 'MF1',
                    description=five_m_item.description or f"5M Process Impact verification for {kaizen.sr_no}",
                    assigned_owner_name=five_m_item.assigned_to_name or kaizen.idea_by or 'Kaizen Initiator',
                    target_date=kaizen.closing_target_date or timezone.now().date(),
                    status='closed' if five_m_item.status == 'completed' else 'open',
                )
            else:
                action.assessment = assessment
                action.department = kaizen.mini_factory or 'MF1'
                if five_m_item.description:
                    action.description = five_m_item.description
                if five_m_item.assigned_to_name:
                    action.assigned_owner_name = five_m_item.assigned_to_name
                if five_m_item.status == 'completed':
                    action.status = 'closed'
                    action.action_taken = five_m_item.notes or '5M Process Impact verified and signed off.'
                    action.verified_by_name = five_m_item.completed_by_name or 'CFT Committee Lead'
                    action.completed_date = five_m_item.completed_date or timezone.now().date()
                action.save()

        full_serializer = ImpactAssessmentSerializer(assessment)
        return Response({
            'success': True,
            'message': 'Impact assessment saved successfully.',
            'data': full_serializer.data,
        }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def impact_items_view(request, kaizen_id):
    """
    GET/POST /api/v1/kaizens/<id>/impact-items/
    List or create impact items for a Kaizen's assessment.
    """
    if str(kaizen_id).isdigit():
        kaizen = get_object_or_404(Kaizen, pk=int(kaizen_id))
    else:
        kaizen = get_object_or_404(Kaizen, sr_no=kaizen_id)

    try:
        assessment = kaizen.impact_assessment
    except ImpactAssessment.DoesNotExist:
        assessment = ImpactAssessment.objects.create(kaizen=kaizen)

    if request.method == 'GET':
        items = assessment.impact_items.all()
        serializer = ImpactItemSerializer(items, many=True)
        return Response({'success': True, 'data': serializer.data})

    else:  # POST
        serializer = ImpactItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(assessment=assessment)
        return Response({
            'success': True,
            'message': 'Impact item created.',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'PATCH'])
@permission_classes([AllowAny])
def impact_item_detail(request, kaizen_id, item_id):
    """
    PUT/PATCH /api/v1/kaizens/<id>/impact-items/<item_id>/
    Update a specific impact item.
    """
    item = get_object_or_404(
        ImpactItem,
        pk=item_id,
        assessment__kaizen_id=kaizen_id,
    )
    partial = request.method == 'PATCH'
    serializer = ImpactItemSerializer(item, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    # Recalculate closure status
    item.assessment.update_closure_status()

    return Response({
        'success': True,
        'message': 'Impact item updated.',
        'data': serializer.data,
    })


# -----------------------------------------------------------------------
# Impact Actions (standalone endpoint)
# -----------------------------------------------------------------------

class ImpactActionViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for impact actions.
    GET    /api/v1/impact-actions/             — All actions (filtered)
    POST   /api/v1/impact-actions/             — Create action
    GET    /api/v1/impact-actions/<id>/         — Detail
    PUT    /api/v1/impact-actions/<id>/         — Update
    GET    /api/v1/impact-actions/overdue/      — Overdue actions
    GET    /api/v1/impact-actions/my-actions/   — Current user's actions
    """
    permission_classes = [AllowAny]
    ordering = ['-created_at']

    def get_queryset(self):
        qs = ImpactAction.objects.select_related(
            'kaizen', 'assigned_to', 'verified_by', 'assessment'
        ).all()

        # Apply filters
        kaizen_id = self.request.query_params.get('kaizen')
        action_status = self.request.query_params.get('status')
        category = self.request.query_params.get('category')
        owner = self.request.query_params.get('assigned_to')
        department = self.request.query_params.get('department')

        if kaizen_id:
            qs = qs.filter(kaizen_id=kaizen_id)
        if action_status:
            qs = qs.filter(status=action_status)
        if category:
            qs = qs.filter(category=category)
        if owner:
            qs = qs.filter(
                Q(assigned_to_id=owner) | Q(assigned_owner_name__icontains=owner)
            )
        if department:
            qs = qs.filter(
                Q(department__icontains=department) |
                Q(kaizen__created_by__department__icontains=department) |
                Q(kaizen__mini_factory__icontains=department)
            )

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return ImpactActionCreateSerializer
        return ImpactActionSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'data': serializer.data
        })

    def create(self, request, *args, **kwargs):
        serializer = ImpactActionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action_obj = serializer.save()

        # Link assessment if kaizen has one
        if action_obj.kaizen and hasattr(action_obj.kaizen, 'impact_assessment') and not action_obj.assessment:
            action_obj.assessment = action_obj.kaizen.impact_assessment
            action_obj.save(update_fields=['assessment'])

        return Response({
            'success': True,
            'message': 'Impact action created.',
            'data': ImpactActionSerializer(action_obj).data,
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = ImpactActionSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # If action belongs to a kaizen, sync with five_m impact item
        if instance.kaizen and hasattr(instance.kaizen, 'impact_assessment'):
            assessment = instance.kaizen.impact_assessment
            item = assessment.impact_items.filter(category='five_m').first()
            if item:
                if instance.status in ('closed', 'completed'):
                    item.status = 'completed'
                    item.completed_by_name = instance.verified_by_name or 'Coordinator'
                    item.completed_date = instance.completed_date or timezone.now().date()
                    if instance.action_taken:
                        item.notes = instance.action_taken
                    item.save()
                assessment.update_closure_status()

        if instance.assessment:
            instance.assessment.update_closure_status()

        return Response({
            'success': True,
            'message': 'Impact action updated.',
            'data': ImpactActionSerializer(instance).data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        assessment = instance.assessment
        instance.delete()
        if assessment:
            assessment.update_closure_status()
        return Response({
            'success': True,
            'message': 'Impact action deleted.',
        })

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """GET /api/v1/impact-actions/overdue/ — Overdue actions."""
        qs = self.get_queryset().filter(
            target_date__lt=timezone.now().date(),
            status__in=['open', 'in_progress', 'pending'],
        )
        serializer = ImpactActionSerializer(qs, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='my-actions')
    def my_actions(self, request):
        """GET /api/v1/impact-actions/my-actions/ — Actions assigned to current user."""
        qs = self.get_queryset().filter(assigned_to=request.user)
        serializer = ImpactActionSerializer(qs, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='by-category')
    def by_category(self, request):
        """GET /api/v1/impact-actions/by-category/ — Actions grouped by category."""
        from django.db.models import Count
        qs = self.get_queryset().values('category').annotate(
            count=Count('id')
        ).order_by('category')
        return Response({'success': True, 'data': list(qs)})


# -----------------------------------------------------------------------
# Resource Allocation
# -----------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def resources_view(request, kaizen_id):
    """
    GET/POST /api/v1/kaizens/<id>/resources/
    List or add allocated resources.
    """
    if str(kaizen_id).isdigit():
        kaizen = get_object_or_404(Kaizen, pk=int(kaizen_id))
    else:
        kaizen = get_object_or_404(Kaizen, sr_no=kaizen_id)

    try:
        assessment = kaizen.impact_assessment
    except ImpactAssessment.DoesNotExist:
        assessment = ImpactAssessment.objects.create(kaizen=kaizen)

    if request.method == 'GET':
        resources = assessment.allocated_resources.all()
        serializer = AllocatedResourceSerializer(resources, many=True)
        return Response({'success': True, 'data': serializer.data})

    else:  # POST
        serializer = AllocatedResourceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(assessment=assessment)
        return Response({
            'success': True,
            'message': 'Resource allocated.',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([AllowAny])
def resource_detail(request, kaizen_id, resource_id):
    """
    PUT/DELETE /api/v1/kaizens/<id>/resources/<resource_id>/
    Update or remove a resource allocation.
    """
    resource = get_object_or_404(
        AllocatedResource,
        pk=resource_id,
        assessment__kaizen_id=kaizen_id,
    )

    if request.method == 'DELETE':
        resource.delete()
        return Response({'success': True, 'message': 'Resource removed.'})

    serializer = AllocatedResourceSerializer(resource, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({'success': True, 'data': serializer.data})
