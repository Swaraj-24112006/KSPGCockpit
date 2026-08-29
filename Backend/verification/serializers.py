"""
Verification Serializers
"""

from rest_framework import serializers
from .models import KaizenVerification, KaizenClosure


class KaizenVerificationSerializer(serializers.ModelSerializer):
    verifier_name = serializers.CharField(source='verifier.get_full_name', read_only=True)
    all_checks_passed = serializers.BooleanField(read_only=True)

    class Meta:
        model = KaizenVerification
        fields = [
            'id', 'kaizen', 'verifier', 'verifier_name',
            'implementation_verified', 'evidence_verified',
            'result_verified', 'benefits_verified',
            'cost_savings_verified', 'impact_actions_verified',
            'verification_date', 'verification_remarks',
            'is_verified', 'all_checks_passed',
        ]
        read_only_fields = ['id', 'kaizen', 'verifier']


class KaizenClosureSerializer(serializers.ModelSerializer):
    closed_by_name = serializers.CharField(source='closed_by.get_full_name', read_only=True)

    class Meta:
        model = KaizenClosure
        fields = [
            'id', 'kaizen', 'closed_by', 'closed_by_name',
            'closure_date', 'closure_remarks', 'all_actions_completed',
        ]
        read_only_fields = ['id', 'kaizen', 'closed_by', 'closure_date', 'all_actions_completed']


class VerifySerializer(serializers.Serializer):
    """Serializer for the verify action."""
    implementation_verified = serializers.BooleanField(default=False)
    evidence_verified = serializers.BooleanField(default=False)
    result_verified = serializers.BooleanField(default=False)
    benefits_verified = serializers.BooleanField(default=False)
    cost_savings_verified = serializers.BooleanField(default=False)
    impact_actions_verified = serializers.BooleanField(default=False)
    verification_remarks = serializers.CharField(required=False, default='')


class CloseSerializer(serializers.Serializer):
    """Serializer for the close action."""
    closure_remarks = serializers.CharField(required=False, default='')
