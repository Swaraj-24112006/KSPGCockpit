from django.contrib import admin
from .models import VotingSession, CftVote


class CftVoteInline(admin.TabularInline):
    model = CftVote
    extra = 0
    readonly_fields = ['voter', 'kaizen', 'rank', 'voted_at']


@admin.register(VotingSession)
class VotingSessionAdmin(admin.ModelAdmin):
    list_display = ['month', 'year', 'is_open', 'opened_by', 'opened_at', 'closed_at']
    list_filter = ['is_open', 'year']
    inlines = [CftVoteInline]


@admin.register(CftVote)
class CftVoteAdmin(admin.ModelAdmin):
    list_display = ['session', 'voter', 'kaizen', 'rank', 'voted_at']
    list_filter = ['rank', 'session']
