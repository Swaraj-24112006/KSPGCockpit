"""
Reports Views — Dashboard KPIs, Analytics, and Data Export
"""

import csv
import io
from datetime import datetime
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Q

import openpyxl
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

from kaizens.models import Kaizen
from accounts.permissions import IsReviewerOrAdmin
from core.throttling import ExportRateThrottle


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_kpis(request):
    """
    GET /api/v1/reports/dashboard/
    Dashboard KPIs and summary statistics.
    """
    qs = Kaizen.objects.all()

    # Apply optional year/month filters
    year = request.query_params.get('year')
    month = request.query_params.get('month')
    if year:
        qs = qs.filter(created_at__year=year)
    if month:
        qs = qs.filter(month__iexact=month)

    total_kaizens = qs.count()
    status_breakdown = list(qs.values('status').annotate(count=Count('id')))

    total_savings = qs.filter(status__in=['approved', 'good_point', 'closed']).aggregate(
        total=Sum('cost_save')
    )['total'] or 0

    classification_breakdown = list(
        qs.exclude(classification='pending').values('classification').annotate(count=Count('id'))
    )

    my_pending_reviews = qs.filter(
        assigned_reviewer=request.user,
        status__in=['submitted', 'pending']
    ).count()

    my_drafts = qs.filter(created_by=request.user, status='draft').count()

    return Response({
        'success': True,
        'data': {
            'total_kaizens': total_kaizens,
            'total_savings_inr': float(total_savings),
            'status_breakdown': status_breakdown,
            'classification_breakdown': classification_breakdown,
            'my_pending_reviews': my_pending_reviews,
            'my_drafts': my_drafts,
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsReviewerOrAdmin])
def analytics_summary(request):
    """
    GET /api/v1/reports/analytics/
    Detailed analytics for management.
    """
    qs = Kaizen.objects.exclude(status='draft')

    by_month = list(qs.values('month').annotate(count=Count('id')).order_by('month'))
    by_area = list(qs.values('area').annotate(count=Count('id')).order_by('-count'))
    by_mini_factory = list(qs.values('mini_factory').annotate(count=Count('id')).order_by('-count'))

    # Top contributors
    top_contributors = list(
        qs.values('idea_by').annotate(count=Count('id')).order_by('-count')[:10]
    )

    return Response({
        'success': True,
        'data': {
            'by_month': by_month,
            'by_area': by_area,
            'by_mini_factory': by_mini_factory,
            'top_contributors': top_contributors,
        }
    })


# -----------------------------------------------------------------------
# Data Export Endpoints
# -----------------------------------------------------------------------

def _get_filtered_kaizens_for_export(request):
    """Helper to get Kaizens based on common query params."""
    qs = Kaizen.objects.all()
    
    status_filter = request.query_params.get('status')
    area = request.query_params.get('area')
    month = request.query_params.get('month')
    
    if status_filter:
        qs = qs.filter(status=status_filter)
    if area:
        qs = qs.filter(area__icontains=area)
    if month:
        qs = qs.filter(month__iexact=month)
        
    return qs.select_related('created_by', 'assigned_reviewer', 'benefits')


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsReviewerOrAdmin])
def export_csv(request):
    """GET /api/v1/reports/export/csv/"""
    queryset = _get_filtered_kaizens_for_export(request)
    
    response = HttpResponse(content_type='text/csv')
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    response['Content-Disposition'] = f'attachment; filename="kaizens_export_{timestamp}.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'SR No', 'Month', 'Date', 'Title', 'Status', 'Classification', 
        'Area', 'Mini Factory', 'Idea By', 'Cost Savings (INR)', 
        'Created At'
    ])

    for k in queryset:
        writer.writerow([
            k.sr_no, k.month, k.suggestion_date, k.title,
            k.get_status_display(), k.get_classification_display(),
            k.area, k.mini_factory, k.idea_by, k.cost_save,
            k.created_at.strftime('%Y-%m-%d')
        ])

    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsReviewerOrAdmin])
def export_excel(request):
    """GET /api/v1/reports/export/excel/"""
    queryset = _get_filtered_kaizens_for_export(request)
    
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = 'Kaizen Export'

    headers = [
        'SR No', 'Month', 'Date', 'Title', 'Status', 'Classification', 
        'Area', 'Mini Factory', 'Idea By', 'Cost Savings (INR)', 
        'Created At'
    ]
    sheet.append(headers)

    for k in queryset:
        sheet.append([
            k.sr_no, k.month, k.suggestion_date, k.title,
            k.get_status_display(), k.get_classification_display(),
            k.area, k.mini_factory, k.idea_by, float(k.cost_save),
            k.created_at.strftime('%Y-%m-%d')
        ])

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    response['Content-Disposition'] = f'attachment; filename="kaizens_export_{timestamp}.xlsx"'
    workbook.save(response)
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsReviewerOrAdmin])
def export_pdf(request):
    """GET /api/v1/reports/export/pdf/"""
    queryset = _get_filtered_kaizens_for_export(request)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("Kaizen Report", styles['Title']))

    data = [[
        'SR No', 'Title', 'Status', 'Area', 'Idea By', 'Cost Save (INR)'
    ]]

    for k in queryset:
        data.append([
            k.sr_no, 
            k.title[:30] + '...' if len(k.title) > 30 else k.title, 
            k.get_status_display(), 
            k.area, 
            k.idea_by, 
            f"{k.cost_save:,.2f}"
        ])

    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    doc.build(elements)

    pdf = buffer.getvalue()
    buffer.close()
    
    response = HttpResponse(content_type='application/pdf')
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    response['Content-Disposition'] = f'attachment; filename="kaizens_export_{timestamp}.pdf"'
    response.write(pdf)
    
    return response
