"""
Voting Models — CFT Monthly Awards Voting System
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class VotingSession(models.Model):
    """
    A voting session for a specific month/year.
    CFT members vote on eligible Kaizens within this session.
    """
    month = models.CharField(max_length=20, help_text='Month name (e.g., July)')
    year = models.IntegerField()
    is_open = models.BooleanField(default=True)
    eligible_kaizens = models.ManyToManyField(
        'kaizens.Kaizen',
        related_name='voting_sessions',
        blank=True,
    )
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='voting_sessions_opened'
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'kaizen_voting_sessions'
        unique_together = ['month', 'year']
        ordering = ['-year', '-opened_at']

    def __str__(self):
        status = 'Open' if self.is_open else 'Closed'
        return f"Voting — {self.month} {self.year} ({status})"


class CftVote(models.Model):
    """
    Individual CFT member vote on a Kaizen.
    Supports ranks 1, 2, and 3.
    """
    session = models.ForeignKey(
        VotingSession,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='cft_votes'
    )
    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='cft_votes'
    )
    rank = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text='Rank: 1 = Best, 2 = Second, 3 = Third'
    )
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kaizen_votes'
        unique_together = ['session', 'voter', 'kaizen']
        ordering = ['rank']

    def __str__(self):
        return f"{self.voter.get_full_name()} -> {self.kaizen.sr_no} (Rank {self.rank})"


# -----------------------------------------------------------------
# NEW UNAUTHENTICATED CFT EVALUATION MODELS
# Used by CftMonthlyAwards.tsx without requiring Django Auth.
# -----------------------------------------------------------------

class CftMember(models.Model):
    """
    A CFT committee member stored in the database.
    No link to Django auth user — identified by name/role.
    """
    DEPARTMENT_CHOICES = [
        ('Operations', 'Operations'),
        ('Quality', 'Quality'),
        ('Engineering', 'Engineering'),
        ('Maintenance', 'Maintenance'),
        ('Machining', 'Machining'),
        ('Management', 'Management'),
        ('Other', 'Other'),
    ]

    name = models.CharField(max_length=120)
    role = models.CharField(max_length=120, default='CFT Reviewer')
    department = models.CharField(max_length=60, choices=DEPARTMENT_CHOICES, default='Operations')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cft_members'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.role})"


class CftSession(models.Model):
    """
    A monthly CFT evaluation session.
    Tracks which Kaizens are being evaluated and stores attendance.
    """
    month = models.CharField(max_length=20)
    year = models.IntegerField()
    is_open = models.BooleanField(default=True)
    opened_by_name = models.CharField(max_length=120, default='Committee Lead')
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    description = models.TextField(blank=True)

    # Attendance: IDs of present members stored as comma-separated string
    present_member_ids = models.TextField(
        blank=True,
        default='',
        help_text='Comma-separated list of CftMember IDs who are present'
    )

    # Category overrides: JSON {kaizen_id: category_key}
    category_overrides = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'cft_sessions'
        unique_together = ['month', 'year']
        ordering = ['-year', '-opened_at']

    def __str__(self):
        status = 'Open' if self.is_open else 'Closed'
        return f"CFT Session — {self.month} {self.year} ({status})"

    def get_present_ids(self):
        """Return list of present member IDs as integers."""
        if not self.present_member_ids:
            return []
        return [int(x) for x in self.present_member_ids.split(',') if x.strip().isdigit()]

    def set_present_ids(self, id_list):
        """Set present member IDs from a list of integers/strings."""
        self.present_member_ids = ','.join(str(i) for i in id_list)


class CftStarRating(models.Model):
    """
    A star rating (1-5) from a CftMember on a specific Kaizen within a CftSession.
    One row per (session, member, kaizen) combination.
    """
    session = models.ForeignKey(
        CftSession,
        on_delete=models.CASCADE,
        related_name='star_ratings'
    )
    member = models.ForeignKey(
        CftMember,
        on_delete=models.CASCADE,
        related_name='star_ratings'
    )
    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='cft_star_ratings'
    )
    stars = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Star rating: 1 (lowest) to 5 (highest)'
    )
    rated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cft_star_ratings'
        unique_together = ['session', 'member', 'kaizen']
        ordering = ['-stars']

    def __str__(self):
        return f"{self.member.name} -> {self.kaizen.sr_no}: {self.stars} stars"
