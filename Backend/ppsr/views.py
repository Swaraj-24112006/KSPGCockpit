"""
PPSR Views — DRF ViewSets and Endpoints for PPSR with Caching & Rate Limiting
=============================================================================
Endpoints for PPSR CRUD, Review Board, Spreadsheet Metrics, Dashboard Summary,
Photo Uploads, Steering Committee Meetings, Feedback, CFT Awards Scoring,
and Leaderboard — protected with Redis caching and fine-grained rate limits.
"""

import os
from datetime import date
import logging
from django.conf import settings
from django.db.models import Count, Sum, Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.core import is_ratelimited
from django_ratelimit.exceptions import Ratelimited
from celery.result import AsyncResult
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .tasks import generate_ppsr_pdf
from .models import (
    PpsrReport,
    PpsrMeetingLog,
    CommitteeFeedback,
    CftMember,
    CftRating,
)
from .serializers import (
    PpsrReportListSerializer,
    PpsrReportDetailSerializer,
    PpsrMetricsSerializer,
    PpsrMeetingLogSerializer,
    CommitteeFeedbackSerializer,
    CftMemberSerializer,
    CftRatingSerializer,
    AwardLeaderboardSerializer,
)
from .filters import PpsrReportFilter
from .mixins import PpsrRateLimitMixin
from .services import (
    generate_ppsr_number,
    get_award_leaderboard,
    get_ppsr_award_category,
)
from .cache import (
    cache_get,
    cache_set,
    leaderboard_key,
    summary_key,
    register_list_key,
    sheet_key,
    meetings_key,
    invalidate_meetings,
    invalidate_all_for_report,
    TTL_LEADERBOARD,
    TTL_SUMMARY,
    TTL_REGISTER,
    TTL_SHEET,
    TTL_MEETINGS,
)

logger = logging.getLogger(__name__)


class PpsrStatusView(APIView):
    """Health / Status endpoint for PPSR module."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "status": "active",
            "module": "ppsr",
            "version": "1.0.0"
        }, status=status.HTTP_200_OK)


# ============================================================================
# Task 4.1 & 4.3–4.7 & 4.9 & 5.4–5.6 & 6.6–6.9, 6.13 — PPSR Report ViewSet
# ============================================================================

class PpsrReportViewSet(PpsrRateLimitMixin, viewsets.ModelViewSet):
    """
    Primary ViewSet for PPSR Reports.
    Provides CRUD with dynamic serialization, soft deletion, committee review actions,
    spreadsheet metrics recalculation, summary stats, inspection, photo uploads,
    and presentation feedback — protected with Redis caching and rate limits.

    Rate limits:
    - create: 10/h per user (deliberate wizard submission)
    - partial_update: 60/h per user (review board editing)
    """
    filterset_class = PpsrReportFilter
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'ppsr_no', 'lead_owner', 'jira_number', 'line_station', 'plant']
    ordering_fields = ['created_at', 'updated_at', 'discovered_on', 'ppsr_no', 'title']
    ordering = ['-created_at']

    RATE_LIMITS = {
        'create': ('10/h', 'POST'),
        'partial_update': ('60/h', 'PATCH'),
    }

    def get_queryset(self):
        qs = PpsrReport.objects.all()
        if self.request.query_params.get('status') != 'Archived':
            qs = qs.exclude(status='Archived')
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return PpsrReportListSerializer
        return PpsrReportDetailSerializer

    def list(self, request, *args, **kwargs):
        """
        List PPSR reports with query caching across all filter combinations.
        """
        key = register_list_key(request.query_params.dict())
        cached = cache_get(key)
        if cached is not None:
            return Response(cached)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data).data
        else:
            serializer = self.get_serializer(queryset, many=True)
            response_data = serializer.data

        cache_set(key, response_data, TTL_REGISTER)
        return Response(response_data)

    def perform_create(self, serializer):
        if 'ppsr_no' not in serializer.validated_data or not serializer.validated_data['ppsr_no']:
            report = serializer.save(ppsr_no=generate_ppsr_number())
        else:
            report = serializer.save()
        invalidate_all_for_report(str(report.id))

    def perform_update(self, serializer):
        report = serializer.save()
        invalidate_all_for_report(str(report.id))

    def destroy(self, request, *args, **kwargs):
        """Soft delete report by marking status as Archived."""
        instance = self.get_object()
        instance.status = 'Archived'
        instance.save(update_fields=['status'])
        invalidate_all_for_report(str(instance.id))
        return Response(
            {'message': 'PPSR report archived successfully', 'id': str(instance.id)},
            status=status.HTTP_200_OK
        )

    # ------------------------------------------------------------------------
    # Task 4.3 & 6.7 — Committee Decision Action (Rate limit: 40/h)
    # ------------------------------------------------------------------------
    @action(detail=True, methods=['patch'], url_path='decision')
    def decision(self, request, pk=None):
        """
        Update committee review decision and advance workflow status.
        Rate limit: 40/hour per user.
        """
        if getattr(settings, 'RATELIMIT_ENABLE', True):
            limited = is_ratelimited(
                request=request,
                group='ppsr:decision',
                key='user_or_ip',
                rate='40/h',
                method='PATCH',
                increment=True,
            )
            if limited:
                raise Ratelimited()

        report = self.get_object()
        decision = request.data.get('committee_decision')
        sign = request.data.get('steering_committee_sign')
        decision_date = request.data.get('committee_decision_date')
        custom_status = request.data.get('status')

        if decision:
            report.committee_decision = decision
            if custom_status:
                report.status = custom_status
            elif decision == 'Approved':
                report.status = 'Closed'
            elif decision == 'Re-work Needed':
                report.status = 'In-Progress'

        if sign:
            report.steering_committee_sign = sign
        if decision_date:
            report.committee_decision_date = decision_date
        elif decision and not report.committee_decision_date:
            report.committee_decision_date = date.today()

        report.save()
        invalidate_all_for_report(str(report.id))
        serializer = PpsrReportDetailSerializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------------
    # Task 4.4 & 6.8 — Spreadsheet Metrics Action (Rate limit: 40/h)
    # ------------------------------------------------------------------------
    @action(detail=True, methods=['patch'], url_path='metrics')
    def metrics(self, request, pk=None):
        """
        Update raw production metrics and re-compute derived values.
        Rate limit: 40/hour per user.
        """
        if getattr(settings, 'RATELIMIT_ENABLE', True):
            limited = is_ratelimited(
                request=request,
                group='ppsr:metrics',
                key='user_or_ip',
                rate='40/h',
                method='PATCH',
                increment=True,
            )
            if limited:
                raise Ratelimited()

        report = self.get_object()
        serializer = PpsrMetricsSerializer(instance=report, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_report = serializer.save()
        invalidate_all_for_report(str(updated_report.id))
        return Response(PpsrReportDetailSerializer(updated_report).data, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------------
    # Task 4.5 & 5.4 — Dashboard Summary Action (Cached)
    # ------------------------------------------------------------------------
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Aggregate executive dashboard metrics with Redis caching.
        """
        key = summary_key()
        cached = cache_get(key)
        if cached is not None:
            return Response(cached)

        stats = PpsrReport.objects.exclude(status='Archived').aggregate(
            total=Count('id'),
            open_count=Count('id', filter=Q(status='Open')),
            in_progress_count=Count('id', filter=Q(status='In-Progress')),
            closed_count=Count('id', filter=Q(status='Closed')),
            total_cost_save_per_month=Sum('cost_save_per_month'),
            total_cost_save_per_annum=Sum('cost_save_per_annum'),
            repeat_cases_count=Count('id', filter=Q(repeat_case='yes')),
            std_completed_count=Count('id', filter=Q(std_status_mf='Completed')),
            total_monthly_savings=Sum('cost_save_per_month'),
            total_annual_savings=Sum('cost_save_per_annum'),
            repeat_cases=Count('id', filter=Q(repeat_case='yes')),
            std_completed=Count('id', filter=Q(std_status_mf='Completed')),
            pending_decision=Count('id', filter=Q(committee_decision='In Review')),
        )

        data = {
            'total_count': stats['total'] or 0,
            'total': stats['total'] or 0,
            'open_count': stats['open_count'] or 0,
            'in_progress_count': stats['in_progress_count'] or 0,
            'closed_count': stats['closed_count'] or 0,
            'total_cost_save_per_month': float(stats['total_cost_save_per_month'] or 0),
            'total_cost_save_per_annum': float(stats['total_cost_save_per_annum'] or 0),
            'total_monthly_savings': float(stats['total_monthly_savings'] or 0),
            'total_annual_savings': float(stats['total_annual_savings'] or 0),
            'repeat_cases_count': stats['repeat_cases_count'] or 0,
            'repeat_cases': stats['repeat_cases'] or 0,
            'std_completed_count': stats['std_completed_count'] or 0,
            'std_completed': stats['std_completed'] or 0,
            'pending_decision': stats['pending_decision'] or 0,
        }
        cache_set(key, data, TTL_SUMMARY)
        return Response(data, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------------
    # Task 4.6 & 5.6 — Sheet Inspect Action (Cached)
    # ------------------------------------------------------------------------
    @action(detail=True, methods=['get'], url_path='sheet')
    def sheet(self, request, pk=None):
        """
        Dedicated endpoint returning full detail structure with per-report caching.
        """
        report_id = str(pk)
        key = sheet_key(report_id)
        cached = cache_get(key)
        if cached is not None:
            return Response(cached)

        report = self.get_object()
        serializer = PpsrReportDetailSerializer(report)
        data = serializer.data
        cache_set(key, data, TTL_SHEET)
        return Response(data, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------------
    # Task 4.7 & 6.13 — Photo Upload Action (Rate limit: 20/h)
    # ------------------------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='photo', parser_classes=[MultiPartParser, FormParser])
    def photo(self, request, pk=None):
        """
        Upload initial problem sketch or effectiveness evidence photo.
        Validates file size (<= 10MB) and image header via Pillow before
        incrementing the rate limit counter.
        Rate limit: 20/hour per user.
        """
        report = self.get_object()
        photo_type = request.data.get('photo_type', 'sketch')
        file_obj = request.FILES.get('file')

        if not file_obj:
            return Response(
                {'error': 'No image file provided in request (key="file").'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if file_obj.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'File size exceeds 10MB limit.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate image format BEFORE incrementing rate limit counter
        try:
            from PIL import Image
            img = Image.open(file_obj)
            img.verify()
            file_obj.seek(0)
        except Exception as e:
            return Response(
                {'error': f'Invalid image file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if getattr(settings, 'RATELIMIT_ENABLE', True):
            limited = is_ratelimited(
                request=request,
                group='ppsr:photo_upload',
                key='user_or_ip',
                rate='20/h',
                method='POST',
                increment=True,
            )
            if limited:
                raise Ratelimited()

        report.sketch_photo = file_obj
        report.save(update_fields=['sketch_photo'])
        invalidate_all_for_report(str(report.id))

        photo_url = request.build_absolute_uri(report.sketch_photo.url) if report.sketch_photo else ''
        return Response({
            'message': f'{photo_type.capitalize()} photo uploaded successfully',
            'photo_url': photo_url,
            'report_id': str(report.id),
        }, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------------
    # Task 7.4 — Async PDF Generation Trigger
    # ------------------------------------------------------------------------
    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        """
        Trigger async PDF generation for PPSR report using Celery.
        Returns task_id and initial status.
        """
        report = self.get_object()
        task = generate_ppsr_pdf.delay(str(report.id))
        return Response({
            'task_id': task.id,
            'status': 'PENDING',
            'ppsr_no': report.ppsr_no,
            'message': 'PDF generation task dispatched successfully.'
        }, status=status.HTTP_202_ACCEPTED)

    # ------------------------------------------------------------------------
    # Task 7.4 — PDF Generation Status Polling
    # ------------------------------------------------------------------------
    @action(detail=True, methods=['get'], url_path='pdf/status')
    def pdf_status(self, request, pk=None):
        """
        Poll async PDF generation status using Celery AsyncResult or check file readiness.
        """
        report = self.get_object()
        task_id = request.query_params.get('task_id')

        # Check if the PDF file already exists on disk
        pdf_rel_path = f'ppsr/exports/{report.ppsr_no}.pdf'
        full_path = os.path.join(settings.MEDIA_ROOT, pdf_rel_path)
        file_exists = os.path.exists(full_path)

        if task_id:
            res = AsyncResult(task_id)
            state = res.state
            is_ready = res.ready() or file_exists
            is_success = res.successful() if res.ready() else file_exists
            return Response({
                'task_id': task_id,
                'state': state,
                'status': state,
                'ready': is_ready,
                'successful': is_success,
                'ppsr_no': report.ppsr_no,
                'file_ready': file_exists
            }, status=status.HTTP_200_OK)

        return Response({
            'state': 'SUCCESS' if file_exists else 'PENDING',
            'status': 'SUCCESS' if file_exists else 'PENDING',
            'ready': file_exists,
            'successful': file_exists,
            'ppsr_no': report.ppsr_no,
            'file_ready': file_exists
        }, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------------
    # Task 7.4 — Stream Generated PDF File
    # ------------------------------------------------------------------------
    @action(detail=True, methods=['get'], url_path='pdf/download')
    def pdf_download(self, request, pk=None):
        """
        Stream generated PDF export once ready.
        """
        report = self.get_object()
        pdf_rel_path = f'ppsr/exports/{report.ppsr_no}.pdf'
        full_path = os.path.join(settings.MEDIA_ROOT, pdf_rel_path)

        # If file doesn't exist yet, try generating it synchronously or return 404
        if not os.path.exists(full_path):
            try:
                generate_ppsr_pdf(str(report.id))
            except Exception as e:
                return Response({
                    'error': f'PDF file is not ready or failed to generate: {str(e)}'
                }, status=status.HTTP_404_NOT_FOUND)

        try:
            file_handle = open(full_path, 'rb')
            response = FileResponse(
                file_handle,
                content_type='application/pdf',
                as_attachment=True,
                filename=f'PPSR_Report_{report.ppsr_no}.pdf'
            )
            return response
        except Exception as e:
            return Response({
                'error': f'Failed to read PDF file: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ------------------------------------------------------------------------
    # Task 4.9 & 6.9 — Committee Feedback Actions (Rate limits: 60/h & 120/h)
    # ------------------------------------------------------------------------
    @action(detail=True, methods=['get', 'post'], url_path='feedback')
    def feedback(self, request, pk=None):
        """List feedback or create new step feedback (Rate limit: 60/h on POST)."""
        report = self.get_object()
        if request.method == 'GET':
            feedbacks = report.committee_feedback.all().order_by('step_number', '-created_at')
            serializer = CommitteeFeedbackSerializer(feedbacks, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif request.method == 'POST':
            if getattr(settings, 'RATELIMIT_ENABLE', True):
                limited = is_ratelimited(
                    request=request,
                    group='ppsr:feedback_create',
                    key='user_or_ip',
                    rate='60/h',
                    method='POST',
                    increment=True,
                )
                if limited:
                    raise Ratelimited()

            serializer = CommitteeFeedbackSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(report=report)
            invalidate_all_for_report(str(report.id))
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path=r'feedback/(?P<feedback_id>[^/.]+)')
    def update_feedback(self, request, pk=None, feedback_id=None):
        """Update or toggle resolved status of feedback note (Rate limit: 120/h)."""
        if getattr(settings, 'RATELIMIT_ENABLE', True):
            limited = is_ratelimited(
                request=request,
                group='ppsr:feedback_toggle',
                key='user_or_ip',
                rate='120/h',
                method='PATCH',
                increment=True,
            )
            if limited:
                raise Ratelimited()

        report = self.get_object()
        feedback_obj = get_object_or_404(CommitteeFeedback, id=feedback_id, report=report)
        serializer = CommitteeFeedbackSerializer(feedback_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        invalidate_all_for_report(str(report.id))
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================================
# Task 4.8 & 5.7 & 6.12 — PPSR Meeting Log ViewSet (Rate limit: 10/h on create)
# ============================================================================

class PpsrMeetingLogViewSet(PpsrRateLimitMixin, viewsets.ModelViewSet):
    """
    ViewSet for Steering Committee Review Meetings.
    Rate limit on create: 10/hour per user.
    """
    queryset = PpsrMeetingLog.objects.all().order_by('-meeting_date')
    serializer_class = PpsrMeetingLogSerializer

    RATE_LIMITS = {
        'create': ('10/h', 'POST'),
    }

    def list(self, request, *args, **kwargs):
        key = meetings_key()
        cached = cache_get(key)
        if cached is not None:
            return Response(cached)

        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        cache_set(key, data, TTL_MEETINGS)
        return Response(data)

    def perform_create(self, serializer):
        instance = serializer.save()
        invalidate_meetings()
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        invalidate_meetings()
        return instance

    def perform_destroy(self, instance):
        instance.delete()
        invalidate_meetings()


# ============================================================================
# Task 4.9 — Standalone Committee Feedback ViewSet
# ============================================================================

class CommitteeFeedbackViewSet(PpsrRateLimitMixin, viewsets.ModelViewSet):
    """
    Direct CRUD ViewSet for committee feedback notes.
    Rate limits: create (60/h), partial_update (120/h).
    """
    queryset = CommitteeFeedback.objects.all().order_by('-created_at')
    serializer_class = CommitteeFeedbackSerializer

    RATE_LIMITS = {
        'create': ('60/h', 'POST'),
        'partial_update': ('120/h', 'PATCH'),
    }


# ============================================================================
# Task 4.10 & 6.11 — CFT Members ViewSet (Rate limit: 10/h on create)
# ============================================================================

class CftMemberViewSet(PpsrRateLimitMixin, viewsets.ModelViewSet):
    """
    ViewSet for listing and adding active CFT evaluation committee members.
    Rate limit on create: 10/hour per user.
    """
    queryset = CftMember.objects.filter(is_active=True).order_by('name')
    serializer_class = CftMemberSerializer

    RATE_LIMITS = {
        'create': ('10/h', 'POST'),
    }


# ============================================================================
# Task 4.11 & 6.10 — CFT Ratings ViewSet (Rate limit: 60/h on POST)
# ============================================================================

class CftRatingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CFT star ratings. Enforces one vote per member per report
    via atomic update_or_create. Rate limit: 60/hour per user.
    """
    queryset = CftRating.objects.all().order_by('-updated_at')
    serializer_class = CftRatingSerializer

    def create(self, request, *args, **kwargs):
        if getattr(settings, 'RATELIMIT_ENABLE', True):
            limited = is_ratelimited(
                request=request,
                group='ppsr:cft_rating',
                key='user_or_ip',
                rate='60/h',
                method='POST',
                increment=True,
            )
            if limited:
                raise Ratelimited()

        member_id = request.data.get('member_id')
        report_id = request.data.get('report_id')
        score = request.data.get('score')

        if not member_id or not report_id or score is None:
            return Response(
                {'error': 'member_id, report_id, and score are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        member = get_object_or_404(CftMember, id=member_id)
        report = get_object_or_404(PpsrReport, id=report_id)

        try:
            score_val = int(score)
            if score_val < 1 or score_val > 5:
                return Response(
                    {'error': 'Score must be an integer between 1 and 5.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'error': 'Score must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        rating, created = CftRating.objects.update_or_create(
            member=member,
            report=report,
            defaults={'score': score_val}
        )
        serializer = self.get_serializer(rating)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


# ============================================================================
# Task 4.12 & 5.3 — Awards Leaderboard View (Cached)
# ============================================================================

class AwardLeaderboardView(APIView):
    """
    Awards Leaderboard endpoint for PPSR monthly awards.
    Supports ?year=YYYY, ?month=Month|YYYY-MM, ?category=MF1, and ?status=All query parameters.
    Caches aggregated leaderboard output with TTL_LEADERBOARD.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        year_param = request.query_params.get('year')
        month_param = request.query_params.get('month')
        category_param = request.query_params.get('category', 'All')
        status_param = request.query_params.get('status', 'All')

        if month_param and '-' in month_param and not year_param:
            try:
                parts = month_param.split('-')
                year_param = parts[0]
                month_param = parts[1]
            except IndexError:
                pass

        year_val = year_param or str(date.today().year)
        month_val = month_param or 'All'
        cat_val = category_param or 'All'
        stat_val = status_param or 'All'

        key = leaderboard_key(year_val, month_val, cat_val, stat_val)

        # 1. Try cache first
        cached = cache_get(key)
        if cached is not None:
            return Response(cached)

        # 2. Cache miss — build from DB
        ranked_list = get_award_leaderboard(
            year=year_val,
            month=month_val,
            category=cat_val if cat_val != 'All' else None,
            status=stat_val if stat_val != 'All' else None,
        )

        CATEGORIES = ['Overall', 'RedX', 'CostFTQ', 'MF1', 'MF2', 'MF3', 'Machining']
        all_categories = list(dict.fromkeys(CATEGORIES + [r['category'] for r in ranked_list]))

        grouped_categories = {}
        for cat in all_categories:
            if cat == 'Overall':
                cat_items = sorted(ranked_list, key=lambda x: x['total_score'], reverse=True)
            else:
                cat_items = [r for r in ranked_list if r['category'].lower() == cat.lower()]
            winner = cat_items[0] if cat_items else None
            grouped_categories[cat] = {
                'winner': winner,
                'rankings': cat_items,
                'count': len(cat_items)
            }

        response_data = {
            'year': year_val,
            'month': month_val,
            'category': cat_val,
            'status': stat_val,
            'leaderboard': ranked_list,
            'categories': grouped_categories,
            'total_evaluated': len(ranked_list)
        }

        # 3. Store result in Redis
        cache_set(key, response_data, TTL_LEADERBOARD)
        return Response(response_data, status=status.HTTP_200_OK)
