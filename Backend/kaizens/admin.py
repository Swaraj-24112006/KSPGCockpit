"""
Kaizen Admin Configuration
"""

from django.contrib import admin
from .models import Kaizen, KaizenBenefit, KaizenEvidence, KaizenCostSaving


class KaizenBenefitInline(admin.StackedInline):
    model = KaizenBenefit
    extra = 0


class KaizenEvidenceInline(admin.TabularInline):
    model = KaizenEvidence
    extra = 0
    readonly_fields = ['uploaded_by', 'uploaded_at', 'file_size']


class KaizenCostSavingInline(admin.StackedInline):
    model = KaizenCostSaving
    extra = 0


@admin.register(Kaizen)
class KaizenAdmin(admin.ModelAdmin):
    list_display = [
        'sr_no', 'title', 'area', 'mini_factory', 'status',
        'classification', 'cost_save', 'idea_by', 'created_at',
    ]
    list_filter = ['status', 'classification', 'area', 'mini_factory', 'month']
    search_fields = ['sr_no', 'title', 'idea_by', 'problem_before']
    readonly_fields = ['sr_no', 'created_at', 'updated_at', 'submitted_at']
    inlines = [KaizenBenefitInline, KaizenEvidenceInline, KaizenCostSavingInline]

    fieldsets = (
        ('Identification', {
            'fields': ('sr_no', 'month', 'suggestion_date', 'title')
        }),
        ('Problem & Solution', {
            'fields': ('problem_before', 'counter_measure_after', 'result')
        }),
        ('Location', {
            'fields': ('area', 'mini_factory', 'location', 'machine')
        }),
        ('People', {
            'fields': ('idea_by', 'implemented_by', 'prepared_by', 'approved_by', 'verified_by_name')
        }),
        ('Dates', {
            'fields': ('closing_target_date', 'implementation_date', 'submitted_at')
        }),
        ('Status & Classification', {
            'fields': ('status', 'classification', 'remark', 'cost_save')
        }),
        ('Photos', {
            'fields': ('photo_before', 'photo_after')
        }),
        ('System', {
            'fields': ('created_by', 'assigned_reviewer', 'created_at', 'updated_at')
        }),
    )
