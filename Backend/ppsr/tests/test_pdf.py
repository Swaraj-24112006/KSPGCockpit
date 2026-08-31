"""
PPSR PDF Export Tests (Phase 7)
===============================
Unit and integration tests for Django template rendering, Celery async task execution,
WeasyPrint PDF generation, status polling, and file streaming endpoints.
"""

import os
from datetime import date
from django.test import TestCase, override_settings
from django.template.loader import render_to_string
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from ppsr.models import (
    PpsrReport,
    ContainmentAction,
    CorrectiveAction,
    StandardizationItem,
    ReadAcrossItem,
    FiveWhysChain,
)
from ppsr.tasks import generate_ppsr_pdf


class PpsrPdfExportTests(TestCase):
    """
    Test suite for PPSR PDF export functionality.
    """

    def setUp(self):
        self.client = APIClient()

        # Create complete PPSR Report fixture
        self.report = PpsrReport.objects.create(
            ppsr_no='BE-2026-999',
            title='Hydraulic Pressure Drop on Assembly Station 4',
            problem_statement='Intermittent loss of clamping pressure observed during shift 2.',
            plant='Pune Plant',
            line_station='Assembly Line 3 - St 4',
            product_component='Hydraulic Actuator Unit',
            amount_defects='15 pcs NOK',
            discovered_on=date(2026, 8, 15),
            discovered_by='Suresh Patil (QA)',
            repeat_case='no',
            lead_owner='Rajesh Kumar',
            project_leader='Rajesh Kumar',
            team_members='Anita Deshmukh, Ramesh Kulkarni',
            target_date=date(2026, 9, 30),
            facts_analysis={
                'whatIs': 'Pressure drop below 120 bar',
                'whatIsNot': 'No electrical fault or pump motor failure',
                'whereIs': 'Station 4 clamping fixture',
                'whereIsNot': 'Station 1-3 hydraulic circuits',
                'howIs': 'Gradual leak over 45 min operating cycle',
                'howIsNot': 'Sudden rupture',
                'whenIs': 'During shift 2 peak temperature',
                'whenIsNot': 'Cold morning startup'
            },
            ishikawa={
                'man': ['Operator training on seal replacement'],
                'machine': ['Worn O-ring seal on cylinder valve'],
                'material': ['Seal batch #882 Shore hardness deviation'],
                'methods': ['Torque check procedure skipped'],
                'milieu': ['Ambient temperature 42 deg C in bay'],
                'measurement': ['Pressure gauge calibrated last week']
            },
            defect_trend_data=[
                {'date': '2026-08-15', 'defectsCount': 15},
                {'date': '2026-08-20', 'defectsCount': 6},
                {'date': '2026-08-25', 'defectsCount': 0}
            ],
            effectiveness_evidence='Defect count reduced from 15 to 0 after fitting viton high-temp seals.',
            read_across_explanation='Applied to Station 5 and Chennai Line 1 fixtures.',
            completion_signatures={
                'projectLeader': 'Rajesh Kumar',
                'steeringCommittee': 'Dr. V. Raman',
                'completedOn': '2026-08-28'
            }
        )

        # Create child models
        self.containment = ContainmentAction.objects.create(
            report=self.report,
            no=1,
            action='100% manual pressure verification before part release',
            responsible='QA Inspection Team',
            date=date(2026, 8, 16),
            status='proven'
        )

        self.corrective = CorrectiveAction.objects.create(
            report=self.report,
            no=1,
            measure='Replace NBR seals with high-temperature Viton fluoroelastomer seals',
            responsible='Maintenance Head',
            deadline=date(2026, 8, 22),
            status='completed'
        )

        self.standardization = StandardizationItem.objects.create(
            report=self.report,
            no=1,
            measure='Updated PM standard check sheet PM-HYD-04 to include Viton seal specs',
            responsible='Process Engineering',
            date=date(2026, 8, 26),
            status='completed'
        )

        self.read_across = ReadAcrossItem.objects.create(
            report=self.report,
            no=1,
            proposal='Inspect all hydraulic clamping fixtures in Plant 2 for NBR seals',
            responsible='Plant Maintenance Team',
            deadline=date(2026, 9, 15)
        )

        self.five_whys = FiveWhysChain.objects.create(
            report=self.report,
            column1=[
                'Hydraulic clamping pressure dropped',
                'Internal oil leakage past piston seal',
                'O-ring seal degraded under heat',
                'Standard NBR seal specified instead of fluoroelastomer',
                'Operating temperature limits not cross-checked during line overhaul'
            ],
            column2=['Pressure sensor warning threshold set too wide'],
            column3=['BOM specification lacked high-ambient temperature validation rule']
        )

    def test_sheet_html_template_rendering(self):
        """Test that ppsr/sheet.html template renders all 8D sections with full context."""
        html = render_to_string('ppsr/sheet.html', {'report': self.report})
        
        # Verify header & metadata
        self.assertIn('BE Problem Solving Sheet', html)
        self.assertIn('BE-2026-999', html)
        self.assertIn('Hydraulic Pressure Drop on Assembly Station 4', html)
        self.assertIn('Rajesh Kumar', html)

        # Verify 8D sections
        self.assertIn('1 Definition of the Problem', html)
        self.assertIn('2 Facts Analysis (IS / IS NOT Comparison)', html)
        self.assertIn('3 Emergency Containment Actions', html)
        self.assertIn('4a Cause Localization (Ishikawa 6M Grid)', html)
        self.assertIn('4b Root Cause Analysis (5 x WHY Drilldown)', html)
        self.assertIn('5 Permanent Corrective Actions', html)
        self.assertIn('6 Effectiveness Verification & Evidence', html)
        self.assertIn('7 Standardization (Protection of Solution)', html)
        self.assertIn('8 Read Across (Yokoten / Lessons Learned)', html)
        self.assertIn('9 Completion & Committee Sign-off', html)

        # Verify child action contents
        self.assertIn('100% manual pressure verification', html)
        self.assertIn('Replace NBR seals with high-temperature Viton', html)
        self.assertIn('Updated PM standard check sheet PM-HYD-04', html)
        self.assertIn('Inspect all hydraulic clamping fixtures in Plant 2', html)
        self.assertIn('Operating temperature limits not cross-checked', html)

    def test_celery_generate_ppsr_pdf_task(self):
        """Test that generate_ppsr_pdf Celery task produces a valid PDF file."""
        pdf_rel_path = generate_ppsr_pdf(str(self.report.id))
        self.assertEqual(pdf_rel_path, f'ppsr/exports/{self.report.ppsr_no}.pdf')

        full_path = os.path.join(settings.MEDIA_ROOT, pdf_rel_path)
        self.assertTrue(os.path.exists(full_path), f"PDF file not found at {full_path}")
        self.assertGreater(os.path.getsize(full_path), 0, "PDF file is empty")

        # Verify PDF header magic bytes (%PDF)
        with open(full_path, 'rb') as f:
            header = f.read(5)
            self.assertEqual(header, b'%PDF-')

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_pdf_trigger_endpoint(self):
        """Test GET /api/ppsr/reports/{id}/pdf/ returns 202 Accepted with task_id."""
        url = f'/api/ppsr/reports/{self.report.id}/pdf/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('task_id', response.data)
        self.assertEqual(response.data['ppsr_no'], 'BE-2026-999')
        self.assertEqual(response.data['status'], 'PENDING')

    def test_pdf_status_endpoint(self):
        """Test GET /api/ppsr/reports/{id}/pdf/status/ returns file status."""
        # Generate the PDF file first
        generate_ppsr_pdf(str(self.report.id))

        url = f'/api/ppsr/reports/{self.report.id}/pdf/status/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['ready'])
        self.assertTrue(response.data['file_ready'])
        self.assertEqual(response.data['ppsr_no'], 'BE-2026-999')

    def test_pdf_download_endpoint(self):
        """Test GET /api/ppsr/reports/{id}/pdf/download/ streams the PDF file."""
        # Generate the PDF file
        generate_ppsr_pdf(str(self.report.id))

        url = f'/api/ppsr/reports/{self.report.id}/pdf/download/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn(f'PPSR_Report_{self.report.ppsr_no}.pdf', response['Content-Disposition'])

        # Verify streaming content
        content = b''.join(response.streaming_content)
        self.assertTrue(content.startswith(b'%PDF-'))
