"""
Kaizen Models — Core data models for the Kaizen system
=======================================================
Kaizen, KaizenBenefit, KaizenEvidence, KaizenCostSaving
"""

from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from django.utils.timezone import localdate
import datetime


class Kaizen(models.Model):
    """
    Core Kaizen model storing all improvement details.
    Maps to the Kaizen interface in the existing TypeScript types.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('good_point', 'Good Point'),
        ('rejected', 'Rejected'),
        ('rework', 'Returned for Rework'),
        ('closed', 'Closed'),
    ]

    CLASSIFICATION_CHOICES = [
        ('kaizen', 'Kaizen'),
        ('good_point', 'Good Point'),
        ('pending', 'Pending'),
        ('none', 'None'),
    ]

    # Identification
    sr_no = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text='Auto-generated serial number (e.g., KZ-2026-001)'
    )

    # Core Kaizen fields
    month = models.CharField(max_length=20, default='', blank=True, help_text='Month name (e.g., June, July)')
    suggestion_date = models.DateField(default=localdate, help_text='Date the suggestion was made')
    title = models.CharField(max_length=500, blank=True, default='', help_text='Kaizen improvement title')
    problem_before = models.TextField(blank=True, default='', help_text='Description of the problem before improvement')
    counter_measure_after = models.TextField(blank=True, default='', help_text='Description of the countermeasure / improvement after')
    area = models.CharField(max_length=200, blank=True, default='', help_text='Plant area')
    mini_factory = models.CharField(max_length=100, blank=True, default='', help_text='Mini-factory designation')
    location = models.CharField(max_length=200, blank=True, default='', help_text='Specific location')
    machine = models.CharField(max_length=200, blank=True, default='', help_text='Machine/equipment name')

    # Dates
    closing_target_date = models.DateField(null=True, blank=True, help_text='Target date for closing')
    implementation_date = models.DateField(null=True, blank=True, help_text='Actual implementation date')

    # Cost & savings
    cost_save = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Cost saving in INR'
    )

    # People
    idea_by = models.CharField(max_length=200, blank=True, default='', help_text='Name of the person who suggested the idea')
    implemented_by = models.CharField(max_length=200, blank=True, default='', help_text='Person/team who implemented')
    prepared_by = models.CharField(max_length=200, blank=True, default='', help_text='Person who prepared the Kaizen sheet')
    approved_by = models.CharField(max_length=200, blank=True, default='', help_text='Approver name')
    verified_by_name = models.CharField(max_length=200, blank=True, default='', help_text='Verifier name')

    # Status & Classification
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        db_index=True,
    )
    classification = models.CharField(
        max_length=20,
        choices=CLASSIFICATION_CHOICES,
        default='pending',
    )

    # Additional fields
    remark = models.TextField(blank=True, help_text='Reviewer/manager remarks')
    result = models.TextField(blank=True, help_text='Result description after implementation')

    # Before/After photo storage (file path references)
    photo_before = models.ImageField(
        upload_to='kaizen_photos/before/',
        null=True,
        blank=True,
        help_text='Before improvement photo'
    )
    photo_after = models.ImageField(
        upload_to='kaizen_photos/after/',
        null=True,
        blank=True,
        help_text='After improvement photo'
    )

    # Foreign keys
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='kaizens_created',
        help_text='User who created this Kaizen'
    )
    assigned_reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='kaizens_to_review',
        help_text='Reviewer assigned to this Kaizen'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'kaizens'
        ordering = ['-created_at']
        verbose_name = 'Kaizen'
        verbose_name_plural = 'Kaizens'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['classification']),
            models.Index(fields=['area']),
            models.Index(fields=['mini_factory']),
            models.Index(fields=['month']),
            models.Index(fields=['created_by']),
            models.Index(fields=['assigned_reviewer']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.sr_no} — {self.title}"

    @staticmethod
    def generate_sr_no():
        """Generate the next sequential Kaizen serial number."""
        current_year = timezone.now().year
        prefix = f'KZ-{current_year}-'
        last_kaizen = Kaizen.objects.filter(
            sr_no__startswith=prefix
        ).order_by('-sr_no').first()

        if last_kaizen:
            try:
                last_num = int(last_kaizen.sr_no.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f'{prefix}{str(next_num).zfill(3)}'

    @property
    def is_editable(self):
        """Only drafts and rework Kaizens can be edited."""
        return self.status in ('draft', 'rework')

    @property
    def is_deletable(self):
        """Only drafts can be deleted."""
        return self.status == 'draft'

    @property
    def days_to_implement(self):
        """Calculate days between suggestion and implementation."""
        if self.implementation_date and self.suggestion_date:
            return (self.implementation_date - self.suggestion_date).days
        return None

    @property
    def days_to_close(self):
        """Calculate days between suggestion and closure."""
        if hasattr(self, 'closure') and self.closure and self.closure.closure_date:
            return (self.closure.closure_date.date() - self.suggestion_date).days
        return None


class KaizenBenefit(models.Model):
    """
    Benefits associated with a Kaizen.
    Maps to the benefits object: { p, q, c, d, s, m }
    """
    kaizen = models.OneToOneField(
        Kaizen,
        on_delete=models.CASCADE,
        related_name='benefits'
    )
    productivity = models.BooleanField(default=False, help_text='P - Productivity improvement')
    quality = models.BooleanField(default=False, help_text='Q - Quality improvement')
    cost = models.BooleanField(default=False, help_text='C - Cost reduction')
    delivery = models.BooleanField(default=False, help_text='D - Delivery improvement')
    safety = models.BooleanField(default=False, help_text='S - Safety improvement')
    morale = models.BooleanField(default=False, help_text='M - Morale improvement')

    class Meta:
        db_table = 'kaizen_benefits'
        verbose_name = 'Kaizen Benefit'
        verbose_name_plural = 'Kaizen Benefits'

    def __str__(self):
        flags = []
        if self.productivity: flags.append('P')
        if self.quality: flags.append('Q')
        if self.cost: flags.append('C')
        if self.delivery: flags.append('D')
        if self.safety: flags.append('S')
        if self.morale: flags.append('M')
        return f"{self.kaizen.sr_no} Benefits: {', '.join(flags) or 'None'}"


class KaizenEvidence(models.Model):
    """
    Before/after evidence files attached to a Kaizen.
    Supports multiple evidence files per Kaizen.
    """
    EVIDENCE_TYPE_CHOICES = [
        ('before', 'Before'),
        ('after', 'After'),
    ]

    kaizen = models.ForeignKey(
        Kaizen,
        on_delete=models.CASCADE,
        related_name='evidence_files'
    )
    evidence_type = models.CharField(max_length=10, choices=EVIDENCE_TYPE_CHOICES)
    file = models.ImageField(
        upload_to='kaizen_evidence/%Y/%m/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp', 'gif'])],
    )
    original_filename = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0, help_text='File size in bytes')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_evidence'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kaizen_evidence'
        ordering = ['-uploaded_at']
        verbose_name = 'Kaizen Evidence'
        verbose_name_plural = 'Kaizen Evidence'

    def __str__(self):
        return f"{self.kaizen.sr_no} — {self.get_evidence_type_display()} evidence"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.file and self.file.size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise ValidationError(
                f'File size exceeds the maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.'
            )


class KaizenCostSaving(models.Model):
    """
    Detailed cost saving information for a Kaizen.
    Extends the basic cost_save field on the Kaizen model.
    """
    kaizen = models.OneToOneField(
        Kaizen,
        on_delete=models.CASCADE,
        related_name='cost_saving_detail'
    )
    savings_inr = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total savings in INR'
    )
    monthly_savings = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Monthly recurring savings in INR'
    )
    annual_savings = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Annual savings in INR'
    )
    calculation_notes = models.TextField(
        blank=True,
        help_text='Notes on how savings were calculated'
    )

    class Meta:
        db_table = 'kaizen_cost_savings'
        verbose_name = 'Kaizen Cost Saving'
        verbose_name_plural = 'Kaizen Cost Savings'

    def __str__(self):
        return f"{self.kaizen.sr_no} — ₹{self.savings_inr:,.2f}"
