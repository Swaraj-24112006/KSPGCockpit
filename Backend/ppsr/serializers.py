"""
PPSR Serializers — DRF Serializers for PPSR Reports, Meetings, & CFT Ratings
=============================================================================
Serializers for validation, nested writes, spreadsheet metrics calculation,
and JSON data transformation across all PPSR entities.
"""

from rest_framework import serializers
from .models import (
    PpsrReport,
    ContainmentAction,
    CorrectiveAction,
    StandardizationItem,
    ReadAcrossItem,
    FiveWhysChain,
    PpsrMeetingLog,
    CommitteeFeedback,
    CftMember,
    CftRating,
)
from .services import generate_ppsr_number, calculate_spreadsheet_metrics


# ============================================================================
# Task 3.1 — Child Action Serializers
# ============================================================================

class ContainmentActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContainmentAction
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True}
        }


class CorrectiveActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectiveAction
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True}
        }


class StandardizationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StandardizationItem
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True}
        }


class ReadAcrossItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadAcrossItem
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True}
        }


class FiveWhysChainSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiveWhysChain
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True}
        }


# ============================================================================
# Task 3.2 — Lightweight List Serializer
# ============================================================================

class PpsrReportListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for Register spreadsheet list view and Review Board table.
    Returns only table display columns — omits heavy nested JSON blobs.
    """
    root_cause_analysis = serializers.SerializerMethodField()

    class Meta:
        model = PpsrReport
        fields = [
            'id',
            'ppsr_no',
            'title',
            'plant',
            'line_station',
            'lead_owner',
            'discovered_by',
            'discovered_on',
            'status',
            'committee_decision',
            'root_cause_analysis',
            'cost_save_per_month',
            'cost_save_per_annum',
            'std_status_mf',
            'week',
            'jira_number',
            'created_at',
        ]
        read_only_fields = fields

    def get_root_cause_analysis(self, obj: PpsrReport) -> str:
        """
        Extract and truncate root cause summary (max 200 chars).
        Checks 5-whys chain, standard worksheet findings, or problem statement.
        """
        summary = ""
        if hasattr(obj, 'five_whys') and obj.five_whys:
            whys = []
            for col in [obj.five_whys.column1, obj.five_whys.column2, obj.five_whys.column3]:
                if isinstance(col, list) and col:
                    whys.extend([str(item) for item in col if item])
            if whys:
                summary = " -> ".join(whys)

        if not summary and obj.standard_worksheet and isinstance(obj.standard_worksheet, list):
            causes = [
                row.get('root_cause', '') or row.get('cause', '')
                for row in obj.standard_worksheet
                if isinstance(row, dict)
            ]
            causes = [c for c in causes if c]
            if causes:
                summary = ", ".join(causes)

        if not summary:
            summary = obj.problem_statement or ""

        return summary[:200]


# ============================================================================
# Task 3.3 — Full Detail Serializer (with nested writes)
# ============================================================================

class PpsrReportDetailSerializer(serializers.ModelSerializer):
    """
    Complete detail serializer for form submission, sheet inspection,
    and presentation mode with full nested child serializers and write handling.
    """
    containment_actions = ContainmentActionSerializer(many=True, required=False)
    corrective_actions = CorrectiveActionSerializer(many=True, required=False)
    standardization_items = StandardizationItemSerializer(many=True, required=False)
    read_across_items = ReadAcrossItemSerializer(many=True, required=False)
    five_whys = FiveWhysChainSerializer(required=False, allow_null=True)

    class Meta:
        model = PpsrReport
        fields = '__all__'
        read_only_fields = ['id', 'ppsr_no', 'created_at', 'updated_at']

    def create(self, validated_data):
        containment_data = validated_data.pop('containment_actions', [])
        corrective_data = validated_data.pop('corrective_actions', [])
        standardization_data = validated_data.pop('standardization_items', [])
        read_across_data = validated_data.pop('read_across_items', [])
        five_whys_data = validated_data.pop('five_whys', None)

        if 'ppsr_no' not in validated_data or not validated_data['ppsr_no']:
            validated_data['ppsr_no'] = generate_ppsr_number()

        report = PpsrReport.objects.create(**validated_data)

        for item in containment_data:
            item.pop('report', None)
            ContainmentAction.objects.create(report=report, **item)

        for item in corrective_data:
            item.pop('report', None)
            CorrectiveAction.objects.create(report=report, **item)

        for item in standardization_data:
            item.pop('report', None)
            StandardizationItem.objects.create(report=report, **item)

        for item in read_across_data:
            item.pop('report', None)
            ReadAcrossItem.objects.create(report=report, **item)

        if five_whys_data is not None:
            five_whys_data.pop('report', None)
            FiveWhysChain.objects.create(report=report, **five_whys_data)

        return report

    def update(self, instance, validated_data):
        containment_data = validated_data.pop('containment_actions', None)
        corrective_data = validated_data.pop('corrective_actions', None)
        standardization_data = validated_data.pop('standardization_items', None)
        read_across_data = validated_data.pop('read_across_items', None)
        five_whys_data = validated_data.pop('five_whys', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if containment_data is not None:
            instance.containment_actions.all().delete()
            for item in containment_data:
                item.pop('report', None)
                ContainmentAction.objects.create(report=instance, **item)

        if corrective_data is not None:
            instance.corrective_actions.all().delete()
            for item in corrective_data:
                item.pop('report', None)
                CorrectiveAction.objects.create(report=instance, **item)

        if standardization_data is not None:
            instance.standardization_items.all().delete()
            for item in standardization_data:
                item.pop('report', None)
                StandardizationItem.objects.create(report=instance, **item)

        if read_across_data is not None:
            instance.read_across_items.all().delete()
            for item in read_across_data:
                item.pop('report', None)
                ReadAcrossItem.objects.create(report=instance, **item)

        if five_whys_data is not None:
            five_whys_data.pop('report', None)
            FiveWhysChain.objects.update_or_create(report=instance, defaults=five_whys_data)

        return instance


# ============================================================================
# Task 3.4 — Metrics Calculator Serializer
# ============================================================================

class PpsrMetricsSerializer(serializers.ModelSerializer):
    """
    Serializer for the spreadsheet metrics update endpoint.
    Accepts raw production inputs and triggers MetricsCalculatorService in validate()
    to compute derived percentages, volumes, and cost savings before saving.
    """
    class Meta:
        model = PpsrReport
        fields = [
            'prod_qty_before',
            'rejected_qty_before',
            'prod_qty_after',
            'rejected_qty_after',
            'cust_demand_qty_month',
            'per_set_rejection_cost',
            'jira_number',
            'week',
            'coach',
            'cft',
            'std_status_mf',
            'std_date',
            'responsibility',
            'ppsr_end_date',
            'effectivity_text',
            'remarks',
            # Computed read-only outputs
            'pct_before',
            'pct_after',
            'cust_demand_qty_annum',
            'qty_month_before_rej_pct',
            'qty_month_after_rej_pct',
            'qty_month_saved_rej_pct',
            'cost_save_per_month',
            'cost_save_per_annum',
            'eff_days_std',
            'eff_days_close_ppsr',
        ]
        read_only_fields = [
            'pct_before',
            'pct_after',
            'cust_demand_qty_annum',
            'qty_month_before_rej_pct',
            'qty_month_after_rej_pct',
            'qty_month_saved_rej_pct',
            'cost_save_per_month',
            'cost_save_per_annum',
            'eff_days_std',
            'eff_days_close_ppsr',
        ]

    def validate(self, attrs):
        prod_qty_before = attrs.get('prod_qty_before', getattr(self.instance, 'prod_qty_before', None))
        rejected_qty_before = attrs.get('rejected_qty_before', getattr(self.instance, 'rejected_qty_before', None))
        prod_qty_after = attrs.get('prod_qty_after', getattr(self.instance, 'prod_qty_after', None))
        rejected_qty_after = attrs.get('rejected_qty_after', getattr(self.instance, 'rejected_qty_after', None))
        cust_demand_qty_month = attrs.get('cust_demand_qty_month', getattr(self.instance, 'cust_demand_qty_month', None))
        per_set_rejection_cost = attrs.get('per_set_rejection_cost', getattr(self.instance, 'per_set_rejection_cost', None))
        std_date = attrs.get('std_date', getattr(self.instance, 'std_date', None))
        ppsr_end_date = attrs.get('ppsr_end_date', getattr(self.instance, 'ppsr_end_date', None))
        created_at = getattr(self.instance, 'created_at', None)

        computed = calculate_spreadsheet_metrics(
            prod_qty_before=prod_qty_before,
            rejected_qty_before=rejected_qty_before,
            prod_qty_after=prod_qty_after,
            rejected_qty_after=rejected_qty_after,
            cust_demand_qty_month=cust_demand_qty_month,
            per_set_rejection_cost=per_set_rejection_cost,
            created_at=created_at,
            std_date=std_date,
            ppsr_end_date=ppsr_end_date,
        )
        attrs.update(computed)
        return attrs


# ============================================================================
# Task 3.5 — Meeting Log Serializer
# ============================================================================

class PpsrMeetingLogSerializer(serializers.ModelSerializer):
    """
    Serializer for Steering Committee review meeting logs.
    Exposes discussed_ppsr_ids as PrimaryKeyRelatedField array of report UUIDs,
    and discussed_ppsrs with nested summary (ppsr_no + title) for list/detail views.
    """
    discussed_ppsr_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=PpsrReport.objects.all(),
        required=False
    )
    discussed_ppsrs = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PpsrMeetingLog
        fields = [
            'id',
            'meeting_date',
            'chairperson',
            'attendees',
            'key_discussion_points',
            'discussed_ppsr_ids',
            'discussed_ppsrs',
            'next_review_date',
            'created_at',
        ]
        read_only_fields = ['id', 'discussed_ppsrs', 'created_at']

    def get_discussed_ppsrs(self, obj: PpsrMeetingLog) -> list:
        return [
            {
                'id': str(report.id),
                'ppsr_no': report.ppsr_no,
                'title': report.title,
                'lead_owner': report.lead_owner or '',
                'plant': report.plant or '',
                'status': report.status or '',
            }
            for report in obj.discussed_ppsr_ids.all()
        ]


# ============================================================================
# Task 3.6 — Committee Feedback Serializer
# ============================================================================

class CommitteeFeedbackSerializer(serializers.ModelSerializer):
    """
    Serializer for per-step presentation feedback.
    Validates step_number to be between 1 and 8 (8D steps).
    """
    class Meta:
        model = CommitteeFeedback
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True}
        }

    def validate_step_number(self, value: int) -> int:
        if value < 1 or value > 8:
            raise serializers.ValidationError("step_number must be between 1 and 8 inclusive.")
        return value


# ============================================================================
# Task 3.7 — CFT Member & Rating Serializers
# ============================================================================

class CftMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = CftMember
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class CftRatingSerializer(serializers.ModelSerializer):
    """
    Serializer for CFT member star ratings.
    Supports member_id and report_id for creation/update while exposing
    member_name and report_ppsr_no for read views.
    """
    member_id = serializers.PrimaryKeyRelatedField(
        queryset=CftMember.objects.all(),
        source='member',
        write_only=True
    )
    report_id = serializers.PrimaryKeyRelatedField(
        queryset=PpsrReport.objects.all(),
        source='report',
        write_only=True
    )
    member_name = serializers.CharField(source='member.name', read_only=True)
    report_ppsr_no = serializers.CharField(source='report.ppsr_no', read_only=True)

    class Meta:
        model = CftRating
        fields = [
            'id',
            'member',
            'report',
            'member_id',
            'report_id',
            'member_name',
            'report_ppsr_no',
            'score',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'member', 'report', 'created_at', 'updated_at']


# ============================================================================
# Task 3.8 — Award Leaderboard Serializer
# ============================================================================

class AwardLeaderboardSerializer(serializers.Serializer):
    """
    Read-only output serializer for CFT monthly award leaderboard rankings.
    """
    report_id = serializers.CharField()
    ppsr_no = serializers.CharField()
    title = serializers.CharField()
    lead_owner = serializers.CharField(required=False, allow_blank=True, default='')
    plant = serializers.CharField(required=False, allow_blank=True, default='')
    status = serializers.CharField(required=False, allow_blank=True, default='')
    total_score = serializers.IntegerField()
    votes_count = serializers.IntegerField()
    category = serializers.CharField()
