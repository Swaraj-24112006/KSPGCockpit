"""
Voting Serializers — Legacy + New CFT Star Rating Serializers
"""

from rest_framework import serializers
from .models import VotingSession, CftVote, CftMember, CftSession, CftStarRating


# ─── Legacy Serializers (auth-based voting) ───────────────────────

class CftVoteSerializer(serializers.ModelSerializer):
    voter_name = serializers.SerializerMethodField()
    kaizen_sr_no = serializers.CharField(source='kaizen.sr_no', read_only=True)
    kaizen_title = serializers.CharField(source='kaizen.title', read_only=True)

    def get_voter_name(self, obj):
        if obj.voter:
            return obj.voter.get_full_name() or obj.voter.username
        return 'Unknown'

    class Meta:
        model = CftVote
        fields = [
            'id', 'session', 'voter', 'voter_name',
            'kaizen', 'kaizen_sr_no', 'kaizen_title',
            'rank', 'voted_at',
        ]
        read_only_fields = ['id', 'session', 'voter', 'voted_at']


class VotingSessionSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.SerializerMethodField()
    votes = CftVoteSerializer(many=True, read_only=True)
    total_votes = serializers.SerializerMethodField()
    eligible_kaizen_count = serializers.SerializerMethodField()

    def get_opened_by_name(self, obj):
        if obj.opened_by:
            return obj.opened_by.get_full_name() or obj.opened_by.username
        return 'Unknown'

    class Meta:
        model = VotingSession
        fields = [
            'id', 'month', 'year', 'is_open', 'description',
            'eligible_kaizens', 'opened_by', 'opened_by_name',
            'opened_at', 'closed_at', 'votes',
            'total_votes', 'eligible_kaizen_count',
        ]
        read_only_fields = ['id', 'opened_by', 'opened_at', 'closed_at']

    def get_total_votes(self, obj):
        return obj.votes.count()

    def get_eligible_kaizen_count(self, obj):
        return obj.eligible_kaizens.count()


class VotingSessionListSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()

    def get_opened_by_name(self, obj):
        if obj.opened_by:
            return obj.opened_by.get_full_name() or obj.opened_by.username
        return 'Unknown'

    class Meta:
        model = VotingSession
        fields = [
            'id', 'month', 'year', 'is_open', 'description',
            'opened_by_name', 'opened_at', 'closed_at', 'total_votes',
        ]

    def get_total_votes(self, obj):
        return obj.votes.count()


class CastVoteSerializer(serializers.Serializer):
    """Serializer for casting a vote."""
    kaizen = serializers.IntegerField(required=True)
    rank = serializers.IntegerField(required=True, min_value=1, max_value=3)


# ─── New CFT Star Rating Serializers (unauthenticated) ────────────

class CftMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = CftMember
        fields = ['id', 'name', 'role', 'department', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class CftStarRatingSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)
    kaizen_sr_no = serializers.CharField(source='kaizen.sr_no', read_only=True)
    kaizen_title = serializers.CharField(source='kaizen.title', read_only=True)

    class Meta:
        model = CftStarRating
        fields = [
            'id', 'session', 'member', 'member_name',
            'kaizen', 'kaizen_sr_no', 'kaizen_title',
            'stars', 'rated_at',
        ]
        read_only_fields = ['id', 'rated_at']


class CftSessionSerializer(serializers.ModelSerializer):
    present_ids = serializers.SerializerMethodField()
    total_ratings = serializers.SerializerMethodField()

    class Meta:
        model = CftSession
        fields = [
            'id', 'month', 'year', 'is_open', 'opened_by_name',
            'opened_at', 'closed_at', 'description',
            'present_ids', 'category_overrides', 'total_ratings',
        ]
        read_only_fields = ['id', 'opened_at', 'closed_at']

    def get_present_ids(self, obj):
        return obj.get_present_ids()

    def get_total_ratings(self, obj):
        return obj.star_ratings.count()


class SubmitRatingsSerializer(serializers.Serializer):
    """
    Bulk-submit ratings for one CFT member.
    ratings: {kaizen_id: stars (1-5), ...}
    """
    member_id = serializers.IntegerField(required=True)
    ratings = serializers.DictField(
        child=serializers.IntegerField(min_value=1, max_value=5),
        allow_empty=True,
    )


class UpdateAttendanceSerializer(serializers.Serializer):
    """Update which member IDs are present in the session."""
    present_member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
    )


class UpdateCategoryOverridesSerializer(serializers.Serializer):
    """Update category overrides for a session."""
    category_overrides = serializers.DictField(
        child=serializers.CharField(),
        allow_empty=True,
    )
