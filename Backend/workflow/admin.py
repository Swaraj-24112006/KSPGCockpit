from django.contrib import admin
from .models import WorkflowHistory


@admin.register(WorkflowHistory)
class WorkflowHistoryAdmin(admin.ModelAdmin):
    list_display = ['kaizen', 'action', 'from_status', 'to_status', 'performed_by', 'performed_at']
    list_filter = ['action', 'performed_at']
    search_fields = ['kaizen__sr_no', 'remarks']
    readonly_fields = ['kaizen', 'action', 'from_status', 'to_status', 'performed_by', 'performed_at', 'remarks']
