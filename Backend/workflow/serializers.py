"""
Workflow Serializers
"""

from rest_framework import serializers
from .models import WorkflowHistory


class WorkflowHistorySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = WorkflowHistory
        fields = [
            'id', 'kaizen', 'action', 'action_display',
            'from_status', 'to_status',
            'performed_by', 'performed_by_name',
            'remarks', 'performed_at',
        ]
        read_only_fields = ['id', 'performed_at']


class ApproveSerializer(serializers.Serializer):
    """Serializer for approve action."""
    remarks = serializers.CharField(required=False, default='')
    classification = serializers.ChoiceField(
        choices=[('kaizen', 'Kaizen'), ('good_point', 'Good Point')],
        required=False,
        default='kaizen',
    )


class RejectSerializer(serializers.Serializer):
    """Serializer for reject action — reason is required."""
    reason = serializers.CharField(required=True, min_length=10)
    remarks = serializers.CharField(required=False, default='')


class ReworkSerializer(serializers.Serializer):
    """Serializer for rework action."""
    remarks = serializers.CharField(required=True, min_length=10)


class ClassifySerializer(serializers.Serializer):
    """Serializer for classification change."""
    classification = serializers.ChoiceField(
        choices=[
            ('kaizen', 'Kaizen'),
            ('good_point', 'Good Point'),
            ('pending', 'Pending'),
            ('none', 'None'),
        ],
        required=True,
    )
    remarks = serializers.CharField(required=False, default='')
