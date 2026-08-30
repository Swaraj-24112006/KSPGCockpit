"""
PPSR Celery Tasks — Async Processing
====================================
Async tasks for batch PDF exports and notifications.
"""

from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task
def generate_ppsr_pdf_async(ppsr_id: str):
    """Async task placeholder for PDF generation."""
    logger.info(f"Triggered async PDF export for PPSR: {ppsr_id}")
    return True
