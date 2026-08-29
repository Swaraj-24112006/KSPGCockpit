from django.contrib import admin
from .models import KaizenVerification, KaizenClosure


@admin.register(KaizenVerification)
class KaizenVerificationAdmin(admin.ModelAdmin):
    list_display = ['kaizen', 'verifier', 'is_verified', 'verification_date']
    list_filter = ['is_verified']
    search_fields = ['kaizen__sr_no']


@admin.register(KaizenClosure)
class KaizenClosureAdmin(admin.ModelAdmin):
    list_display = ['kaizen', 'closed_by', 'closure_date', 'all_actions_completed']
    search_fields = ['kaizen__sr_no']
