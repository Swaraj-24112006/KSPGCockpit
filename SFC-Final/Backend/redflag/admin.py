from django.contrib import admin
from .models import (
    Department, Plant, Line, Station, ProductModel, Employee, RedFlagConfig,
    RedFlagSequence, Attachment, RedFlag, StageHistory, RedFlagAuditLog,
    RedFlagContainment, RedFlagRootCause, SustenanceCheck, RedFlagClosure,
    EscalationLink,
)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'can_originate', 'can_be_target', 'sort_order', 'is_active')
    list_filter = ('can_originate', 'can_be_target', 'is_active')
    search_fields = ('name', 'code')
    ordering = ('sort_order', 'name')

class LineInline(admin.TabularInline):
    model = Line
    extra = 1

@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'plant_head', 'default_qa_custodian', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code', 'name')
    inlines = [LineInline]

class StationInline(admin.TabularInline):
    model = Station
    extra = 1

@admin.register(Line)
class LineAdmin(admin.ModelAdmin):
    list_display = ('name', 'plant', 'is_active')
    list_filter = ('plant', 'is_active')
    search_fields = ('name', 'plant__name', 'plant__code')
    inlines = [StationInline]

@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ('name', 'line', 'is_active')
    list_filter = ('line__plant', 'is_active')
    search_fields = ('name', 'line__name')

@admin.register(ProductModel)
class ProductModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'employee_code', 'designation', 'department', 'plant', 'is_active')
    list_filter = ('department', 'plant', 'is_active')
    search_fields = ('full_name', 'employee_code', 'designation', 'email')

@admin.register(RedFlagConfig)
class RedFlagConfigAdmin(admin.ModelAdmin):
    list_display = ('form_number', 'form_revision', 'standard_reference', 'containment_sla_minutes', 'enforce_sustenance_schedule')

    def has_add_permission(self, request):
        return not RedFlagConfig.objects.exists()

@admin.register(RedFlagSequence)
class RedFlagSequenceAdmin(admin.ModelAdmin):
    list_display = ('name', 'last_value')

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'kind', 'red_flag', 'original_name', 'content_type', 'size_bytes', 'uploaded_by', 'uploaded_at')
    list_filter = ('kind', 'content_type')
    search_fields = ('original_name', 'object_key')

class StageHistoryInline(admin.TabularInline):
    model = StageHistory
    extra = 0
    can_delete = False
    readonly_fields = ('stage', 'event', 'completed_at', 'completed_by', 'completed_by_name', 'sign_off_role', 'notes', 'from_status', 'to_status')

    def has_add_permission(self, request, obj=None):
        return False

@admin.register(RedFlag)
class RedFlagAdmin(admin.ModelAdmin):
    list_display = ('red_flag_no', 'status', 'raised_by_name', 'target_person_name', 'plant_name', 'severity', 'raised_at', 'row_version')
    list_filter = ('status', 'plant', 'severity', 'category_5m', 'red_flag_type')
    search_fields = ('red_flag_no', 'description', 'raised_by_name', 'target_person_name')
    inlines = [StageHistoryInline]

@admin.register(StageHistory)
class StageHistoryAdmin(admin.ModelAdmin):
    list_display = ('red_flag', 'stage', 'event', 'completed_at', 'completed_by_name', 'sign_off_role')
    list_filter = ('stage', 'event')
    search_fields = ('red_flag__red_flag_no', 'completed_by_name', 'notes')
    readonly_fields = ('red_flag', 'stage', 'event', 'completed_at', 'completed_by', 'completed_by_name', 'sign_off_role', 'notes', 'from_status', 'to_status')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(RedFlagAuditLog)
class RedFlagAuditLogAdmin(admin.ModelAdmin):
    list_display = ('red_flag', 'actor', 'action', 'at', 'ip')
    list_filter = ('action',)
    search_fields = ('red_flag__red_flag_no', 'actor__username', 'action')
    readonly_fields = ('red_flag', 'actor', 'action', 'changes', 'ip', 'user_agent', 'at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RedFlagContainment)
class RedFlagContainmentAdmin(admin.ModelAdmin):
    list_display = ('red_flag', 'attempt_no', 'is_current', 'status', 'action_taken_by_name', 'contained_at', 'gap_minutes')
    list_filter = ('status', 'is_current')
    search_fields = ('red_flag__red_flag_no', 'action_taken_by_name', 'quarantine_tag_no')

@admin.register(RedFlagRootCause)
class RedFlagRootCauseAdmin(admin.ModelAdmin):
    list_display = ('red_flag', 'submitted_by_name', 'submitted_at', 'sop_updated', 'pfmea_updated')
    search_fields = ('red_flag__red_flag_no', 'submitted_by_name', 'root_cause')

@admin.register(SustenanceCheck)
class SustenanceCheckAdmin(admin.ModelAdmin):
    list_display = ('red_flag', 'cycle_no', 'month', 'target_days', 'scheduled_date', 'audit_date', 'status', 'auditor_name')
    list_filter = ('status', 'month', 'cycle_no')
    search_fields = ('red_flag__red_flag_no', 'auditor_name', 'observations')

@admin.register(RedFlagClosure)
class RedFlagClosureAdmin(admin.ModelAdmin):
    list_display = ('red_flag', 'closure_date', 'approved_by_qa_name', 'approved_by_production_name', 'closed_at')
    search_fields = ('red_flag__red_flag_no', 'approved_by_qa_name', 'approved_by_production_name')

@admin.register(EscalationLink)
class EscalationLinkAdmin(admin.ModelAdmin):
    list_display = ('red_flag', 'target_module', 'target_no', 'target_ref_id', 'state', 'created_at')
    list_filter = ('target_module', 'state')
    search_fields = ('red_flag__red_flag_no', 'target_no', 'target_ref_id')
