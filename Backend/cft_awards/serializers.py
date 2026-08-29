"""
CFT Awards — Serializers
=========================
Serializers for CftMember, AwardCycle, AttendanceRecord, MonthlyAward.
"""

from rest_framework import serializers
from cft_awards.models import (
    CftMember,
    CFTMember,
    AwardCycle,
    AttendanceRecord,
    MonthlyAward,
    CFTEvaluationSession,
    CFTRating,
    CFTSessionMember,
    AwardCategory,
)
from kaizens.models import Kaizen




class CftMemberSerializer(serializers.ModelSerializer):
    """Full serializer for CftMember — used in list and detail views."""

    class Meta:
        model = CftMember
        fields = [
            'id',
            'user',
            'name',
            'employee_id',
            'role',
            'department',
            'mini_factory',
            'is_active',
            'joined_date',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CftMemberMinimalSerializer(serializers.ModelSerializer):
    """Compact serializer used as a nested reference inside other serializers."""

    class Meta:
        model = CftMember
        fields = ['id', 'name', 'role', 'department', 'mini_factory']


class AttendanceRecordSerializer(serializers.ModelSerializer):
    """Serializer for reading/writing a single attendance mark."""
    member_detail = CftMemberMinimalSerializer(source='member', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id',
            'cycle',
            'member',
            'member_detail',
            'is_present',
            'marked_at',
            'marked_by',
        ]
        read_only_fields = ['id', 'marked_at', 'marked_by']


class BulkAttendanceSerializer(serializers.Serializer):
    """
    Accepts a list of {member_id, is_present} pairs for bulk-updating
    attendance for a single cycle in one request.
    """
    class AttendanceEntry(serializers.Serializer):
        member_id = serializers.IntegerField()
        is_present = serializers.BooleanField()

    cycle_id = serializers.IntegerField()
    attendance = AttendanceEntry(many=True)


class MonthlyAwardSerializer(serializers.ModelSerializer):
    """Full serializer for MonthlyAward — read and write."""
    member_detail = CftMemberMinimalSerializer(source='member', read_only=True)
    award_label = serializers.ReadOnlyField()

    class Meta:
        model = MonthlyAward
        fields = [
            'id',
            'cycle',
            'member',
            'member_detail',
            'award_type',
            'custom_award_label',
            'award_label',
            'status',
            'citation',
            'linked_kaizen',
            'points',
            'nominated_by',
            'approved_by',
            'approved_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'award_label',
            'nominated_by',
            'approved_by',
            'approved_at',
            'created_at',
            'updated_at',
        ]


class AwardCycleSerializer(serializers.ModelSerializer):
    """Full serializer for AwardCycle, with nested attendance and awards."""
    awards = MonthlyAwardSerializer(many=True, read_only=True)
    attendance_records = AttendanceRecordSerializer(many=True, read_only=True)
    attendance_count = serializers.SerializerMethodField()
    total_members = serializers.SerializerMethodField()

    class Meta:
        model = AwardCycle
        fields = [
            'id',
            'title',
            'mini_factory',
            'month',
            'year',
            'session_date',
            'is_finalized',
            'notes',
            'awards',
            'attendance_records',
            'attendance_count',
            'total_members',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'awards',
            'attendance_records',
            'attendance_count',
            'total_members',
            'created_at',
            'updated_at',
        ]

    def get_attendance_count(self, obj):
        return obj.attendance_records.filter(is_present=True).count()

    def get_total_members(self, obj):
        return obj.attendance_records.count()


class AwardCycleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing cycles without nested data."""
    attendance_count = serializers.SerializerMethodField()
    awards_count = serializers.SerializerMethodField()

    class Meta:
        model = AwardCycle
        fields = [
            'id',
            'title',
            'mini_factory',
            'month',
            'year',
            'session_date',
            'is_finalized',
            'attendance_count',
            'awards_count',
            'created_at',
        ]

    def get_attendance_count(self, obj):
        return obj.attendance_records.filter(is_present=True).count()

    def get_awards_count(self, obj):
        return obj.awards.count()


# ─── CFTEvaluationSession Serializers ─────────────────────────────────────────

class CFTSessionMemberSerializer(serializers.ModelSerializer):
    """Serializer for individual attendance records within a session."""
    member_id = serializers.IntegerField(source='member.id', read_only=True)
    name = serializers.CharField(source='member.name', read_only=True)
    role = serializers.CharField(source='member.role', read_only=True)
    department = serializers.CharField(source='member.department', read_only=True)
    marked_by_username = serializers.ReadOnlyField(source='marked_by.username')

    class Meta:
        model = CFTSessionMember
        fields = [
            'id',
            'session',
            'member',
            'member_id',
            'name',
            'role',
            'department',
            'present',
            'marked_at',
            'marked_by',
            'marked_by_username',
        ]
        read_only_fields = ['id', 'marked_at', 'marked_by']


class CFTRatingSerializer(serializers.ModelSerializer):
    """Serializer for individual CFT member ratings on Kaizens."""
    class Meta:
        model = CFTRating
        fields = ['id', 'session', 'member', 'kaizen', 'stars', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CFTEvaluationSessionSerializer(serializers.ModelSerializer):
    """
    Full serializer for CFTEvaluationSession.
    Provides session metadata along with roster members, present attendance IDs,
    category overrides, and star ratings.
    """
    opened_by_username = serializers.ReadOnlyField(source='opened_by.username')
    members = serializers.SerializerMethodField()
    presentIds = serializers.SerializerMethodField()
    categoryOverrides = serializers.SerializerMethodField()
    allRatings = serializers.SerializerMethodField()
    attendance = CFTSessionMemberSerializer(source='session_members', many=True, read_only=True)

    class Meta:
        model = CFTEvaluationSession
        fields = [
            'id',
            'month',
            'year',
            'opened_by',
            'opened_by_username',
            'opened_at',
            'updated_at',
            'status',
            'category_overrides',
            'present_member_ids',
            'members',
            'presentIds',
            'categoryOverrides',
            'allRatings',
            'attendance',
        ]
        read_only_fields = [
            'id',
            'opened_at',
            'updated_at',
            'members',
            'presentIds',
            'categoryOverrides',
            'allRatings',
            'attendance',
        ]

    def get_members(self, obj):
        members = CftMember.objects.filter(is_active=True).order_by('department', 'name')
        return CftMemberSerializer(members, many=True).data

    def get_presentIds(self, obj):
        # 1. From CFTSessionMember records if any exist
        session_members = obj.session_members.all()
        if session_members.exists():
            return list(session_members.filter(present=True).values_list('member_id', flat=True))
        # 2. From present_member_ids JSON field if populated
        if obj.present_member_ids and len(obj.present_member_ids) > 0:
            return obj.present_member_ids
        # 3. Default all active members
        return list(CftMember.objects.filter(is_active=True).values_list('id', flat=True))

    def get_categoryOverrides(self, obj):
        return obj.category_overrides or {}

    def get_allRatings(self, obj):
        ratings = obj.ratings.all()
        return [
            {'member': r.member_id, 'kaizen': r.kaizen_id, 'stars': r.stars}
            for r in ratings
        ]


class GetOrCreateSessionRequestSerializer(serializers.Serializer):
    """Validates the input payload for get-or-create session endpoint."""
    month = serializers.CharField(max_length=20)
    year = serializers.IntegerField()
    openedByName = serializers.CharField(max_length=150, required=False, allow_blank=True)


class UpdateAttendanceRequestSerializer(serializers.Serializer):
    """Validates attendance updates for a session. Enforces at least 1 member present."""
    present_member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=False,
    )


# Explicit naming compatibility
CFTMemberSerializer = CftMemberSerializer


class AwardCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for configurable AwardCategory model.
    Includes both snake_case and camelCase aliases for seamless frontend compatibility.
    """
    key = serializers.CharField(source='code')
    title = serializers.CharField(source='name')
    winnerCount = serializers.IntegerField(source='winner_count')
    badgeBg = serializers.CharField(source='badge_bg')

    class Meta:
        model = AwardCategory
        fields = [
            'id',
            'code',
            'key',
            'name',
            'title',
            'subtitle',
            'winner_count',
            'winnerCount',
            'badge_bg',
            'badgeBg',
            'is_active',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EligibleKaizenSerializer(serializers.ModelSerializer):
    """
    Serializes eligible Kaizens for a monthly CFT evaluation session.
    Enriches with resolved category (accounting for session overrides)
    and star rating scores.
    """
    benefits = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    is_category_overridden = serializers.SerializerMethodField()
    total_score = serializers.SerializerMethodField()
    votes_count = serializers.SerializerMethodField()
    average_score = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    minifactory = serializers.CharField(source='mini_factory', read_only=True)
    ideaBy = serializers.CharField(source='idea_by', read_only=True)
    costSave = serializers.DecimalField(source='cost_save', max_digits=15, decimal_places=2, read_only=True)
    srNo = serializers.CharField(source='sr_no', read_only=True)

    class Meta:
        model = Kaizen
        fields = [
            'id',
            'sr_no',
            'srNo',
            'month',
            'suggestion_date',
            'title',
            'area',
            'mini_factory',
            'minifactory',
            'location',
            'machine',
            'cost_save',
            'costSave',
            'idea_by',
            'ideaBy',
            'implemented_by',
            'status',
            'classification',
            'problem_before',
            'counter_measure_after',
            'remark',
            'result',
            'category',
            'is_category_overridden',
            'benefits',
            'total_score',
            'votes_count',
            'average_score',
            'created_by',
            'created_by_name',
            'created_at',
        ]

    def get_benefits(self, obj):
        if hasattr(obj, 'benefits') and obj.benefits:
            b = obj.benefits
            return {
                'p': b.productivity,
                'q': b.quality,
                'c': b.cost,
                'd': b.delivery,
                's': b.safety,
                'm': b.morale,
            }
        return {'p': False, 'q': False, 'c': False, 'd': False, 's': False, 'm': False}

    def get_category(self, obj):
        session = self.context.get('session')
        if session and session.category_overrides and str(obj.id) in session.category_overrides:
            return session.category_overrides[str(obj.id)]
        from cft_awards.services import resolve_kaizen_category
        return resolve_kaizen_category(obj)

    def get_is_category_overridden(self, obj):
        session = self.context.get('session')
        if session and session.category_overrides:
            return str(obj.id) in session.category_overrides
        return False

    def get_total_score(self, obj):
        session = self.context.get('session')
        present_member_ids = self.context.get('present_member_ids', [])
        if not session:
            return 0
        ratings = obj.cft_ratings.filter(session=session)
        if present_member_ids:
            ratings = ratings.filter(member_id__in=present_member_ids)
        return sum(r.stars for r in ratings)

    def get_votes_count(self, obj):
        session = self.context.get('session')
        present_member_ids = self.context.get('present_member_ids', [])
        if not session:
            return 0
        ratings = obj.cft_ratings.filter(session=session, stars__gt=0)
        if present_member_ids:
            ratings = ratings.filter(member_id__in=present_member_ids)
        return ratings.count()

    def get_average_score(self, obj):
        votes = self.get_votes_count(obj)
        if votes == 0:
            return 0.0
        return round(self.get_total_score(obj) / votes, 2)

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return obj.idea_by or ''



