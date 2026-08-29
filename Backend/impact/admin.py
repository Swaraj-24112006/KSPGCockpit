from django.contrib import admin
from .models import ImpactAssessment, ImpactItem, ImpactAction, AllocatedResource


class ImpactItemInline(admin.TabularInline):
    model = ImpactItem
    extra = 0


class AllocatedResourceInline(admin.TabularInline):
    model = AllocatedResource
    extra = 0


class ImpactActionInline(admin.TabularInline):
    model = ImpactAction
    extra = 0
    fk_name = 'assessment'


@admin.register(ImpactAssessment)
class ImpactAssessmentAdmin(admin.ModelAdmin):
    list_display = ['kaizen', 'decided_in_review', 'overall_closure_status', 'reviewed_by', 'reviewed_date']
    list_filter = ['overall_closure_status', 'decided_in_review']
    search_fields = ['kaizen__sr_no', 'kaizen__title']
    inlines = [ImpactItemInline, AllocatedResourceInline, ImpactActionInline]


@admin.register(ImpactAction)
class ImpactActionAdmin(admin.ModelAdmin):
    list_display = ['kaizen', 'category', 'description', 'assigned_owner_name', 'target_date', 'status']
    list_filter = ['status', 'category']
    search_fields = ['kaizen__sr_no', 'description', 'assigned_owner_name']
