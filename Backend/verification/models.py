"""
Verification Models — Kaizen Verification & Closure
"""

from django.db import models
from django.conf import settings


class KaizenVerification(models.Model):
    """
    Verification record for a Kaizen implementation.
    Tracks what has been verified before closure can proceed.
    """
    kaizen = models.OneToOneField(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='verification'
    )
    verifier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='kaizen_verifications'
    )
    implementation_verified = models.BooleanField(default=False)
    evidence_verified = models.BooleanField(default=False)
    result_verified = models.BooleanField(default=False)
    benefits_verified = models.BooleanField(default=False)
    cost_savings_verified = models.BooleanField(default=False)
    impact_actions_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    verification_remarks = models.TextField(blank=True)
    is_verified = models.BooleanField(
        default=False,
        help_text='Overall verification status'
    )

    class Meta:
        db_table = 'kaizen_verifications'
        verbose_name = 'Kaizen Verification'
        verbose_name_plural = 'Kaizen Verifications'

    def __str__(self):
        status = 'Verified' if self.is_verified else 'Pending'
        return f"{self.kaizen.sr_no} — {status}"

    @property
    def all_checks_passed(self):
        """Check if all verification checkpoints are passed."""
        return all([
            self.implementation_verified,
            self.evidence_verified,
            self.result_verified,
            self.benefits_verified,
            self.cost_savings_verified,
            self.impact_actions_verified,
        ])


class KaizenClosure(models.Model):
    """
    Final closure record for a Kaizen.
    Created when all conditions are met and Kaizen is closed.
    """
    kaizen = models.OneToOneField(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='closure'
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='kaizens_closed'
    )
    closure_date = models.DateTimeField()
    closure_remarks = models.TextField(blank=True)
    all_actions_completed = models.BooleanField(default=False)

    class Meta:
        db_table = 'kaizen_closures'
        verbose_name = 'Kaizen Closure'
        verbose_name_plural = 'Kaizen Closures'

    def __str__(self):
        return f"{self.kaizen.sr_no} — Closed on {self.closure_date.strftime('%Y-%m-%d')}"
