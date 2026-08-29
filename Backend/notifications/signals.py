"""
Notification Signals — Auto-generate notifications on workflow events
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from workflow.models import WorkflowHistory
from .models import Notification


@receiver(post_save, sender=WorkflowHistory)
def create_workflow_notification(sender, instance, created, **kwargs):
    """
    Auto-create notifications when workflow actions occur.
    """
    if not created:
        return

    kaizen = instance.kaizen
    actor = instance.performed_by

    if instance.action == 'submitted':
        # Notify assigned reviewer
        if kaizen.assigned_reviewer and kaizen.assigned_reviewer != actor:
            Notification.objects.create(
                recipient=kaizen.assigned_reviewer,
                notification_type='kaizen_assigned',
                title=f'Kaizen Assigned for Review: {kaizen.sr_no}',
                message=f'{actor.get_full_name()} has submitted "{kaizen.title}" for your review.',
                kaizen=kaizen,
            )

    elif instance.action == 'approved' or instance.action == 'good_point':
        # Notify the creator
        if kaizen.created_by != actor:
            Notification.objects.create(
                recipient=kaizen.created_by,
                notification_type='kaizen_approved',
                title=f'Kaizen Approved: {kaizen.sr_no}',
                message=f'Your Kaizen "{kaizen.title}" has been approved by {actor.get_full_name()}.',
                kaizen=kaizen,
            )

    elif instance.action == 'rejected':
        if kaizen.created_by != actor:
            Notification.objects.create(
                recipient=kaizen.created_by,
                notification_type='kaizen_rejected',
                title=f'Kaizen Rejected: {kaizen.sr_no}',
                message=f'Your Kaizen "{kaizen.title}" has been rejected. Reason: {instance.remarks}',
                kaizen=kaizen,
            )

    elif instance.action == 'rework':
        if kaizen.created_by != actor:
            Notification.objects.create(
                recipient=kaizen.created_by,
                notification_type='kaizen_rework',
                title=f'Kaizen Returned for Rework: {kaizen.sr_no}',
                message=f'Your Kaizen "{kaizen.title}" needs corrections: {instance.remarks}',
                kaizen=kaizen,
            )

    elif instance.action == 'closed':
        if kaizen.created_by != actor:
            Notification.objects.create(
                recipient=kaizen.created_by,
                notification_type='kaizen_closed',
                title=f'Kaizen Closed: {kaizen.sr_no}',
                message=f'Your Kaizen "{kaizen.title}" has been closed by {actor.get_full_name()}.',
                kaizen=kaizen,
            )


def create_notification(recipient, notification_type, title, message, kaizen=None):
    """
    Utility function for creating notifications from any part of the codebase.
    """
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        kaizen=kaizen,
    )
