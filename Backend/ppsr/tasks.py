"""
PPSR Celery Tasks — Async Processing & PDF Generation
=====================================================
Celery tasks for async PDF generation using WeasyPrint with A4 sheet layout.
"""

import os
import logging
from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string
from .models import PpsrReport

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def generate_ppsr_pdf(self, report_id: str) -> str:
    """
    Render the PPSR sheet to PDF using WeasyPrint.
    Returns the relative path to the generated PDF file (e.g. 'ppsr/exports/BE-2026-001.pdf').
    """
    try:
        report = PpsrReport.objects.prefetch_related(
            'containment_actions',
            'corrective_actions',
            'standardization_items',
            'read_across_items'
        ).select_related('five_whys').get(id=report_id)
    except PpsrReport.DoesNotExist:
        logger.error(f"PpsrReport with ID {report_id} not found for PDF export.")
        raise ValueError(f"PpsrReport {report_id} not found.")

    logger.info(f"Generating PDF for PPSR {report.ppsr_no} ({report.id})...")

    # Render Django HTML template
    html_content = render_to_string('ppsr/sheet.html', {'report': report})

    # Prepare export destination
    pdf_rel_path = f'ppsr/exports/{report.ppsr_no}.pdf'
    full_path = os.path.join(settings.MEDIA_ROOT, pdf_rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    try:
        from weasyprint import HTML
        HTML(string=html_content).write_pdf(full_path)
        logger.info(f"Successfully generated PDF for PPSR {report.ppsr_no} at {full_path}")
    except Exception as exc:
        logger.error(f"Failed to generate PDF with WeasyPrint: {exc}", exc_info=True)
        raise

    return pdf_rel_path


# Alias for backwards compatibility
generate_ppsr_pdf_async = generate_ppsr_pdf
