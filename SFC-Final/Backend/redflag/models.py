import uuid
from django.db import models
from django.conf import settings
from django.core.cache import cache
from .enums import (
    Status, ContainmentStatus, QaCustodianStatus, RedFlagType,
    Severity, Category5M, Repetitive, AttachmentKind, CheckStatus,
    EscalationModule, EscalationState,
)

class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ===================== Phase 1: Master Data =====================

class Department(BaseModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100, unique=True)
    can_originate = models.BooleanField(default=True)
    can_be_target = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Plant(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    plant_head = models.ForeignKey(
        'Employee',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='headed_plants'
    )
    default_qa_custodian = models.ForeignKey(
        'Employee',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='qa_custodian_plants'
    )
    default_quarantine_location = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class Line(BaseModel):
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, related_name='lines')
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('plant', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.plant.code} / {self.name}"


class Station(BaseModel):
    line = models.ForeignKey(Line, on_delete=models.CASCADE, related_name='stations')
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('line', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.line.name} / {self.name}"


class ProductModel(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Employee(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employee_profile'
    )
    employee_code = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=150)
    designation = models.CharField(max_length=150)
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='employees'
    )
    plant = models.ForeignKey(
        Plant,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employees'
    )
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['full_name']

    @property
    def label(self) -> str:
        """Snapshot format: Full Name (Designation)"""
        if self.designation:
            return f"{self.full_name} ({self.designation})"
        return self.full_name

    def __str__(self):
        return self.label


CONFIG_CACHE_KEY = 'redflag_system_config'

class RedFlagConfig(BaseModel):
    containment_sla_minutes = models.IntegerField(default=120)
    gap_bucket_minutes = models.JSONField(default=list)
    sustenance_check_days = models.JSONField(default=list)
    sustenance_audit_grace_days = models.IntegerField(default=3)
    enforce_sustenance_schedule = models.BooleanField(default=True)
    default_target_days = models.IntegerField(default=5)
    ppsr_default_days = models.IntegerField(default=14)
    red_tag_disposal_days = models.IntegerField(default=7)
    form_number = models.CharField(max_length=50, default='SFC/QA/RF-01')
    form_revision = models.CharField(max_length=20, default='03')
    standard_reference = models.CharField(max_length=100, default='IATF 16949:2016 Cl. 10.2')
    max_photo_mb = models.IntegerField(default=10)
    presigned_ttl_seconds = models.IntegerField(default=3600)
    governance_rules = models.JSONField(default=list)

    class Meta:
        verbose_name = "Red Flag Configuration"
        verbose_name_plural = "Red Flag Configuration"

    def save(self, *args, **kwargs):
        if not self.pk and RedFlagConfig.objects.exists():
            self.pk = RedFlagConfig.objects.first().pk
        super().save(*args, **kwargs)
        cache.delete(CONFIG_CACHE_KEY)

    @classmethod
    def get_config(cls):
        cached = cache.get(CONFIG_CACHE_KEY)
        if cached:
            return cached
        config_obj = cls.objects.first()
        if not config_obj:
            config_obj = cls.objects.create(
                containment_sla_minutes=120,
                gap_bucket_minutes=[30, 60, 120],
                sustenance_check_days=[30, 60, 90],
                sustenance_audit_grace_days=3,
                enforce_sustenance_schedule=True,
                default_target_days=5,
                ppsr_default_days=14,
                red_tag_disposal_days=7,
                form_number='SFC/QA/RF-01',
                form_revision='03',
                standard_reference='IATF 16949:2016 Cl. 10.2',
                max_photo_mb=10,
                presigned_ttl_seconds=3600,
                governance_rules=[
                    "Rule 1: Anyone can raise a Red Flag on anyone without fear or barrier.",
                    "Rule 2: Quality is the official custodian of all Red Flags.",
                    "Rule 3: The flag stays open until 3 months (30/60/90-day audits) of zero recurrence are verified."
                ]
            )
        cache.set(CONFIG_CACHE_KEY, config_obj, timeout=3600)
        return config_obj

    def __str__(self):
        return f"RedFlagConfig (Rev {self.form_revision})"


# ===================== Phase 2: Core Tables =====================

class RedFlagSequence(models.Model):
    """Row-locked sequence table for generating unique numbers."""
    name = models.CharField(max_length=50, primary_key=True)
    last_value = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Red Flag Sequence"
        verbose_name_plural = "Red Flag Sequences"

    def __str__(self):
        return f"{self.name}: {self.last_value}"


class Attachment(BaseModel):
    """Photo/file attachment stored in MinIO. Linked to a RedFlag after creation."""
    kind = models.CharField(max_length=30, choices=AttachmentKind.choices)
    red_flag = models.ForeignKey(
        'RedFlag',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='attachments'
    )
    bucket = models.CharField(max_length=100, default='redflag-evidence')
    object_key = models.CharField(max_length=500, unique=True)
    original_name = models.CharField(max_length=255, blank=True, default='')
    content_type = models.CharField(max_length=100, blank=True, default='')
    size_bytes = models.IntegerField(default=0)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    sha256 = models.CharField(max_length=64, blank=True, default='')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='uploaded_attachments'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.kind} - {self.original_name}"


class RedFlag(BaseModel):
    """Core Red Flag record per C2 specification."""
    # Identity
    sr_no = models.IntegerField(unique=True)
    red_flag_no = models.CharField(max_length=30, unique=True)
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.OPEN
    )
    row_version = models.IntegerField(default=1)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='deleted_redflags'
    )

    # Stage 1 - Detection
    raised_at = models.DateTimeField()
    raised_by = models.ForeignKey(
        Employee, on_delete=models.PROTECT,
        related_name='raised_redflags'
    )
    raised_by_name = models.CharField(max_length=200)
    raised_by_department = models.ForeignKey(
        Department, on_delete=models.PROTECT,
        related_name='originated_redflags'
    )
    raised_by_department_name = models.CharField(max_length=100)
    raised_by_role = models.CharField(max_length=100, blank=True, default='')

    target_department = models.ForeignKey(
        Department, on_delete=models.PROTECT,
        related_name='targeted_redflags'
    )
    target_department_name = models.CharField(max_length=100)
    target_person = models.ForeignKey(
        Employee, on_delete=models.PROTECT,
        related_name='targeted_person_redflags'
    )
    target_person_name = models.CharField(max_length=200)
    team_leader = models.CharField(max_length=200, blank=True, default='')

    # Plant/Location
    plant = models.ForeignKey(Plant, on_delete=models.PROTECT, related_name='redflags')
    plant_name = models.CharField(max_length=100)
    line = models.ForeignKey(Line, on_delete=models.PROTECT, related_name='redflags')
    line_name = models.CharField(max_length=100)
    station = models.ForeignKey(Station, on_delete=models.PROTECT, related_name='redflags')
    station_name = models.CharField(max_length=100)
    model = models.ForeignKey(ProductModel, on_delete=models.PROTECT, related_name='redflags')
    model_name = models.CharField(max_length=100)

    # Classification
    red_flag_type = models.CharField(max_length=30, choices=RedFlagType.choices)
    red_flag_sub_type = models.CharField(max_length=200, blank=True, default='')
    severity = models.CharField(max_length=30, choices=Severity.choices)
    category_5m = models.CharField(max_length=30, choices=Category5M.choices)
    repetitive_occurrence = models.CharField(
        max_length=20, choices=Repetitive.choices, default=Repetitive.FIRST_TIME
    )
    description = models.TextField()

    # Evidence
    evidence_photo = models.ForeignKey(
        Attachment,
        on_delete=models.PROTECT,
        related_name='evidence_for_redflag',
        help_text='T0 point-of-defect photo (required)'
    )

    # QA Custodianship
    qa_custodian = models.ForeignKey(
        Employee, on_delete=models.PROTECT,
        related_name='custodian_redflags'
    )
    qa_custodian_name = models.CharField(max_length=200)
    qa_custodian_status = models.CharField(
        max_length=30, choices=QaCustodianStatus.choices,
        default=QaCustodianStatus.REVIEW_PENDING
    )
    qa_custodian_notes = models.TextField(blank=True, default='')
    closure_responsibility = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='closure_redflags'
    )

    # Planning
    target_date = models.DateField()
    sustenance_start_date = models.DateField(null=True, blank=True)
    sustenance_cycle = models.SmallIntegerField(default=1)
    sustenance_achieved = models.BooleanField(default=False)
    closed_early = models.BooleanField(default=False)

    class Meta:
        ordering = ['-raised_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['plant', 'status']),
            models.Index(fields=['target_department', 'status']),
            models.Index(fields=['raised_at']),
            models.Index(fields=['category_5m']),
            models.Index(fields=['severity']),
            models.Index(fields=['target_person']),
        ]

    def __str__(self):
        return f"{self.red_flag_no} ({self.status})"


class StageHistory(BaseModel):
    """Append-only audit trail for stage transitions."""
    STAGE_CHOICES = [
        ('Detection', 'Detection'),
        ('Containment', 'Containment'),
        ('RootCause', 'RootCause'),
        ('CAPA', 'CAPA'),
        ('Effectiveness', 'Effectiveness'),
        ('Sustenance', 'Sustenance'),
    ]
    EVENT_CHOICES = [
        ('RAISED', 'Raised'),
        ('CONTAINMENT_SUBMITTED', 'Containment Submitted'),
        ('CONTAINMENT_APPROVED', 'Containment Approved'),
        ('CONTAINMENT_REJECTED', 'Containment Rejected'),
        ('RCA_SUBMITTED', 'RCA Submitted'),
        ('CAPA_VERIFIED', 'CAPA Verified'),
        ('SUSTENANCE_STARTED', 'Sustenance Started'),
        ('AUDIT_LOGGED', 'Audit Logged'),
        ('CLOSED', 'Closed'),
        ('ESCALATED', 'Escalated'),
    ]

    red_flag = models.ForeignKey(
        RedFlag, on_delete=models.CASCADE,
        related_name='stage_history'
    )
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES)
    event = models.CharField(max_length=30, choices=EVENT_CHOICES)
    completed_at = models.DateTimeField()
    completed_by = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )
    completed_by_name = models.CharField(max_length=200)
    sign_off_role = models.CharField(max_length=50, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    from_status = models.CharField(max_length=30, blank=True, default='')
    to_status = models.CharField(max_length=30, blank=True, default='')

    class Meta:
        ordering = ['completed_at']

    def __str__(self):
        return f"{self.red_flag.red_flag_no} - {self.stage}/{self.event}"

    def save(self, *args, **kwargs):
        # Prevent updates on existing records
        if self.pk and StageHistory.objects.filter(pk=self.pk).exists():
            raise ValueError("StageHistory records are append-only and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("StageHistory records cannot be deleted.")


class RedFlagAuditLog(BaseModel):
    """Detailed audit log for all changes to RedFlag records."""
    red_flag = models.ForeignKey(
        RedFlag, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )
    action = models.CharField(max_length=50)
    changes = models.JSONField(default=dict)  # {field: [old, new]}
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-at']

    def __str__(self):
        flag_no = self.red_flag.red_flag_no if self.red_flag else 'N/A'
        return f"{flag_no} - {self.action} by {self.actor}"

    def save(self, *args, **kwargs):
        # Prevent updates on existing records
        if self.pk and RedFlagAuditLog.objects.filter(pk=self.pk).exists():
            raise ValueError("RedFlagAuditLog records are append-only and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("RedFlagAuditLog records cannot be deleted.")


# ===================== Phase 3 & 4: Containment, Root Cause, Sustenance, Closure =====================

class RedFlagContainment(BaseModel):
    """
    Stage 2 Containment attempt (one row per attempt).
    Only one current attempt per flag.
    """
    red_flag = models.ForeignKey(
        RedFlag,
        on_delete=models.CASCADE,
        related_name='containment_attempts'
    )
    attempt_no = models.IntegerField(default=1)
    is_current = models.BooleanField(default=True)
    action_taken_by = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='+'
    )
    action_taken_by_name = models.CharField(max_length=200)
    contained_at = models.DateTimeField()
    gap_minutes = models.IntegerField(default=0)
    suspect_qty = models.IntegerField(default=0)
    quarantine_tag_no = models.CharField(max_length=50, blank=True, default='')
    quarantine_location = models.CharField(max_length=200)
    sorting_inspected = models.IntegerField(default=0)
    sorting_ok = models.IntegerField(default=0)
    sorting_rejected = models.IntegerField(default=0)
    action_text = models.TextField()
    photo = models.ForeignKey(
        Attachment,
        on_delete=models.PROTECT,
        related_name='+'
    )
    status = models.CharField(
        max_length=30,
        choices=ContainmentStatus.choices,
        default=ContainmentStatus.CONTAINED
    )
    verified_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )
    verified_by_name = models.CharField(max_length=200, blank=True, default='')
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['attempt_no']
        constraints = [
            models.CheckConstraint(
                check=models.Q(suspect_qty__gte=0),
                name='containment_suspect_qty_gte_0'
            ),
            models.CheckConstraint(
                check=models.Q(sorting_inspected__gte=0),
                name='containment_sorting_inspected_gte_0'
            ),
            models.CheckConstraint(
                check=models.Q(sorting_ok__gte=0),
                name='containment_sorting_ok_gte_0'
            ),
            models.CheckConstraint(
                check=models.Q(sorting_rejected__gte=0),
                name='containment_sorting_rejected_gte_0'
            ),
            models.CheckConstraint(
                check=models.Q(sorting_ok__lte=models.F('sorting_inspected') - models.F('sorting_rejected')),
                name='containment_sorting_sum_lte_inspected'
            ),
            models.UniqueConstraint(
                fields=['red_flag'],
                condition=models.Q(is_current=True),
                name='unique_current_containment_per_flag'
            )
        ]

    def __str__(self):
        return f"{self.red_flag.red_flag_no} - Attempt #{self.attempt_no} ({self.status})"


class RedFlagRootCause(BaseModel):
    """
    Stage 3 Root Cause (5-Why) & Systematic Permanent Action.
    1:1 relationship with RedFlag.
    """
    red_flag = models.OneToOneField(
        RedFlag,
        on_delete=models.CASCADE,
        related_name='root_cause'
    )
    why1 = models.TextField(blank=True, default='')
    why2 = models.TextField(blank=True, default='')
    why3 = models.TextField(blank=True, default='')
    why4 = models.TextField(blank=True, default='')
    root_cause = models.TextField()  # rootCause5Why
    permanent_action = models.TextField()  # systematicPermanentAction
    sop_updated = models.BooleanField(default=False)
    pfmea_updated = models.BooleanField(default=False)
    control_plan_updated = models.BooleanField(default=False)
    opl_issued = models.BooleanField(default=False)  # onePointLessonIssued
    submitted_by = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='+'
    )
    submitted_by_name = models.CharField(max_length=200)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Root Cause for {self.red_flag.red_flag_no}"


class SustenanceCheck(BaseModel):
    """
    30/60/90-Day Sustenance audit checks for a 3-month zero-recurrence verification cycle.
    """
    MONTH_CHOICES = [
        (1, 'Month 1'),
        (2, 'Month 2'),
        (3, 'Month 3'),
    ]
    TARGET_DAYS_CHOICES = [
        (30, '30 Days'),
        (60, '60 Days'),
        (90, '90 Days'),
    ]

    red_flag = models.ForeignKey(
        RedFlag,
        on_delete=models.CASCADE,
        related_name='sustenance_checks'
    )
    cycle_no = models.SmallIntegerField(default=1)
    month = models.SmallIntegerField(choices=MONTH_CHOICES)
    target_days = models.SmallIntegerField(choices=TARGET_DAYS_CHOICES)
    scheduled_date = models.DateField()
    audit_date = models.DateField(null=True, blank=True)
    auditor = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )
    auditor_name = models.CharField(max_length=200, blank=True, default='')
    status = models.CharField(
        max_length=30,
        choices=CheckStatus.choices,
        default=CheckStatus.PENDING
    )
    observations = models.TextField(blank=True, default='')
    photo = models.ForeignKey(
        Attachment,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )

    class Meta:
        ordering = ['cycle_no', 'month']
        constraints = [
            models.UniqueConstraint(
                fields=['red_flag', 'cycle_no', 'month'],
                name='unique_cycle_month_check'
            )
        ]

    def __str__(self):
        return f"{self.red_flag.red_flag_no} - Cycle {self.cycle_no} Month {self.month} ({self.status})"


class RedFlagClosure(BaseModel):
    """
    Final Closure Record (1:1 with RedFlag).
    Requires Quality Custodian and Plant Head sign-offs.
    """
    red_flag = models.OneToOneField(
        RedFlag,
        on_delete=models.CASCADE,
        related_name='closure'
    )
    validation_trial_shifts = models.IntegerField(default=0)
    validation_trial_results = models.TextField(blank=True, default='')
    closure_date = models.DateField()
    closure_evidence = models.ForeignKey(
        Attachment,
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='+'
    )
    approved_by_qa = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='+'
    )
    approved_by_qa_name = models.CharField(max_length=200)
    approved_by_production = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='+'
    )
    approved_by_production_name = models.CharField(max_length=200)
    early_closure_reason = models.TextField(blank=True, default='')
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+'
    )
    closed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Closure for {self.red_flag.red_flag_no}"


# ===================== Phase 5: Cross-Module Escalations =====================

class EscalationLink(BaseModel):
    """
    Tracks cross-module escalations to PPSR (8D), Kaizen (Poka-Yoke), and 5S Red Tag.
    Exactly one link row per flag per module.
    """
    red_flag = models.ForeignKey(
        RedFlag,
        on_delete=models.CASCADE,
        related_name='escalation_links'
    )
    target_module = models.CharField(
        max_length=30,
        choices=EscalationModule.choices
    )
    target_ref_id = models.CharField(max_length=100)
    target_no = models.CharField(max_length=100)
    state = models.CharField(
        max_length=30,
        choices=EscalationState.choices,
        default=EscalationState.LINKED
    )
    payload = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )

    class Meta:
        unique_together = ('red_flag', 'target_module')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.red_flag.red_flag_no} -> {self.target_module} ({self.target_no})"
