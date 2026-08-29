"""
Kaizen Serializers — Serialization for Kaizen CRUD operations
"""

from rest_framework import serializers
from .models import Kaizen, KaizenBenefit, KaizenEvidence, KaizenCostSaving
from accounts.serializers import UserListSerializer


def build_absolute_photo_url(request, file_field) -> str | None:
    """Build absolute URL for a photo stored in MEDIA_ROOT or MinIO."""
    if not file_field:
        return None
    try:
        from core.minio_utils import get_presigned_url, is_minio_available
        if is_minio_available() and hasattr(file_field, 'name') and file_field.name:
            minio_url = get_presigned_url(file_field.name, request=request)
            if minio_url:
                return minio_url
    except Exception:
        pass

    try:
        if request:
            return request.build_absolute_uri(file_field.url)
        # Fallback: return relative URL
        return file_field.url
    except Exception:
        return None


class KaizenBenefitSerializer(serializers.ModelSerializer):
    p = serializers.BooleanField(source='productivity', required=False)
    q = serializers.BooleanField(source='quality', required=False)
    c = serializers.BooleanField(source='cost', required=False)
    d = serializers.BooleanField(source='delivery', required=False)
    s = serializers.BooleanField(source='safety', required=False)
    m = serializers.BooleanField(source='morale', required=False)

    class Meta:
        model = KaizenBenefit
        fields = [
            'productivity', 'quality', 'cost', 'delivery', 'safety', 'morale',
            'p', 'q', 'c', 'd', 's', 'm',
        ]

    def to_internal_value(self, data):
        if isinstance(data, dict):
            normalized = dict(data)
            mapping = {
                'p': 'productivity',
                'q': 'quality',
                'c': 'cost',
                'd': 'delivery',
                's': 'safety',
                'm': 'morale',
            }
            for short_k, full_k in mapping.items():
                if short_k in normalized and full_k not in normalized:
                    normalized[full_k] = normalized[short_k]
            return super().to_internal_value(normalized)
        return super().to_internal_value(data)


class KaizenEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None

    def get_file_url(self, obj):
        """Return full absolute URL for the evidence file."""
        if obj.file:
            request = self.context.get('request')
            return build_absolute_photo_url(request, obj.file)
        return None

    class Meta:
        model = KaizenEvidence
        fields = [
            'id', 'evidence_type', 'file', 'file_url', 'original_filename',
            'file_size', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'file_size']


class KaizenCostSavingSerializer(serializers.ModelSerializer):
    class Meta:
        model = KaizenCostSaving
        fields = ['savings_inr', 'monthly_savings', 'annual_savings', 'calculation_notes']


class KaizenListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views — includes full photo URLs."""
    benefits = KaizenBenefitSerializer(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    classification_display = serializers.CharField(source='get_classification_display', read_only=True)
    days_to_implement = serializers.IntegerField(read_only=True)

    # Full URLs to access photos via Django media server
    photo_before_url = serializers.SerializerMethodField()
    photo_after_url = serializers.SerializerMethodField()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_reviewer_name(self, obj):
        if obj.assigned_reviewer:
            return obj.assigned_reviewer.get_full_name() or obj.assigned_reviewer.username
        return None

    def get_photo_before_url(self, obj):
        request = self.context.get('request')
        return build_absolute_photo_url(request, obj.photo_before)

    def get_photo_after_url(self, obj):
        request = self.context.get('request')
        return build_absolute_photo_url(request, obj.photo_after)

    class Meta:
        model = Kaizen
        fields = [
            'id', 'sr_no', 'month', 'suggestion_date', 'title',
            'area', 'mini_factory', 'location', 'machine',
            'cost_save', 'idea_by', 'implemented_by',
            'status', 'status_display', 'classification', 'classification_display',
            'benefits', 'created_by', 'created_by_name',
            'assigned_reviewer', 'reviewer_name',
            'days_to_implement', 'created_at',
            # Committee fields
            'problem_before', 'counter_measure_after',
            'remark', 'result',
            'implementation_date', 'closing_target_date',
            # Photo URL fields
            'photo_before_url', 'photo_after_url',
        ]


class KaizenDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views and creation — includes full photo URLs."""
    benefits = KaizenBenefitSerializer(required=False)
    cost_saving_detail = KaizenCostSavingSerializer(required=False, read_only=True)
    evidence_files = KaizenEvidenceSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    classification_display = serializers.CharField(source='get_classification_display', read_only=True)
    days_to_implement = serializers.IntegerField(read_only=True)
    days_to_close = serializers.IntegerField(read_only=True)
    is_editable = serializers.BooleanField(read_only=True)

    # Full URLs for photo display
    photo_before_url = serializers.SerializerMethodField()
    photo_after_url = serializers.SerializerMethodField()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_reviewer_name(self, obj):
        if obj.assigned_reviewer:
            return obj.assigned_reviewer.get_full_name() or obj.assigned_reviewer.username
        return None

    def get_photo_before_url(self, obj):
        request = self.context.get('request')
        return build_absolute_photo_url(request, obj.photo_before)

    def get_photo_after_url(self, obj):
        request = self.context.get('request')
        return build_absolute_photo_url(request, obj.photo_after)

    class Meta:
        model = Kaizen
        fields = [
            'id', 'sr_no', 'month', 'suggestion_date', 'title',
            'problem_before', 'counter_measure_after',
            'area', 'mini_factory', 'location', 'machine',
            'closing_target_date', 'implementation_date',
            'cost_save', 'idea_by', 'implemented_by', 'prepared_by',
            'approved_by', 'verified_by_name',
            'status', 'status_display', 'classification', 'classification_display',
            'remark', 'result',
            # Raw storage field names (write-only via dedicated upload endpoint)
            'photo_before', 'photo_after',
            # Full URLs for image display
            'photo_before_url', 'photo_after_url',
            'benefits', 'cost_saving_detail', 'evidence_files',
            'created_by', 'created_by_name',
            'assigned_reviewer', 'reviewer_name',
            'days_to_implement', 'days_to_close', 'is_editable',
            'created_at', 'updated_at', 'submitted_at',
        ]
        read_only_fields = [
            'id', 'sr_no', 'created_by', 'created_at', 'updated_at', 'submitted_at',
            'photo_before', 'photo_after',  # Updated only via /upload-photo/ endpoint
        ]

    def create(self, validated_data):
        benefits_data = validated_data.pop('benefits', None)
        kaizen = Kaizen.objects.create(**validated_data)

        if benefits_data:
            KaizenBenefit.objects.create(kaizen=kaizen, **benefits_data)
        else:
            KaizenBenefit.objects.create(kaizen=kaizen)

        return kaizen

    def update(self, instance, validated_data):
        benefits_data = validated_data.pop('benefits', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if benefits_data is not None:
            benefit, created = KaizenBenefit.objects.get_or_create(kaizen=instance)
            for attr, value in benefits_data.items():
                setattr(benefit, attr, value)
            benefit.save()

        return instance


class KaizenSubmitSerializer(serializers.Serializer):
    """Serializer for Kaizen submission action."""
    assigned_reviewer = serializers.IntegerField(
        required=False,
        help_text='ID of the reviewer to assign'
    )


class KaizenCostSavingUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating cost savings detail."""
    class Meta:
        model = KaizenCostSaving
        fields = ['savings_inr', 'monthly_savings', 'annual_savings', 'calculation_notes']
