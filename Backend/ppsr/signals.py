"""
PPSR Signals — Cache Invalidation & Event Triggers
===================================================
Django model signal receivers that automatically invalidate Redis cache
keys upon creation, update, or deletion of PPSR models.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import (
    PpsrReport,
    CftRating,
    PpsrMeetingLog,
    ContainmentAction,
    CorrectiveAction,
    StandardizationItem,
    ReadAcrossItem,
    FiveWhysChain,
    CommitteeFeedback,
)
from .cache import (
    invalidate_leaderboard,
    invalidate_summary,
    invalidate_register,
    invalidate_sheet,
    invalidate_meetings,
    invalidate_all_for_report,
)


@receiver(post_save, sender=CftRating)
@receiver(post_delete, sender=CftRating)
def on_cft_rating_change(sender, instance, **kwargs):
    """
    A CFT member submitted, updated, or removed a star rating.
    Leaderboard rankings are now stale — clear all leaderboard cache variants.
    """
    invalidate_leaderboard()


@receiver(post_save, sender=PpsrReport)
@receiver(post_delete, sender=PpsrReport)
def on_ppsr_report_change(sender, instance, **kwargs):
    """
    A PPSR report was created, updated, or archived/deleted.
    Invalidate summary stats, register list filters, sheet inspect, and leaderboard.
    """
    invalidate_all_for_report(str(instance.id))


@receiver(post_save, sender=PpsrMeetingLog)
@receiver(post_delete, sender=PpsrMeetingLog)
def on_meeting_log_change(sender, instance, **kwargs):
    """
    A Steering Committee meeting log was created or updated.
    Clear meetings list cache.
    """
    invalidate_meetings()


@receiver(post_save, sender=ContainmentAction)
@receiver(post_save, sender=CorrectiveAction)
@receiver(post_save, sender=StandardizationItem)
@receiver(post_save, sender=ReadAcrossItem)
@receiver(post_save, sender=FiveWhysChain)
@receiver(post_save, sender=CommitteeFeedback)
@receiver(post_delete, sender=ContainmentAction)
@receiver(post_delete, sender=CorrectiveAction)
@receiver(post_delete, sender=StandardizationItem)
@receiver(post_delete, sender=ReadAcrossItem)
@receiver(post_delete, sender=FiveWhysChain)
@receiver(post_delete, sender=CommitteeFeedback)
def on_child_model_change(sender, instance, **kwargs):
    """
    A child action or feedback note was updated.
    Clear sheet inspect cache for the parent report.
    """
    if hasattr(instance, 'report_id') and instance.report_id:
        invalidate_sheet(str(instance.report_id))
    elif hasattr(instance, 'report') and instance.report:
        invalidate_sheet(str(instance.report.id))
