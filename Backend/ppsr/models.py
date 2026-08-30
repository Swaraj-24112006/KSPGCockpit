"""
PPSR Models — Practical Problem Solving Report (8D / Shainin / PSQ)
===================================================================
Models for PPSR Reports, Containment Actions, 5-Whys Analysis,
Permanent Corrective Actions, Standardization, Read-Across,
Review Meetings, Committee Feedback, and CFT Star Ratings.
"""

from uuid import uuid4
from django.db import models


class PpsrReport(models.Model):
    """
    Central PPSR entity tracking the full 8D / Shainin problem-solving lifecycle,
    parameters, facts (IS/IS NOT), Ishikawa, PSQ elimination trees,
    effectiveness, and cost savings.
    """
    # Identity
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    ppsr_no = models.CharField(max_length=30, unique=True)  # e.g. BE-2026-001
    title = models.CharField(max_length=300)
    problem_statement = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[('Open', 'Open'), ('In-Progress', 'In-Progress'), ('Closed', 'Closed')],
        default='Open'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Step 1 — General Parameters
    plant = models.CharField(max_length=150)
    line_station = models.CharField(max_length=100, blank=True)
    product_component = models.CharField(max_length=200, blank=True)
    amount_defects = models.CharField(max_length=100, blank=True)
    discovered_on = models.DateField(null=True, blank=True)
    discovered_by = models.CharField(max_length=200, blank=True)
    repeat_case = models.CharField(
        max_length=3,
        choices=[('yes', 'yes'), ('no', 'no')],
        default='no'
    )
    sketch_photo = models.ImageField(upload_to='ppsr/evidence/', null=True, blank=True)
    initial_evidence_type = models.CharField(
        max_length=10,
        choices=[('data', 'data'), ('photo', 'photo'), ('both', 'both')],
        default='data'
    )
    lead_owner = models.CharField(max_length=200)
    project_leader = models.CharField(max_length=200, blank=True)
    team_members = models.TextField(blank=True)
    target_date = models.DateField(null=True, blank=True)

    # Step 1 — IS / IS NOT Facts Analysis (stored as JSON)
    # {whatIs, whatIsNot, whereIs, whereIsNot, howIs, howIsNot, whenIs, whenIsNot}
    facts_analysis = models.JSONField(default=dict, blank=True)

    # Step 1 — Initial defect trend data (for baseline chart)
    # [{date, defectsCount, stage}, ...]
    initial_defect_trend_data = models.JSONField(default=list, blank=True)

    # Step 3 — Cause localisation approach
    cause_localization_approach = models.CharField(
        max_length=10,
        choices=[('fishbone', 'fishbone'), ('psq', 'psq'), ('both', 'both')],
        default='both'
    )

    # Step 3 — Ishikawa 6M (stored as JSON arrays)
    # {man:[], machine:[], material:[], methods:[], milieu:[], measurement:[]}
    ishikawa = models.JSONField(default=dict, blank=True)

    # Step 3 — PSQ Elimination Tree full data (complex nested JSON)
    psq_tree_data = models.JSONField(default=dict, blank=True)

    # Step 3 — Standard Worksheet rows (PSQ elimination table)
    standard_worksheet = models.JSONField(default=list, blank=True)

    # Step 4 — Effectiveness evidence
    effectiveness_evidence = models.TextField(blank=True)
    evidence_type = models.CharField(
        max_length=10,
        choices=[('data', 'data'), ('photo', 'photo'), ('both', 'both')],
        default='data'
    )
    defect_trend_data = models.JSONField(default=list, blank=True)
    # [{date, defectsCount, stage}, ...]
    effectiveness_chart_data = models.JSONField(default=list, blank=True)
    # [{name, value}, ...]

    # Step 5 — Read Across explanation
    read_across_explanation = models.TextField(blank=True)

    # Step 5 — Completion Signatures
    completion_signatures = models.JSONField(default=dict, blank=True)
    # {projectLeader, steeringCommittee, completedOn}

    # Spreadsheet Metrics (logged via Committee Review / Meeting)
    jira_number = models.CharField(max_length=50, blank=True)
    week = models.CharField(max_length=20, blank=True)  # e.g. WK-28
    coach = models.CharField(max_length=200, blank=True)
    cft = models.CharField(max_length=200, blank=True)
    std_status_mf = models.CharField(
        max_length=20,
        choices=[('Pending', 'Pending'), ('Completed', 'Completed'), ('N/A', 'N/A')],
        default='Pending'
    )
    std_date = models.DateField(null=True, blank=True)
    eff_days_std = models.IntegerField(null=True, blank=True)
    responsibility = models.CharField(max_length=200, blank=True)
    ppsr_end_date = models.DateField(null=True, blank=True)
    eff_days_close_ppsr = models.IntegerField(null=True, blank=True)

    # Production & Rejection Sizing (before/after)
    prod_qty_before = models.IntegerField(null=True, blank=True)
    rejected_qty_before = models.IntegerField(null=True, blank=True)
    pct_before = models.FloatField(null=True, blank=True)
    prod_qty_after = models.IntegerField(null=True, blank=True)
    rejected_qty_after = models.IntegerField(null=True, blank=True)
    pct_after = models.FloatField(null=True, blank=True)
    effectivity_text = models.CharField(max_length=500, blank=True)

    # Customer Demand & Cost Savings (server-calculated)
    cust_demand_qty_month = models.IntegerField(null=True, blank=True)
    cust_demand_qty_annum = models.IntegerField(null=True, blank=True)
    qty_month_before_rej_pct = models.IntegerField(null=True, blank=True)
    qty_month_after_rej_pct = models.IntegerField(null=True, blank=True)
    qty_month_saved_rej_pct = models.IntegerField(null=True, blank=True)
    per_set_rejection_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cost_save_per_month = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    cost_save_per_annum = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    remarks = models.TextField(blank=True)

    # Committee Review fields
    committee_decision = models.CharField(
        max_length=20,
        choices=[
            ('In Review', 'In Review'),
            ('Approved', 'Approved'),
            ('Re-work Needed', 'Re-work Needed')
        ],
        default='In Review',
        blank=True
    )
    committee_decision_date = models.DateField(null=True, blank=True)
    steering_committee_sign = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'PPSR Report'
        verbose_name_plural = 'PPSR Reports'

    def __str__(self):
        return f"[{self.ppsr_no}] {self.title}"


class ContainmentAction(models.Model):
    """
    Emergency Containment Action row (Step 2 of the PPSR Wizard).
    """
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    report = models.ForeignKey(
        PpsrReport,
        on_delete=models.CASCADE,
        related_name='containment_actions'
    )
    no = models.PositiveIntegerField()
    action = models.TextField()
    responsible = models.CharField(max_length=200)
    date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('planned', 'planned'),
            ('in-progress', 'in-progress'),
            ('implemented', 'implemented'),
            ('proven', 'proven')
        ]
    )

    class Meta:
        ordering = ['no']
        verbose_name = 'Containment Action'
        verbose_name_plural = 'Containment Actions'

    def __str__(self):
        return f"Containment #{self.no} for {self.report.ppsr_no}"


class CorrectiveAction(models.Model):
    """
    Permanent Corrective Action row (Step 4 of the PPSR Wizard).
    """
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    report = models.ForeignKey(
        PpsrReport,
        on_delete=models.CASCADE,
        related_name='corrective_actions'
    )
    no = models.PositiveIntegerField()
    measure = models.TextField()
    responsible = models.CharField(max_length=200)
    deadline = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('planned', 'planned'),
            ('in-progress', 'in-progress'),
            ('completed', 'completed'),
            ('proven', 'proven')
        ]
    )

    class Meta:
        ordering = ['no']
        verbose_name = 'Corrective Action'
        verbose_name_plural = 'Corrective Actions'

    def __str__(self):
        return f"Corrective Action #{self.no} for {self.report.ppsr_no}"


class StandardizationItem(models.Model):
    """
    Standardization & Protection of Successful Solution entry (Step 5 of the Wizard).
    """
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    report = models.ForeignKey(
        PpsrReport,
        on_delete=models.CASCADE,
        related_name='standardization_items'
    )
    no = models.PositiveIntegerField()
    measure = models.TextField()
    responsible = models.CharField(max_length=200)
    date = models.DateField()
    status = models.CharField(max_length=20, default='completed')

    class Meta:
        ordering = ['no']
        verbose_name = 'Standardization Item'
        verbose_name_plural = 'Standardization Items'

    def __str__(self):
        return f"Standardization #{self.no} for {self.report.ppsr_no}"


class ReadAcrossItem(models.Model):
    """
    Read-Across / Yokoten Horizontal Deployment entry (Step 5 of the Wizard).
    """
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    report = models.ForeignKey(
        PpsrReport,
        on_delete=models.CASCADE,
        related_name='read_across_items'
    )
    no = models.PositiveIntegerField()
    proposal = models.TextField()
    responsible = models.CharField(max_length=200)
    deadline = models.DateField()

    class Meta:
        ordering = ['no']
        verbose_name = 'Read Across Item'
        verbose_name_plural = 'Read Across Items'

    def __str__(self):
        return f"Read Across #{self.no} for {self.report.ppsr_no}"


class FiveWhysChain(models.Model):
    """
    5-Whys Root Cause Drilldown Chain (3 distinct columns × up to 5 answers).
    """
    report = models.OneToOneField(
        PpsrReport,
        on_delete=models.CASCADE,
        related_name='five_whys'
    )
    column1 = models.JSONField(default=list)  # [why1, why2, why3, why4, why5]
    column2 = models.JSONField(default=list)
    column3 = models.JSONField(default=list)

    class Meta:
        verbose_name = '5-Whys Chain'
        verbose_name_plural = '5-Whys Chains'

    def __str__(self):
        return f"5-Whys for {self.report.ppsr_no}"


class PpsrMeetingLog(models.Model):
    """
    Minutes and action records from PPSR Steering Committee Review Sessions.
    """
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    meeting_date = models.DateField()
    chairperson = models.CharField(max_length=200)
    attendees = models.TextField()  # comma-separated string
    key_discussion_points = models.TextField()
    discussed_ppsr_ids = models.ManyToManyField(
        PpsrReport,
        related_name='meeting_logs',
        blank=True
    )
    next_review_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-meeting_date']
        verbose_name = 'PPSR Meeting Log'
        verbose_name_plural = 'PPSR Meeting Logs'

    def __str__(self):
        return f"Meeting on {self.meeting_date} ({self.chairperson})"


class CommitteeFeedback(models.Model):
    """
    Per-step review feedback notes logged during Presentation Mode.
    """
    FEEDBACK_TYPES = [
        ('revision_needed', 'revision_needed'),
        ('clarification', 'clarification'),
        ('approved', 'approved'),
        ('general', 'general'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    report = models.ForeignKey(
        PpsrReport,
        on_delete=models.CASCADE,
        related_name='committee_feedback'
    )
    step_number = models.IntegerField()  # 1–8 (8D steps)
    step_title = models.CharField(max_length=100)
    reviewer_name = models.CharField(max_length=200)
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPES)
    comment = models.TextField()
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Committee Feedback'
        verbose_name_plural = 'Committee Feedback'

    def __str__(self):
        return f"Step {self.step_number} feedback by {self.reviewer_name} on {self.report.ppsr_no}"


class CftMember(models.Model):
    """
    CFT panel member who evaluates PPSRs in monthly award sessions.
    """
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    department = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'CFT Member'
        verbose_name_plural = 'CFT Members'

    def __str__(self):
        return f"{self.name} ({self.role})"


class CftRating(models.Model):
    """
    Star rating (1–5) given by one CFT member to one PPSR report.
    """
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    member = models.ForeignKey(
        CftMember,
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    report = models.ForeignKey(
        PpsrReport,
        on_delete=models.CASCADE,
        related_name='cft_ratings'
    )
    score = models.IntegerField(choices=[(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['member', 'report']]  # one vote per member per report
        ordering = ['-updated_at']
        verbose_name = 'CFT Rating'
        verbose_name_plural = 'CFT Ratings'

    def __str__(self):
        return f"{self.member.name} rated {self.report.ppsr_no} ({self.score}/5)"
