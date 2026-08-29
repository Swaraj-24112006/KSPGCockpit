"""
Impact Models — Assessment, Impact Items (5M/Safety/PFD/PFMEA), Actions, Resources
====================================================================================
Maps to KaizenImpactAssessment, ImpactItem, AllocatedResource, and OpenImpactAction
from the existing TypeScript types.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone


class ImpactAssessment(models.Model):
    """
    Top-level impact assessment for a Kaizen.
    Maps to KaizenImpactAssessment in TypeScript types.
    """
    CLOSURE_STATUS_CHOICES = [
        ('pending_review', 'Pending Review'),
        ('actions_allocated', 'Actions Allocated'),
        ('in_progress', 'In Progress'),
        ('fully_closed', 'Fully Closed'),
    ]

    kaizen = models.OneToOneField(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='impact_assessment'
    )
    decided_in_review = models.BooleanField(
        default=False,
        help_text='Whether impact review has been conducted'
    )
    reviewed_date = models.DateField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='impact_reviews_conducted'
    )
    overall_closure_status = models.CharField(
        max_length=20,
        choices=CLOSURE_STATUS_CHOICES,
        default='pending_review'
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='impact_closures'
    )
    closure_date = models.DateTimeField(null=True, blank=True)
    closure_remarks = models.TextField(blank=True)

    class Meta:
        db_table = 'kaizen_impact_assessments'
        verbose_name = 'Impact Assessment'
        verbose_name_plural = 'Impact Assessments'

    def __str__(self):
        return f"Impact Assessment for {self.kaizen.sr_no}"

    def update_closure_status(self):
        """Auto-update closure status based on impact items and actions."""
        items = self.impact_items.all()
        actions = self.actions.all()

        if not items.exists() and not actions.exists():
            self.overall_closure_status = 'pending_review'
        elif all(
            item.status in ('completed', 'not_required') for item in items
        ) and all(
            action.status in ('completed', 'not_required') for action in actions
        ):
            self.overall_closure_status = 'fully_closed'
        elif any(
            item.status == 'in_progress' for item in items
        ) or any(
            action.status == 'in_progress' for action in actions
        ):
            self.overall_closure_status = 'in_progress'
        else:
            self.overall_closure_status = 'actions_allocated'

        self.save(update_fields=['overall_closure_status'])


class ImpactItem(models.Model):
    """
    Individual impact category item (5M Change, Safety, PFD, PFMEA).
    Maps to ImpactItem in TypeScript types.
    """
    CATEGORY_CHOICES = [
        ('five_m', '5M Change'),
        ('safety', 'Safety Impact'),
        ('pfd', 'PFD Update'),
        ('pfmea', 'PFMEA Update'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('not_required', 'Not Required'),
    ]

    assessment = models.ForeignKey(
        ImpactAssessment,
        on_delete=models.CASCADE,
        related_name='impact_items'
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    required = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_impact_items'
    )
    assigned_to_name = models.CharField(
        max_length=200,
        blank=True,
        help_text='Name of assigned person (for display when user FK not available)'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_impact_items'
    )
    completed_by_name = models.CharField(max_length=200, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'kaizen_impact_items'
        unique_together = ['assessment', 'category']
        ordering = ['category']

    def __str__(self):
        return f"{self.assessment.kaizen.sr_no} — {self.get_category_display()}"


class ImpactAction(models.Model):
    """
    Granular action items tracked under impact assessment.
    Maps to OpenImpactAction in TypeScript types.
    """
    CATEGORY_CHOICES = [
        ('man', 'Man'),
        ('machine', 'Machine'),
        ('material', 'Material'),
        ('method', 'Method'),
        ('measurement', 'Measurement'),
        ('safety', 'Safety'),
        ('horizontal_deployment', 'Horizontal Deployment'),
        ('five_m', '5M Change'),
        ('pfd', 'PFD Update'),
        ('pfmea', 'PFMEA Update'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('closed', 'Closed'),
        ('not_required', 'Not Required'),
    ]

    assessment = models.ForeignKey(
        ImpactAssessment,
        on_delete=models.CASCADE,
        related_name='actions',
        null=True,
        blank=True,
    )
    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='impact_actions'
    )
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    description = models.TextField(help_text='Impact action description')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_impact_actions'
    )
    assigned_owner_name = models.CharField(
        max_length=200,
        blank=True,
        help_text='Display name of the assigned owner'
    )
    target_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    action_taken = models.TextField(blank=True)
    completed_date = models.DateField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_impact_actions'
    )
    verified_by_name = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kaizen_impact_actions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.kaizen.sr_no} — {self.get_category_display()}: {self.description[:60]}"

    @property
    def is_overdue(self):
        """Check if action is past target date and not completed."""
        if self.status in ('completed', 'closed', 'not_required'):
            return False
        return self.target_date < timezone.now().date()

    @property
    def days_until_due(self):
        """Days until/since target date (negative = overdue)."""
        return (self.target_date - timezone.now().date()).days


class AllocatedResource(models.Model):
    """
    Resources (employees) allocated to impact activities.
    Maps to AllocatedResource in TypeScript types.
    """
    assessment = models.ForeignKey(
        ImpactAssessment,
        on_delete=models.CASCADE,
        related_name='allocated_resources'
    )
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='allocated_to_impacts'
    )
    employee_name = models.CharField(max_length=200, help_text='Display name')
    role_description = models.CharField(max_length=200, help_text='e.g., Quality Engineer, Safety Officer')
    task_assigned = models.CharField(max_length=300, help_text='e.g., PFMEA Revision, PFD Drawing')

    class Meta:
        db_table = 'kaizen_resources'
        ordering = ['employee_name']

    def __str__(self):
        return f"{self.employee_name} — {self.task_assigned}"
