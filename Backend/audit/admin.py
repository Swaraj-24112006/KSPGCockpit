from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'kaizen', 'ip_address']
    list_filter = ['action', 'timestamp']
    search_fields = ['user__username', 'kaizen__sr_no', 'remarks']
    readonly_fields = ['user', 'kaizen', 'action', 'previous_value', 'new_value', 'timestamp', 'remarks', 'ip_address']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
