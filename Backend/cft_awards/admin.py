"""
CFT Awards — Django Admin
==========================
Registers all CFT Awards models in the Django Admin panel
for easy data management during development / production ops.
"""

from django.contrib import admin
from cft_awards.models import (
    CftMember,
    AwardCycle,
    AttendanceRecord,
    MonthlyAward,
    CFTEvaluationSession,
    CFTRating,
    CFTSessionMember,
    AwardCategory,
)




@admin.register(CftMember)
class CftMemberAdmin(admin.ModelAdmin):
    list_display  = ('name', 'role', 'department', 'mini_factory', 'is_active', 'joined_date')
    list_filter   = ('department', 'mini_factory', 'is_active')
    search_fields = ('name', 'role', 'employee_id')
    ordering      = ('department', 'name')
    readonly_fields = ('created_at', 'updated_at')


class AttendanceRecordInline(admin.TabularInline):
    model  = AttendanceRecord
    extra  = 0
    fields = ('member', 'is_present', 'marked_by', 'marked_at')
    readonly_fields = ('marked_at',)


class MonthlyAwardInline(admin.TabularInline):
    model  = MonthlyAward
    extra  = 0
    fields = ('category', 'kaizen', 'rank', 'score', 'winner_status', 'finalized_at', 'finalized_by')
    readonly_fields = ('created_at',)


@admin.register(AwardCycle)
class AwardCycleAdmin(admin.ModelAdmin):
    list_display  = ('title', 'mini_factory', 'month', 'year', 'session_date', 'is_finalized')
    list_filter   = ('mini_factory', 'year', 'is_finalized')
    search_fields = ('title',)
    ordering      = ('-year', '-month')
    readonly_fields = ('created_at', 'updated_at')
    inlines       = [AttendanceRecordInline]


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display  = ('member', 'cycle', 'is_present', 'marked_at')
    list_filter   = ('is_present', 'cycle__mini_factory')
    search_fields = ('member__name', 'cycle__title')
    readonly_fields = ('marked_at',)


@admin.register(MonthlyAward)
class MonthlyAwardAdmin(admin.ModelAdmin):
    list_display  = ('session', 'category', 'kaizen', 'rank', 'score', 'winner_status')
    list_filter   = ('winner_status', 'category')
    search_fields = ('kaizen__title', 'kaizen__sr_no', 'category')
    readonly_fields = ('created_at', 'updated_at')


class CFTSessionMemberInline(admin.TabularInline):
    model = CFTSessionMember
    extra = 0
    fields = ('member', 'present', 'marked_by', 'marked_at')
    readonly_fields = ('marked_at',)


class CFTRatingInline(admin.TabularInline):
    model = CFTRating
    extra = 0
    fields = ('member', 'kaizen', 'stars', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(CFTEvaluationSession)
class CFTEvaluationSessionAdmin(admin.ModelAdmin):
    list_display  = ('month', 'year', 'status', 'opened_by', 'opened_at', 'updated_at')
    list_filter   = ('status', 'year')
    search_fields = ('month', 'year')
    ordering      = ('-year', '-opened_at')
    readonly_fields = ('opened_at', 'updated_at')
    inlines       = [CFTSessionMemberInline, CFTRatingInline, MonthlyAwardInline]


@admin.register(CFTRating)
class CFTRatingAdmin(admin.ModelAdmin):
    list_display  = ('session', 'member', 'kaizen', 'stars', 'created_at')
    list_filter   = ('stars', 'session__year', 'session__month')
    search_fields = ('member__name', 'kaizen__sr_no')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CFTSessionMember)
class CFTSessionMemberAdmin(admin.ModelAdmin):
    list_display  = ('session', 'member', 'present', 'marked_by', 'marked_at')
    list_filter   = ('present', 'session__year', 'session__month')
    search_fields = ('member__name', 'session__month')
    readonly_fields = ('marked_at',)


@admin.register(AwardCategory)
class AwardCategoryAdmin(admin.ModelAdmin):
    list_display  = ('name', 'code', 'winner_count', 'order', 'is_active')
    list_filter   = ('is_active',)
    search_fields = ('name', 'code', 'subtitle')
    ordering      = ('order', 'code')
    readonly_fields = ('created_at', 'updated_at')



