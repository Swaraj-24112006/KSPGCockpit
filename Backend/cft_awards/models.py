"""
CFT Awards — Data Models
=========================
Models:
  - CftMember      : A cross-functional team member who can attend and be nominated.
  - AwardCycle     : Represents one month/period of awards (e.g. "August 2026 - MF1").
  - AttendanceRecord : Tracks whether a CftMember attended a specific AwardCycle session.
  - MonthlyAward   : Stores the award nomination/result for a member in a cycle.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone


# ─── Constants ────────────────────────────────────────────────────────────────

MINI_FACTORY_CHOICES = [
    ('MF1', 'Mini Factory 1'),
    ('MF2', 'Mini Factory 2'),
    ('MF3', 'Mini Factory 3'),
    ('Central', 'Central'),
]

DEPARTMENT_CHOICES = [
    ('Quality',      'Quality'),
    ('Operations',   'Operations'),
    ('Engineering',  'Engineering'),
    ('Maintenance',  'Maintenance'),
    ('Machining',    'Machining'),
    ('Production',   'Production'),
    ('HR',           'HR'),
    ('Safety',       'Safety'),
    ('Finance',      'Finance'),
    ('Other',        'Other'),
]

AWARD_TYPE_CHOICES = [
    ('best_kaizen',       'Best Kaizen'),
    ('most_improved',     'Most Improved'),
    ('team_player',       'Team Player'),
    ('innovation',        'Innovation Award'),
    ('safety_champion',   'Safety Champion'),
    ('custom',            'Custom Award'),
]

AWARD_STATUS_CHOICES = [
    ('nominated',  'Nominated'),
    ('approved',   'Approved'),
    ('rejected',   'Rejected'),
    ('presented',  'Presented'),
]


# ─── Models ───────────────────────────────────────────────────────────────────

class CftMember(models.Model):
    """
    A Cross-Functional Team member who participates in monthly award cycles.
    May optionally be linked to a system user (CustomUser).
    """
    # Optional link to a system user account
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cft_profile',
        help_text='System user account linked to this CFT member (optional).',
    )

    name = models.CharField(max_length=150, help_text='Full name of the CFT member.')
    employee_id = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        null=True,
        help_text='Employee ID (optional, must be unique if provided).',
    )
    role = models.CharField(max_length=150, help_text='Job role / designation.')
    department = models.CharField(
        max_length=50,
        choices=DEPARTMENT_CHOICES,
        default='Operations',
    )
    mini_factory = models.CharField(
        max_length=20,
        choices=MINI_FACTORY_CHOICES,
        default='MF1',
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Inactive members are hidden from attendance sheets and nomination lists.',
    )
    joined_date = models.DateField(default=timezone.localdate)
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='cft_members_created',
    )

    class Meta:
        ordering = ['department', 'name']
        verbose_name = 'CFT Member'
        verbose_name_plural = 'CFT Members'

    def __str__(self):
        return f'{self.name} ({self.department})'


class AwardCycle(models.Model):
    """
    One period of awards — typically one calendar month per mini-factory.
    e.g. "August 2026 – MF1"
    """
    title = models.CharField(
        max_length=200,
        help_text='Human-readable label, e.g. "August 2026 Awards – MF1".',
    )
    mini_factory = models.CharField(
        max_length=20,
        choices=MINI_FACTORY_CHOICES,
        default='MF1',
    )
    month = models.PositiveSmallIntegerField(
        help_text='Calendar month (1–12).',
    )
    year = models.PositiveSmallIntegerField(
        help_text='Calendar year, e.g. 2026.',
    )
    session_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date on which the award session / meeting took place.',
    )
    is_finalized = models.BooleanField(
        default=False,
        help_text='Once finalized, attendance and awards are locked from editing.',
    )
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='award_cycles_created',
    )

    class Meta:
        ordering = ['-year', '-month', 'mini_factory']
        unique_together = [('mini_factory', 'month', 'year')]
        verbose_name = 'Award Cycle'
        verbose_name_plural = 'Award Cycles'

    def __str__(self):
        return f'{self.title} ({self.mini_factory})'


class AttendanceRecord(models.Model):
    """
    Tracks whether a CftMember was present at a given AwardCycle session.
    """
    cycle = models.ForeignKey(
        AwardCycle,
        on_delete=models.CASCADE,
        related_name='attendance_records',
    )
    member = models.ForeignKey(
        CftMember,
        on_delete=models.CASCADE,
        related_name='attendance_records',
    )
    is_present = models.BooleanField(default=False)
    marked_at = models.DateTimeField(auto_now=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='attendance_marks',
    )

    class Meta:
        unique_together = [('cycle', 'member')]
        ordering = ['cycle', 'member__name']
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'

    def __str__(self):
        status = 'Present' if self.is_present else 'Absent'
        return f'{self.member.name} — {self.cycle.title} ({status})'


AWARD_WINNER_STATUS_CHOICES = [
    ('PREVIEW', 'Preview'),
    ('FINALIZED', 'Finalized'),
]

class MonthlyAward(models.Model):
    """
    A persistent record of a winning Kaizen for a specific monthly CFT Evaluation Session.
    Stores the exact calculated ranking, score, and category.
    """
    session = models.ForeignKey(
        'cft_awards.CFTEvaluationSession',
        on_delete=models.CASCADE,
        related_name='monthly_awards',
        help_text='The CFT evaluation session this award belongs to.',
    )
    category = models.CharField(
        max_length=50,
        help_text='The category code (e.g., MF1, Quality) this award was won under.',
    )
    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='monthly_awards',
        help_text='The winning Kaizen.',
    )
    rank = models.PositiveIntegerField(
        help_text='The position (1st, 2nd, etc.) won in this category.',
    )
    score = models.PositiveIntegerField(
        help_text='The cumulative CFT score that earned this win.',
    )
    winner_status = models.CharField(
        max_length=20,
        choices=AWARD_WINNER_STATUS_CHOICES,
        default='PREVIEW',
        help_text='PREVIEW until the session is permanently locked.',
    )
    finalized_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the award was officially finalized.',
    )
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='finalized_monthly_awards',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cft_monthly_awards'
        ordering = ['session', 'category', 'rank']
        verbose_name = 'Monthly Award'
        verbose_name_plural = 'Monthly Awards'
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'category', 'rank'],
                name='unique_session_category_rank'
            ),
            models.UniqueConstraint(
                fields=['session', 'kaizen'],
                name='unique_session_kaizen_award'
            )
        ]

    def __str__(self):
        return f"{self.category} Rank {self.rank}: Kaizen #{self.kaizen_id} (Score: {self.score})"


# ─── Monthly Evaluation Session ───────────────────────────────────────────────

SESSION_STATUS_OPEN = 'OPEN'
SESSION_STATUS_FINALIZED = 'FINALIZED'
SESSION_STATUS_LOCKED = 'LOCKED'

SESSION_STATUS_CHOICES = [
    (SESSION_STATUS_OPEN, 'Open'),
    (SESSION_STATUS_FINALIZED, 'Finalized'),
    (SESSION_STATUS_LOCKED, 'Locked'),
]


class CFTEvaluationSession(models.Model):
    """
    Monthly CFT evaluation session.
    Persists exactly one evaluation session per calendar month and year.
    Stores evaluation status, active committee attendance, and category overrides.
    """
    month = models.CharField(
        max_length=20,
        help_text='Month name or representation, e.g. "August" or "8"',
    )
    year = models.PositiveIntegerField(
        help_text='Calendar year, e.g. 2026',
    )
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cft_sessions_opened',
        help_text='User who opened or initialized the evaluation session',
    )
    opened_at = models.DateTimeField(
        default=timezone.now,
        help_text='Timestamp when the session was created/opened',
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Timestamp when the session was last updated',
    )
    status = models.CharField(
        max_length=20,
        choices=SESSION_STATUS_CHOICES,
        default=SESSION_STATUS_OPEN,
        help_text='Session state: OPEN, FINALIZED, or LOCKED',
    )
    category_overrides = models.JSONField(
        default=dict,
        blank=True,
        help_text='Map of Kaizen ID -> CategoryKey overrides for this session',
    )
    present_member_ids = models.JSONField(
        default=list,
        blank=True,
        help_text='List of present CFT member IDs (strings or ints) in this session',
    )

    class Meta:
        db_table = 'cft_evaluation_sessions'
        ordering = ['-year', '-opened_at']
        constraints = [
            models.UniqueConstraint(
                fields=['month', 'year'],
                name='unique_cft_session_month_year'
            )
        ]
        verbose_name = 'CFT Evaluation Session'
        verbose_name_plural = 'CFT Evaluation Sessions'

    def __str__(self):
        return f"CFT Session: {self.month} {self.year} [{self.status}]"


class CFTRating(models.Model):
    """
    Rating given by a CFT Member to a Kaizen during an evaluation session.
    """
    session = models.ForeignKey(
        CFTEvaluationSession,
        on_delete=models.CASCADE,
        related_name='ratings',
    )
    member = models.ForeignKey(
        CftMember,
        on_delete=models.CASCADE,
        related_name='cft_ratings',
    )
    kaizen = models.ForeignKey(
        'kaizens.Kaizen',
        on_delete=models.CASCADE,
        related_name='cft_ratings',
    )
    stars = models.PositiveSmallIntegerField(
        default=0,
        help_text='Star rating from 1 to 5',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cft_ratings'
        unique_together = [('session', 'member', 'kaizen')]
        ordering = ['-created_at']
        verbose_name = 'CFT Kaizen Rating'
        verbose_name_plural = 'CFT Kaizen Ratings'

    def __str__(self):
        return f"Rating by {self.member.name} on Kaizen #{self.kaizen_id}: {self.stars} stars"


class CFTSessionMember(models.Model):
    """
    Monthly session attendance per CFT member.
    Enforces UNIQUE(session, member).
    """
    session = models.ForeignKey(
        CFTEvaluationSession,
        on_delete=models.CASCADE,
        related_name='session_members',
        help_text='Evaluation session for a specific month/year',
    )
    member = models.ForeignKey(
        CftMember,
        on_delete=models.CASCADE,
        related_name='session_memberships',
        help_text='CFT Committee member',
    )
    present = models.BooleanField(
        default=True,
        help_text='True if member is present for the evaluation session',
    )
    marked_at = models.DateTimeField(
        auto_now=True,
        help_text='Timestamp when attendance was marked/updated',
    )
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='cft_session_marks',
        help_text='User who recorded this attendance mark',
    )

    class Meta:
        db_table = 'cft_session_members'
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'member'],
                name='unique_session_member'
            )
        ]
        ordering = ['member__department', 'member__name']
        verbose_name = 'CFT Session Member'
        verbose_name_plural = 'CFT Session Members'

    def __str__(self):
        status_text = 'Present' if self.present else 'Absent'
        return f"{self.member.name} in {self.session} ({status_text})"


# Alias for explicit naming compatibility
CFTMember = CftMember


class AwardCategory(models.Model):
    """
    Configurable award category for CFT monthly evaluations.
    Stored as database rows rather than hardcoded frontend constants.
    """
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Category code identifier, e.g., 'MF1', 'MF2', 'MF3', 'Machining', 'Quality', 'Maintenance'",
    )
    name = models.CharField(
        max_length=150,
        help_text="Human-readable title, e.g., 'Minifactory 1 (MF1)'",
    )
    subtitle = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Descriptive scope or line names",
    )
    winner_count = models.PositiveIntegerField(
        default=1,
        help_text="Number of allowable winners in this category",
    )
    badge_bg = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="CSS background / badge styling gradient class",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Active categories appear in monthly evaluation boards",
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Ordering index for display",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cft_award_categories'
        ordering = ['order', 'code']
        verbose_name = 'Award Category'
        verbose_name_plural = 'Award Categories'

    def __str__(self):
        return f"{self.name} ({self.code}) — {self.winner_count} Winner{'s' if self.winner_count > 1 else ''}"



