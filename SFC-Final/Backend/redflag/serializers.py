from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from django.utils import timezone
from .enums import ContainmentStatus
from .models import (
    Department, Plant, Line, Station, ProductModel, Employee, RedFlagConfig,
    Attachment, RedFlag, StageHistory, RedFlagAuditLog,
    RedFlagContainment, RedFlagRootCause, SustenanceCheck, RedFlagClosure,
    EscalationLink
)

# ===================== Phase 1: Lookups Serializers =====================

class StationLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = ['id', 'name']

class LineLookupSerializer(serializers.ModelSerializer):
    stations = StationLookupSerializer(many=True, read_only=True)

    class Meta:
        model = Line
        fields = ['id', 'name', 'stations']

class PlantLookupSerializer(serializers.ModelSerializer):
    lines = LineLookupSerializer(many=True, read_only=True)
    default_qa_custodian_id = serializers.UUIDField(source='default_qa_custodian.id', read_only=True, allow_null=True)
    default_qa_custodian_label = serializers.CharField(source='default_qa_custodian.label', read_only=True, allow_null=True)
    plant_head_id = serializers.UUIDField(source='plant_head.id', read_only=True, allow_null=True)
    plant_head_label = serializers.CharField(source='plant_head.label', read_only=True, allow_null=True)

    class Meta:
        model = Plant
        fields = [
            'id', 'code', 'name', 'description', 'default_quarantine_location',
            'default_qa_custodian_id', 'default_qa_custodian_label',
            'plant_head_id', 'plant_head_label',
            'lines'
        ]

class DepartmentLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'code', 'name', 'can_originate', 'can_be_target', 'sort_order']

class ProductModelLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductModel
        fields = ['id', 'name']

class EmployeeLookupSerializer(serializers.ModelSerializer):
    department = serializers.CharField(source='department.name', read_only=True)
    label = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'label', 'department']

class RedFlagConfigLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = RedFlagConfig
        fields = [
            'containment_sla_minutes',
            'gap_bucket_minutes',
            'sustenance_check_days',
            'sustenance_audit_grace_days',
            'enforce_sustenance_schedule',
            'default_target_days',
            'ppsr_default_days',
            'red_tag_disposal_days',
            'form_number',
            'form_revision',
            'standard_reference',
            'max_photo_mb',
            'governance_rules',
        ]

class UserMeSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    employee_id = serializers.UUIDField(allow_null=True)
    label = serializers.CharField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    roles = serializers.ListField(child=serializers.CharField())
    is_plant_head = serializers.BooleanField()
    is_quality_custodian = serializers.BooleanField()

class EnumChoiceSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()

class LookupsEnumsSerializer(serializers.Serializer):
    red_flag_type = EnumChoiceSerializer(many=True)
    severity = EnumChoiceSerializer(many=True)
    category_5m = EnumChoiceSerializer(many=True)
    status = EnumChoiceSerializer(many=True)
    containment_status = EnumChoiceSerializer(many=True)
    qa_custodian_status = EnumChoiceSerializer(many=True)
    repetitive = EnumChoiceSerializer(many=True)
    check_status = EnumChoiceSerializer(many=True)
    escalation_module = EnumChoiceSerializer(many=True)

class LookupsResponseSerializer(serializers.Serializer):
    plants = PlantLookupSerializer(many=True)
    models = ProductModelLookupSerializer(many=True)
    departments = DepartmentLookupSerializer(many=True)
    employees = EmployeeLookupSerializer(many=True)
    enums = LookupsEnumsSerializer()
    config = RedFlagConfigLookupSerializer()


# ===================== Phase 2, 3 & 4 Serializers =====================

class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ['id', 'url', 'kind', 'original_name', 'size_bytes', 'content_type', 'uploaded_at']

    @extend_schema_field(serializers.CharField())
    def get_url(self, obj):
        try:
            from .storage import presign
            return presign(obj)
        except Exception:
            return ""

class StageHistorySerializer(serializers.ModelSerializer):
    completed_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S%z")
    completed_by = serializers.CharField(source='completed_by_name')
    sign_off_role = serializers.CharField()

    class Meta:
        model = StageHistory
        fields = ['stage', 'completed_at', 'completed_by', 'sign_off_role', 'notes']


class MonthSustenanceCheckSerializer(serializers.Serializer):
    month = serializers.IntegerField()
    target_days = serializers.IntegerField()
    scheduled_date = serializers.CharField()
    audit_date = serializers.CharField(allow_null=True)
    auditor = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    observations = serializers.CharField(allow_null=True)
    photo_evidence = serializers.CharField(allow_null=True)
    is_overdue = serializers.BooleanField()
    days_to_due = serializers.IntegerField()


class RedFlagReadSerializer(serializers.ModelSerializer):
    sr_no = serializers.SerializerMethodField()
    raised_date = serializers.SerializerMethodField()
    raised_timestamp = serializers.SerializerMethodField()
    raised_by = serializers.CharField(source='raised_by_name')
    raised_by_department = serializers.CharField(source='raised_by_department_name')
    mf_name = serializers.CharField(source='plant_name')
    line_area_name = serializers.CharField(source='line_name')
    station_name = serializers.CharField()
    model_name = serializers.CharField()
    red_flag_description = serializers.CharField(source='description')
    evidence_photo = serializers.SerializerMethodField()
    countermeasure_photo = serializers.SerializerMethodField()
    responsible_department = serializers.CharField(source='target_department_name')
    target_department = serializers.CharField(source='target_department_name')
    target_person = serializers.CharField(source='target_person_name')
    closure_responsibility = serializers.SerializerMethodField()
    qa_custodian = serializers.CharField(source='qa_custodian_name')
    containment_status = serializers.SerializerMethodField()
    containment_timestamp = serializers.SerializerMethodField()
    containment_time_gap = serializers.SerializerMethodField()
    containment_gap_minutes = serializers.SerializerMethodField()
    containment_within_sla = serializers.SerializerMethodField()
    suspect_qty_quarantined = serializers.SerializerMethodField()
    quarantine_tag_no = serializers.SerializerMethodField()
    quarantine_location = serializers.SerializerMethodField()
    sorting_qty_inspected = serializers.SerializerMethodField()
    sorting_qty_ok = serializers.SerializerMethodField()
    sorting_qty_rejected = serializers.SerializerMethodField()
    containment_action = serializers.SerializerMethodField()
    immediate_action_taken = serializers.SerializerMethodField()
    containment_verified_by = serializers.SerializerMethodField()
    containment_verified_date = serializers.SerializerMethodField()
    action_taken_by = serializers.SerializerMethodField()
    action_taken_date = serializers.SerializerMethodField()

    # Stage 3 Root Cause fields
    why1 = serializers.SerializerMethodField()
    why2 = serializers.SerializerMethodField()
    why3 = serializers.SerializerMethodField()
    why4 = serializers.SerializerMethodField()
    root_cause_5_why = serializers.SerializerMethodField()
    systematic_permanent_action = serializers.SerializerMethodField()
    standardization_updates = serializers.SerializerMethodField()

    # Stage 5 Sustenance fields
    sustenance_start_date = serializers.SerializerMethodField()
    month1_check = serializers.SerializerMethodField()
    month2_check = serializers.SerializerMethodField()
    month3_check = serializers.SerializerMethodField()

    # Stage 6 Closure fields
    closure_date = serializers.SerializerMethodField()
    closure_evidence = serializers.SerializerMethodField()
    validation_trial_shifts = serializers.SerializerMethodField()
    validation_trial_results = serializers.SerializerMethodField()
    approved_by_q_a = serializers.SerializerMethodField()
    approved_by_production = serializers.SerializerMethodField()

    # Phase 5 Escalation fields
    linked_ppsr_id = serializers.SerializerMethodField()
    linked_ppsr_no = serializers.SerializerMethodField()
    linked_kaizen_id = serializers.SerializerMethodField()
    linked_kaizen_no = serializers.SerializerMethodField()
    linked_five_s_red_tag_id = serializers.SerializerMethodField()
    linked_five_s_red_tag_no = serializers.SerializerMethodField()

    stage_history = StageHistorySerializer(many=True, read_only=True)
    allowed_actions = serializers.SerializerMethodField()
    target_date = serializers.DateField(format="%Y-%m-%d")

    # Foreign Key IDs
    plant_id = serializers.UUIDField(source='plant.id', read_only=True)
    line_id = serializers.UUIDField(source='line.id', read_only=True)
    station_id = serializers.UUIDField(source='station.id', read_only=True)
    model_id = serializers.UUIDField(source='model.id', read_only=True)
    target_department_id = serializers.UUIDField(source='target_department.id', read_only=True)
    target_person_id = serializers.UUIDField(source='target_person.id', read_only=True)
    qa_custodian_id = serializers.UUIDField(source='qa_custodian.id', read_only=True)

    class Meta:
        model = RedFlag
        fields = [
            'id', 'sr_no', 'red_flag_no', 'status', 'row_version',
            'raised_date', 'raised_timestamp',
            'raised_by', 'raised_by_department', 'raised_by_role',
            'mf_name', 'line_area_name', 'station_name', 'model_name',
            'red_flag_type', 'red_flag_sub_type', 'severity', 'category_5m',
            'repetitive_occurrence', 'responsible_department', 'target_department',
            'target_person', 'team_leader', 'red_flag_description',
            'evidence_photo', 'countermeasure_photo',
            'qa_custodian', 'qa_custodian_status', 'qa_custodian_notes',
            'closure_responsibility',
            # Stage 2 fields
            'containment_timestamp', 'containment_time_gap', 'containment_gap_minutes',
            'containment_within_sla', 'containment_status', 'suspect_qty_quarantined',
            'quarantine_tag_no', 'quarantine_location', 'sorting_qty_inspected',
            'sorting_qty_ok', 'sorting_qty_rejected', 'containment_action',
            'immediate_action_taken', 'containment_verified_by', 'containment_verified_date',
            'action_taken_by', 'action_taken_date',
            # Stage 3 fields
            'why1', 'why2', 'why3', 'why4', 'root_cause_5_why',
            'systematic_permanent_action', 'standardization_updates',
            # Stage 4/5 Sustenance fields
            'target_date', 'sustenance_start_date', 'sustenance_cycle',
            'sustenance_achieved', 'month1_check', 'month2_check', 'month3_check',
            # Stage 6 Closure fields
            'closure_date', 'closure_evidence', 'validation_trial_shifts',
            'validation_trial_results', 'approved_by_q_a', 'approved_by_production',
            'closed_early',
            # Phase 5 Escalations
            'linked_ppsr_id', 'linked_ppsr_no',
            'linked_kaizen_id', 'linked_kaizen_no',
            'linked_five_s_red_tag_id', 'linked_five_s_red_tag_no',
            # Meta
            'stage_history', 'allowed_actions', 'created_at',
            'plant_id', 'line_id', 'station_id', 'model_id',
            'target_department_id', 'target_person_id', 'qa_custodian_id',
        ]

    def _get_current_containment(self, obj):
        if not hasattr(obj, '_cached_current_containment'):
            if hasattr(obj, '_prefetched_objects_cache') and 'containment_attempts' in obj._prefetched_objects_cache:
                current = [a for a in obj.containment_attempts.all() if a.is_current]
                obj._cached_current_containment = current[0] if current else None
            elif hasattr(obj, 'containment_attempts'):
                obj._cached_current_containment = obj.containment_attempts.filter(is_current=True).first()
            else:
                obj._cached_current_containment = None
        return obj._cached_current_containment

    def _get_root_cause(self, obj):
        return getattr(obj, 'root_cause', None)

    def _get_closure(self, obj):
        return getattr(obj, 'closure', None)

    def _get_checks(self, obj):
        if not hasattr(obj, '_cached_cycle_checks'):
            if hasattr(obj, '_prefetched_objects_cache') and 'sustenance_checks' in obj._prefetched_objects_cache:
                checks = [c for c in obj.sustenance_checks.all() if c.cycle_no == obj.sustenance_cycle]
                obj._cached_cycle_checks = {c.month: c for c in checks}
            elif hasattr(obj, 'sustenance_checks'):
                checks = obj.sustenance_checks.filter(cycle_no=obj.sustenance_cycle)
                obj._cached_cycle_checks = {c.month: c for c in checks}
            else:
                obj._cached_cycle_checks = {}
        return obj._cached_cycle_checks

    def _format_check(self, check):
        if not check:
            return None
        from .storage import presign
        photo_url = None
        if check.photo:
            try:
                photo_url = presign(check.photo)
            except Exception:
                photo_url = None

        today = timezone.localdate()
        days_to_due = (check.scheduled_date - today).days
        is_overdue = check.status == 'Pending' and check.scheduled_date < today

        return {
            'month': check.month,
            'targetDays': check.target_days,
            'scheduledDate': check.scheduled_date.strftime('%Y-%m-%d'),
            'auditDate': check.audit_date.strftime('%Y-%m-%d') if check.audit_date else None,
            'auditor': check.auditor_name or None,
            'status': check.status,
            'observations': check.observations or None,
            'photoEvidence': photo_url,
            'isOverdue': is_overdue,
            'daysToDue': days_to_due,
        }

    @extend_schema_field(serializers.CharField())
    def get_sr_no(self, obj):
        return str(obj.sr_no)

    @extend_schema_field(serializers.CharField())
    def get_raised_date(self, obj):
        return obj.raised_at.strftime('%Y-%m-%d') if obj.raised_at else ''

    @extend_schema_field(serializers.CharField())
    def get_raised_timestamp(self, obj):
        return obj.raised_at.strftime('%Y-%m-%d %H:%M') if obj.raised_at else ''

    @extend_schema_field(serializers.CharField())
    def get_evidence_photo(self, obj):
        if obj.evidence_photo:
            try:
                from .storage import presign
                return presign(obj.evidence_photo)
            except Exception:
                return ""
        return ""

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_countermeasure_photo(self, obj):
        attempt = self._get_current_containment(obj)
        if attempt and attempt.photo:
            try:
                from .storage import presign
                return presign(attempt.photo)
            except Exception:
                return None
        return None

    @extend_schema_field(serializers.CharField())
    def get_closure_responsibility(self, obj):
        if obj.closure_responsibility:
            return obj.closure_responsibility.label
        return obj.qa_custodian_name

    @extend_schema_field(serializers.CharField())
    def get_containment_status(self, obj):
        attempt = self._get_current_containment(obj)
        if attempt:
            if attempt.status == ContainmentStatus.REJECTED:
                return 'Pending'
            return attempt.status
        return 'Pending'

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_containment_timestamp(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.contained_at.strftime('%Y-%m-%d %H:%M') if attempt else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_containment_time_gap(self, obj):
        attempt = self._get_current_containment(obj)
        if attempt:
            from .services.submit_containment import format_gap_label
            return format_gap_label(attempt.gap_minutes)
        return None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_containment_gap_minutes(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.gap_minutes if attempt else None

    @extend_schema_field(serializers.BooleanField(allow_null=True))
    def get_containment_within_sla(self, obj):
        attempt = self._get_current_containment(obj)
        if attempt:
            config = RedFlagConfig.get_config()
            return attempt.gap_minutes <= config.containment_sla_minutes
        return None

    @extend_schema_field(serializers.IntegerField())
    def get_suspect_qty_quarantined(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.suspect_qty if attempt else 0

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_quarantine_tag_no(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.quarantine_tag_no if attempt else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_quarantine_location(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.quarantine_location if attempt else None

    @extend_schema_field(serializers.IntegerField())
    def get_sorting_qty_inspected(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.sorting_inspected if attempt else 0

    @extend_schema_field(serializers.IntegerField())
    def get_sorting_qty_ok(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.sorting_ok if attempt else 0

    @extend_schema_field(serializers.IntegerField())
    def get_sorting_qty_rejected(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.sorting_rejected if attempt else 0

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_containment_action(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.action_text if attempt else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_immediate_action_taken(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.action_text if attempt else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_containment_verified_by(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.verified_by_name if attempt and attempt.verified_by_name else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_containment_verified_date(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.verified_at.strftime('%Y-%m-%d') if attempt and attempt.verified_at else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_action_taken_by(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.action_taken_by_name if attempt else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_action_taken_date(self, obj):
        attempt = self._get_current_containment(obj)
        return attempt.contained_at.strftime('%Y-%m-%d') if attempt else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_why1(self, obj):
        rc = self._get_root_cause(obj)
        return rc.why1 if rc else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_why2(self, obj):
        rc = self._get_root_cause(obj)
        return rc.why2 if rc else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_why3(self, obj):
        rc = self._get_root_cause(obj)
        return rc.why3 if rc else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_why4(self, obj):
        rc = self._get_root_cause(obj)
        return rc.why4 if rc else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_root_cause_5_why(self, obj):
        rc = self._get_root_cause(obj)
        return rc.root_cause if rc else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_systematic_permanent_action(self, obj):
        rc = self._get_root_cause(obj)
        return rc.permanent_action if rc else None

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_standardization_updates(self, obj):
        rc = self._get_root_cause(obj)
        if not rc:
            return None
        return {
            'sopUpdated': rc.sop_updated,
            'pfmeaUpdated': rc.pfmea_updated,
            'controlPlanUpdated': rc.control_plan_updated,
            'onePointLessonIssued': rc.opl_issued,
        }

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_sustenance_start_date(self, obj):
        return obj.sustenance_start_date.strftime('%Y-%m-%d') if obj.sustenance_start_date else None

    @extend_schema_field(MonthSustenanceCheckSerializer(allow_null=True))
    def get_month1_check(self, obj):
        checks = self._get_checks(obj)
        return self._format_check(checks.get(1))

    @extend_schema_field(MonthSustenanceCheckSerializer(allow_null=True))
    def get_month2_check(self, obj):
        checks = self._get_checks(obj)
        return self._format_check(checks.get(2))

    @extend_schema_field(MonthSustenanceCheckSerializer(allow_null=True))
    def get_month3_check(self, obj):
        checks = self._get_checks(obj)
        return self._format_check(checks.get(3))

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_closure_date(self, obj):
        cl = self._get_closure(obj)
        return cl.closure_date.strftime('%Y-%m-%d') if cl else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_closure_evidence(self, obj):
        cl = self._get_closure(obj)
        if cl and cl.closure_evidence:
            try:
                from .storage import presign
                return presign(cl.closure_evidence)
            except Exception:
                return None
        return None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_validation_trial_shifts(self, obj):
        cl = self._get_closure(obj)
        return cl.validation_trial_shifts if cl else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_validation_trial_results(self, obj):
        cl = self._get_closure(obj)
        return cl.validation_trial_results if cl else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_approved_by_q_a(self, obj):
        cl = self._get_closure(obj)
        return cl.approved_by_qa_name if cl else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_approved_by_production(self, obj):
        cl = self._get_closure(obj)
        return cl.approved_by_production_name if cl else None

    def _get_escalation_links(self, obj):
        if not hasattr(obj, '_cached_escalation_links'):
            if hasattr(obj, '_prefetched_objects_cache') and 'escalation_links' in obj._prefetched_objects_cache:
                links = obj.escalation_links.all()
            elif hasattr(obj, 'escalation_links'):
                links = obj.escalation_links.all()
            else:
                links = []
            obj._cached_escalation_links = {link.target_module: link for link in links}
        return obj._cached_escalation_links

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_linked_ppsr_id(self, obj):
        link = self._get_escalation_links(obj).get('PPSR')
        return link.target_ref_id if link else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_linked_ppsr_no(self, obj):
        link = self._get_escalation_links(obj).get('PPSR')
        return link.target_no if link else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_linked_kaizen_id(self, obj):
        link = self._get_escalation_links(obj).get('KAIZEN')
        return link.target_ref_id if link else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_linked_kaizen_no(self, obj):
        link = self._get_escalation_links(obj).get('KAIZEN')
        return link.target_no if link else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_linked_five_s_red_tag_id(self, obj):
        link = self._get_escalation_links(obj).get('FIVES_RED_TAG')
        return link.target_ref_id if link else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_linked_five_s_red_tag_no(self, obj):
        link = self._get_escalation_links(obj).get('FIVES_RED_TAG')
        return link.target_no if link else None

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_allowed_actions(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        from .permissions import allowed_actions
        return allowed_actions(user, obj)


# ===================== Input / Action Serializers =====================

class RedFlagPatchSerializer(serializers.Serializer):
    row_version = serializers.IntegerField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    target_department = serializers.UUIDField(required=False)
    target_person = serializers.UUIDField(required=False)
    team_leader = serializers.CharField(required=False, allow_blank=True)
    plant = serializers.UUIDField(required=False)
    line = serializers.UUIDField(required=False)
    station = serializers.UUIDField(required=False)
    model = serializers.UUIDField(required=False)
    red_flag_type = serializers.CharField(required=False)
    red_flag_sub_type = serializers.CharField(required=False, allow_blank=True)
    severity = serializers.CharField(required=False)
    category_5m = serializers.CharField(required=False)
    repetitive_occurrence = serializers.CharField(required=False)
    target_date = serializers.DateField(required=False)
    qa_custodian = serializers.UUIDField(required=False)
    qa_custodian_notes = serializers.CharField(required=False, allow_blank=True)

    # Identity fields (Plant Head only)
    raised_by = serializers.UUIDField(required=False)
    raised_by_department = serializers.UUIDField(required=False)
    raised_by_role = serializers.CharField(required=False, allow_blank=True)

class RedFlagDeleteSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=3)

class ContainmentSubmitSerializer(serializers.Serializer):
    contained_at = serializers.CharField(required=False)
    action_taken_by = serializers.UUIDField(required=False)
    suspect_qty_quarantined = serializers.IntegerField(required=False, default=0)
    quarantine_tag_no = serializers.CharField(required=False, allow_blank=True)
    quarantine_location = serializers.CharField(required=True)
    sorting_qty_inspected = serializers.IntegerField(required=False, default=0)
    sorting_qty_ok = serializers.IntegerField(required=False, default=0)
    sorting_qty_rejected = serializers.IntegerField(required=False, default=0)
    containment_action = serializers.CharField(required=True)
    countermeasure_photo_id = serializers.UUIDField(required=False)
    countermeasure_photo = serializers.CharField(required=False)

class ContainmentApproveSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)

class ContainmentRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True)

class RootCauseSubmitSerializer(serializers.Serializer):
    why1 = serializers.CharField(required=False, allow_blank=True)
    why_1 = serializers.CharField(required=False, allow_blank=True)
    why2 = serializers.CharField(required=False, allow_blank=True)
    why_2 = serializers.CharField(required=False, allow_blank=True)
    why3 = serializers.CharField(required=False, allow_blank=True)
    why_3 = serializers.CharField(required=False, allow_blank=True)
    why4 = serializers.CharField(required=False, allow_blank=True)
    why_4 = serializers.CharField(required=False, allow_blank=True)
    root_cause_5_why = serializers.CharField(required=True)
    systematic_permanent_action = serializers.CharField(required=True)
    standardization_updates = serializers.DictField(required=False)
    target_date = serializers.CharField(required=False)

class SustenanceStartSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
    standardization_updates = serializers.DictField(required=False)

class SustenanceCheckLogSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['Passed', 'Recurrence Detected'])
    observations = serializers.CharField(required=False, allow_blank=True)
    photo_attachment_id = serializers.UUIDField(required=False)
    audit_date = serializers.CharField(required=False)

class RedFlagCloseSerializer(serializers.Serializer):
    closure_evidence = serializers.UUIDField(required=True)
    validation_trial_shifts = serializers.IntegerField(required=False, default=0)
    validation_trial_results = serializers.CharField(required=False, allow_blank=True)
    approved_by_qa = serializers.UUIDField(required=False)
    approved_by_production = serializers.UUIDField(required=False)
    closure_date = serializers.CharField(required=False)
    early_closure_reason = serializers.CharField(required=False, allow_blank=True)

class SustenanceDueCheckSerializer(serializers.Serializer):
    check_id = serializers.UUIDField(source='id')
    red_flag_id = serializers.UUIDField(source='red_flag.id')
    red_flag_no = serializers.CharField(source='red_flag.red_flag_no')
    status = serializers.CharField(source='red_flag.status')
    cycle_no = serializers.IntegerField()
    month = serializers.IntegerField()
    target_days = serializers.IntegerField()
    scheduled_date = serializers.DateField(format="%Y-%m-%d")
    is_overdue = serializers.SerializerMethodField()
    days_to_due = serializers.SerializerMethodField()
    plant_name = serializers.CharField(source='red_flag.plant_name')
    qa_custodian_name = serializers.CharField(source='red_flag.qa_custodian_name')

    @extend_schema_field(serializers.BooleanField())
    def get_is_overdue(self, obj):
        return obj.scheduled_date < timezone.localdate()

    @extend_schema_field(serializers.IntegerField())
    def get_days_to_due(self, obj):
        return (obj.scheduled_date - timezone.localdate()).days


# ===================== Phase 5: Escalation Serializers =====================

class EscalationLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationLink
        fields = [
            'id', 'red_flag', 'target_module', 'target_ref_id',
            'target_no', 'state', 'payload', 'created_by', 'created_at'
        ]
        read_only_fields = fields


class PpsrEscalationResponseSerializer(serializers.Serializer):
    ppsr = serializers.DictField()
    link = EscalationLinkSerializer()


class KaizenEscalationResponseSerializer(serializers.Serializer):
    kaizen = serializers.DictField()
    link = EscalationLinkSerializer()


class FiveSEscalationResponseSerializer(serializers.Serializer):
    red_tag = serializers.DictField()
    link = EscalationLinkSerializer()


# ===================== Phase 6: Analytics & Presentation Serializers =====================

class DashboardAnalyticsResponseSerializer(serializers.Serializer):
    kpis = serializers.DictField()
    quarantine = serializers.DictField()
    time_gap = serializers.DictField()
    pareto_5m = serializers.ListField(child=serializers.DictField())
    defect_types = serializers.ListField(child=serializers.DictField())
    department_matrix = serializers.DictField()
    target_persons = serializers.ListField(child=serializers.DictField())
    station_hotspots = serializers.ListField(child=serializers.DictField())
    sustenance_cohort = serializers.DictField()
    drill_records = serializers.DictField()


class ExecutiveAnalyticsResponseSerializer(serializers.Serializer):
    scorecard = serializers.DictField()
    active_alerts = serializers.ListField(child=serializers.DictField())
    sustenance_table = serializers.ListField(child=serializers.DictField())
    breakdown_5m = serializers.ListField(child=serializers.DictField())
    accountability_flow = serializers.ListField(child=serializers.DictField())


class SummaryAnalyticsResponseSerializer(serializers.Serializer):
    by_status = serializers.DictField()
    open_count = serializers.IntegerField()
    unresolved_count = serializers.IntegerField()
    closed_count = serializers.IntegerField()
    sidebar_badge = serializers.IntegerField()
    drill_records = serializers.DictField()


class PresentationDataResponseSerializer(serializers.Serializer):
    flag = RedFlagReadSerializer()
    stages = serializers.ListField(child=serializers.DictField())
    queue = serializers.ListField(child=serializers.DictField())
    allowed_actions = serializers.ListField(child=serializers.CharField())


class ServiceStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    error = serializers.CharField(allow_null=True, required=False)


class HealthCheckResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    database = ServiceStatusSerializer()
    minio = ServiceStatusSerializer()
    timestamp = serializers.DateTimeField()



