"""
Impact Views — Assessment CRUD, Impact Items, Actions, Resources
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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
@permission_classes([IsAuthenticated])
def impact_assessment_view(request, kaizen_id):
    """
    GET/POST/PUT /api/v1/kaizens/<id>/impact-assessment/
    Retrieve, create, or update the impact assessment for a Kaizen.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

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

    elif request.method == 'POST':
        if hasattr(kaizen, 'impact_assessment'):
            raise KaizenAPIException(
                message='Impact assessment already exists. Use PUT to update.',
                code='DUPLICATE_RESOURCE',
                status_code=409,
            )
        serializer = ImpactAssessmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assessment = serializer.save(
            kaizen=kaizen,
            reviewed_by=request.user,
            reviewed_date=timezone.now().date(),
        )

        # Auto-create the 4 standard impact items
        for category in ['five_m', 'safety', 'pfd', 'pfmea']:
            ImpactItem.objects.get_or_create(
                assessment=assessment,
                category=category,
                defaults={'assigned_to_name': kaizen.idea_by}
            )

        full_serializer = ImpactAssessmentSerializer(assessment)
        return Response({
            'success': True,
            'message': 'Impact assessment created.',
            'data': full_serializer.data,
        }, status=status.HTTP_201_CREATED)

    else:  # PUT / PATCH
        try:
            assessment = kaizen.impact_assessment
        except ImpactAssessment.DoesNotExist:
            raise KaizenAPIException(
                message='No impact assessment exists. Create one first with POST.',
                code='NOT_FOUND',
                status_code=404,
            )
        partial = request.method == 'PATCH'
        serializer = ImpactAssessmentCreateSerializer(
            assessment, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        assessment.update_closure_status()

        full_serializer = ImpactAssessmentSerializer(assessment)
        return Response({
            'success': True,
            'message': 'Impact assessment updated.',
            'data': full_serializer.data,
        })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def impact_items_view(request, kaizen_id):
    """
    GET/POST /api/v1/kaizens/<id>/impact-items/
    List or create impact items for a Kaizen's assessment.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    try:
        assessment = kaizen.impact_assessment
    except ImpactAssessment.DoesNotExist:
        raise KaizenAPIException(
            message='Create an impact assessment first.',
            code='NOT_FOUND',
            status_code=404,
        )

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
@permission_classes([IsAuthenticated])
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
    permission_classes = [IsAuthenticated]
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
            qs = qs.filter(kaizen__created_by__department__icontains=department)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return ImpactActionCreateSerializer
        return ImpactActionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action_obj = serializer.save()
        return Response({
            'success': True,
            'message': 'Impact action created.',
            'data': ImpactActionSerializer(action_obj).data,
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = ImpactActionSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # If action belongs to an assessment, recalculate closure
        if instance.assessment:
            instance.assessment.update_closure_status()

        return Response({
            'success': True,
            'message': 'Impact action updated.',
            'data': serializer.data,
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
@permission_classes([IsAuthenticated])
def resources_view(request, kaizen_id):
    """
    GET/POST /api/v1/kaizens/<id>/resources/
    List or add allocated resources.
    """
    kaizen = get_object_or_404(Kaizen, pk=kaizen_id)

    try:
        assessment = kaizen.impact_assessment
    except ImpactAssessment.DoesNotExist:
        raise KaizenAPIException(
            message='Create an impact assessment first.',
            code='NOT_FOUND',
            status_code=404,
        )

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
@permission_classes([IsAuthenticated])
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
