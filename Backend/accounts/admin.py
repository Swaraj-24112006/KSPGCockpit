"""
Accounts Admin Configuration
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = [
        'username', 'employee_id', 'first_name', 'last_name',
        'department', 'plant', 'role', 'is_active_employee',
    ]
    list_filter = ['role', 'department', 'plant', 'is_active_employee']
    search_fields = ['username', 'employee_id', 'first_name', 'last_name', 'email']

    fieldsets = UserAdmin.fieldsets + (
        ('Employee Details', {
            'fields': (
                'employee_id', 'department', 'designation',
                'plant', 'area', 'phone', 'role',
                'is_active_employee', 'last_activity',
            )
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Employee Details', {
            'fields': (
                'employee_id', 'first_name', 'last_name', 'email',
                'department', 'designation', 'plant', 'area', 'role',
            )
        }),
    )
