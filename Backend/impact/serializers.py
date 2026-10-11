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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        # Build dictionary of impact items by category
        items_map = {}
        for item in instance.impact_items.all():
            items_map[item.category] = {
                'required': item.required,
                'description': item.description or '',
                'assignedTo': item.assigned_to_name or (item.assigned_to.get_full_name() if item.assigned_to else ''),
                'status': 'Completed' if item.status == 'completed' else ('Not Required' if item.status == 'not_required' else 'Pending'),
                'completedBy': item.completed_by_name or (item.completed_by.get_full_name() if item.completed_by else ''),
                'completedDate': str(item.completed_date) if item.completed_date else '',
                'notes': item.notes or '',
            }

        # Status formatting for frontend
        closure_map = {
            'pending_review': 'Pending Review',
            'actions_allocated': 'Actions Allocated',
            'in_progress': 'In-Progress',
            'fully_closed': 'Fully Closed',
        }
        frontend_status = closure_map.get(instance.overall_closure_status, 'In-Progress')

        # Add frontend-compatible camelCase fields
        ret['decidedInReview'] = instance.decided_in_review
        ret['reviewedDate'] = str(instance.reviewed_date) if instance.reviewed_date else ''
        ret['reviewedBy'] = ret['reviewed_by_name'] or 'CFT Committee Lead'
        ret['overallClosureStatus'] = frontend_status
        ret['closedBy'] = ret['closed_by_name'] or ''
        ret['closureDate'] = str(instance.closure_date.date()) if instance.closure_date else ''
        ret['closureRemarks'] = instance.closure_remarks or ''

        # The 4 primary 5M & process categories
        ret['fiveMChange'] = items_map.get('five_m', {
            'required': True,
            'description': 'Check 5M changes & revise standard parameters',
            'assignedTo': instance.kaizen.idea_by or 'Kaizen Initiator',
            'status': 'Pending',
            'notes': ''
        })
        ret['safetyImpact'] = items_map.get('safety', {
            'required': True,
            'description': 'Perform EHS risk assessment & safety SOP check',
            'assignedTo': instance.kaizen.idea_by or 'Kaizen Initiator',
            'status': 'Pending',
            'notes': ''
        })
        ret['pfdUpdate'] = items_map.get('pfd', {
            'required': True,
            'description': 'Revise Process Flow Diagram (PFD) drawing',
            'assignedTo': instance.kaizen.idea_by or 'Kaizen Initiator',
            'status': 'Pending',
            'notes': ''
        })
        ret['pfmeaUpdate'] = items_map.get('pfmea', {
            'required': True,
            'description': 'Update PFMEA failure mode RPN score & control measures',
            'assignedTo': instance.kaizen.idea_by or 'Kaizen Initiator',
            'status': 'Pending',
            'notes': ''
        })

        # Resources formatted for frontend
        ret['allocatedResources'] = [
            {
                'id': str(r.id),
                'name': r.employee_name,
                'role': r.role_description,
                'taskAssigned': r.task_assigned,
            }
            for r in instance.allocated_resources.all()
        ]

        return ret


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
            'department', 'category', 'category_display', 'description',
            'assigned_to', 'assigned_owner_name',
            'target_date', 'status', 'status_display',
            'action_taken', 'completed_date',
            'verified_by', 'verified_by_name',
            'is_overdue', 'days_until_due',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        """Map frontend camelCase keys to backend snake_case model fields."""
        if isinstance(data, dict):
            normalized = dict(data)
            from kaizens.models import Kaizen

            # 1. Kaizen lookup
            sr_no = normalized.pop('kaizenSrNo', None) or normalized.pop('kaizen_sr_no', None)
            if not normalized.get('kaizen') and sr_no:
                found_k = Kaizen.objects.filter(sr_no__iexact=sr_no).first()
                if found_k:
                    normalized['kaizen'] = found_k.id

            # 2. Description
            if 'impactDescription' in normalized:
                normalized['description'] = normalized.pop('impactDescription')
            if 'impact_description' in normalized:
                normalized['description'] = normalized.pop('impact_description')

            # 3. Assigned Owner
            if 'assignedOwner' in normalized:
                normalized['assigned_owner_name'] = normalized.pop('assignedOwner')
            if 'assigned_owner' in normalized:
                normalized['assigned_owner_name'] = normalized.pop('assigned_owner')
            if 'assigned_to' in normalized:
                val = normalized['assigned_to']
                if isinstance(val, str) and not val.isdigit():
                    normalized['assigned_owner_name'] = val
                    normalized['assigned_to'] = None

            # 4. Target Date
            if 'targetDate' in normalized:
                normalized['target_date'] = normalized.pop('targetDate') or None
            elif 'target_date' in normalized and not normalized['target_date']:
                normalized['target_date'] = None

            # 5. Action Taken
            if 'actionTaken' in normalized:
                normalized['action_taken'] = normalized.pop('actionTaken')

            # 6. Verified By
            if 'verifiedBy' in normalized:
                val = normalized.pop('verifiedBy')
                if isinstance(val, str) and not val.isdigit():
                    normalized['verified_by_name'] = val
                elif isinstance(val, int) or (isinstance(val, str) and val.isdigit()):
                    normalized['verified_by'] = int(val)
            if 'verified_by' in normalized:
                val = normalized['verified_by']
                if isinstance(val, str) and not val.isdigit():
                    normalized['verified_by_name'] = val
                    normalized['verified_by'] = None

            # 7. Completed/Closed Date
            if 'closedDate' in normalized:
                normalized['completed_date'] = normalized.pop('closedDate') or None
            elif 'closed_date' in normalized:
                normalized['completed_date'] = normalized.pop('closed_date') or None

            # 8. Category normalization
            cat_val = normalized.get('category')
            if cat_val:
                cat_lower = str(cat_val).lower().strip().replace(' ', '_')
                cat_map = {
                    'man': 'man',
                    'machine': 'machine',
                    'material': 'material',
                    'method': 'method',
                    'measurement': 'measurement',
                    'safety': 'safety',
                    'horizontal_deployment': 'horizontal_deployment',
                    '5m_change': 'five_m',
                    'five_m': 'five_m',
                    'pfd_update': 'pfd',
                    'pfd': 'pfd',
                    'pfmea_update': 'pfmea',
                    'pfmea': 'pfmea',
                }
                normalized['category'] = cat_map.get(cat_lower, 'method')

            # 9. Status normalization
            stat_val = normalized.get('status')
            if stat_val:
                stat_lower = str(stat_val).lower().strip().replace(' ', '_').replace('-', '_')
                stat_map = {
                    'open': 'open',
                    'in_progress': 'in_progress',
                    'pending': 'open',
                    'completed': 'closed',
                    'closed': 'closed',
                    'not_required': 'not_required',
                }
                normalized['status'] = stat_map.get(stat_lower, 'open')

            return super().to_internal_value(normalized)

        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        # Category label mapping
        cat_display_map = {
            'man': 'Man',
            'machine': 'Machine',
            'material': 'Material',
            'method': 'Method',
            'measurement': 'Measurement',
            'safety': 'Safety',
            'horizontal_deployment': 'Horizontal Deployment',
            'five_m': '5M Change',
            'pfd': 'PFD Update',
            'pfmea': 'PFMEA Update',
        }
        category_title = cat_display_map.get(instance.category, instance.get_category_display())

        # Status label mapping for frontend
        status_map = {
            'open': 'Open',
            'in_progress': 'In Progress',
            'completed': 'Closed',
            'closed': 'Closed',
            'not_required': 'Closed',
        }
        frontend_status = status_map.get(instance.status, 'Open')

        # Add camelCase fields expected by OpenImpactTracker
        ret['id'] = str(instance.id)
        ret['kaizenSrNo'] = instance.kaizen.sr_no if instance.kaizen else 'KZ-GEN'
        ret['kaizenTitle'] = instance.kaizen.title if instance.kaizen else 'Shopfloor Continuous Improvement Action'
        ret['department'] = instance.department or (instance.kaizen.mini_factory if instance.kaizen else 'MF1')
        ret['category'] = category_title
        ret['categoryKey'] = instance.category
        ret['impactDescription'] = instance.description or ''
        ret['assignedOwner'] = instance.assigned_owner_name or (instance.assigned_to.get_full_name() if instance.assigned_to else 'Unassigned')
        ret['targetDate'] = str(instance.target_date) if instance.target_date else ''
        ret['status'] = frontend_status
        ret['actionTaken'] = instance.action_taken or ''
        ret['closedDate'] = str(instance.completed_date) if instance.completed_date else ''
        ret['verifiedBy'] = instance.verified_by_name or (instance.verified_by.get_full_name() if instance.verified_by else '')
        ret['createdAt'] = instance.created_at.isoformat() if instance.created_at else ''

        return ret


class ImpactActionCreateSerializer(ImpactActionSerializer):
    """Create serializer inheriting the camelCase mapping from ImpactActionSerializer."""
    class Meta(ImpactActionSerializer.Meta):
        fields = [
            'id', 'assessment', 'kaizen', 'department', 'category', 'description',
            'assigned_to', 'assigned_owner_name', 'target_date', 'status',
            'action_taken', 'completed_date', 'verified_by', 'verified_by_name',
        ]

