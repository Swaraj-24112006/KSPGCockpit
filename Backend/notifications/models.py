"""
Notification Models
"""

from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_CHOICES = [
        ('kaizen_submitted', 'Kaizen Submitted'),
        ('kaizen_assigned', 'Assigned for Review'),
        ('kaizen_approved', 'Kaizen Approved'),
        ('kaizen_rejected', 'Kaizen Rejected'),
        ('kaizen_rework', 'Returned for Rework'),
        ('action_assigned', 'Impact Action Assigned'),
        ('action_approaching', 'Action Approaching Deadline'),
        ('action_overdue', 'Action Overdue'),
        ('verification_required', 'Verification Required'),
        ('closure_required', 'Closure Required'),
        ('kaizen_closed', 'Kaizen Closed'),
        ('voting_opened', 'Voting Opened'),
        ('voting_closed', 'Voting Completed'),
        ('general', 'General Notification'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=300)
    message = models.TextField()
    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"[{self.get_notification_type_display()}] → {self.recipient.get_full_name()}"
