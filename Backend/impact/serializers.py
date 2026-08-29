"""
Impact Serializers
"""

from rest_framework import serializers
from .models import ImpactAssessment, ImpactItem, ImpactAction, AllocatedResource


class AllocatedResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AllocatedResource
        fields = ['id', 'employee', 'employee_name', 'role_description', 'task_assigned']


class ImpactItemSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_display = serializers.SerializerMethodField()

    class Meta:
        model = ImpactItem
        fields = [
            'id', 'category', 'category_display', 'required', 'description',
            'assigned_to', 'assigned_to_name', 'assigned_to_display',
            'status', 'status_display',
            'completed_by', 'completed_by_name', 'completed_date', 'notes',
        ]

    def get_assigned_to_display(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return obj.assigned_to_name


class ImpactAssessmentSerializer(serializers.ModelSerializer):
    impact_items = ImpactItemSerializer(many=True, read_only=True)
    allocated_resources = AllocatedResourceSerializer(many=True, read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default=None)
    closed_by_name = serializers.CharField(source='closed_by.get_full_name', read_only=True, default=None)
    closure_status_display = serializers.CharField(source='get_overall_closure_status_display', read_only=True)

    class Meta:
        model = ImpactAssessment
        fields = [
            'id', 'kaizen', 'decided_in_review', 'reviewed_date',
            'reviewed_by', 'reviewed_by_name',
            'overall_closure_status', 'closure_status_display',
            'closed_by', 'closed_by_name', 'closure_date', 'closure_remarks',
            'impact_items', 'allocated_resources',
        ]
        read_only_fields = ['id', 'kaizen']


class ImpactAssessmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating impact assessment with nested items."""
    impact_items = ImpactItemSerializer(many=True, required=False)
    allocated_resources = AllocatedResourceSerializer(many=True, required=False)

    class Meta:
        model = ImpactAssessment
        fields = [
            'decided_in_review', 'reviewed_date', 'reviewed_by',
            'overall_closure_status', 'closure_remarks',
            'impact_items', 'allocated_resources',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('impact_items', [])
        resources_data = validated_data.pop('allocated_resources', [])

        assessment = ImpactAssessment.objects.create(**validated_data)

        for item_data in items_data:
            ImpactItem.objects.create(assessment=assessment, **item_data)

        for resource_data in resources_data:
            AllocatedResource.objects.create(assessment=assessment, **resource_data)

        return assessment

    def update(self, instance, validated_data):
        items_data = validated_data.pop('impact_items', None)
        resources_data = validated_data.pop('allocated_resources', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance


class ImpactActionSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    kaizen_sr_no = serializers.CharField(source='kaizen.sr_no', read_only=True)
    kaizen_title = serializers.CharField(source='kaizen.title', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_until_due = serializers.IntegerField(read_only=True)

    class Meta:
        model = ImpactAction
        fields = [
            'id', 'assessment', 'kaizen', 'kaizen_sr_no', 'kaizen_title',
            'category', 'category_display', 'description',
            'assigned_to', 'assigned_owner_name',
            'target_date', 'status', 'status_display',
            'action_taken', 'completed_date',
            'verified_by', 'verified_by_name',
            'is_overdue', 'days_until_due',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ImpactActionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpactAction
        fields = [
            'kaizen', 'category', 'description',
            'assigned_to', 'assigned_owner_name',
            'target_date', 'status', 'action_taken',
        ]
