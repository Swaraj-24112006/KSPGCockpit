"""
Workflow Models — Approval workflow history and review tracking
"""

from django.db import models
from django.conf import settings


class WorkflowHistory(models.Model):
    """
    Immutable record of every workflow action on a Kaizen.
    Provides full audit trail for the approval pipeline.
    """
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('rework', 'Returned for Rework'),
        ('classified', 'Classification Changed'),
        ('good_point', 'Marked as Good Point'),
        ('closed', 'Closed'),
        ('verified', 'Verified'),
    ]

    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='workflow_history'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='workflow_actions',
        null=True,
        blank=True
    )
    remarks = models.TextField(blank=True, help_text='Reviewer remarks or rejection reason')
    performed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kaizen_workflow_history'
        ordering = ['-performed_at']
        verbose_name = 'Workflow History Entry'
        verbose_name_plural = 'Workflow History'

    def __str__(self):
        return f"{self.kaizen.sr_no}: {self.get_action_display()} by {self.performed_by}"
