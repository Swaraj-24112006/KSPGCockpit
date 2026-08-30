"""
PPSR URL Configuration
======================
Routes for PPSR API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PpsrStatusView,
    PpsrReportViewSet,
    PpsrMeetingLogViewSet,
    CommitteeFeedbackViewSet,
    CftMemberViewSet,
    CftRatingViewSet,
    AwardLeaderboardView,
)

router = DefaultRouter()
router.register(r'reports', PpsrReportViewSet, basename='ppsr-report')
router.register(r'meetings', PpsrMeetingLogViewSet, basename='ppsr-meeting')
router.register(r'cft-members', CftMemberViewSet, basename='ppsr-cft-member')
router.register(r'cft-ratings', CftRatingViewSet, basename='ppsr-cft-rating')
router.register(r'feedback', CommitteeFeedbackViewSet, basename='ppsr-feedback')

urlpatterns = [
    path('status/', PpsrStatusView.as_view(), name='status'),
    path('awards/leaderboard/', AwardLeaderboardView.as_view(), name='awards-leaderboard'),
    path('', include(router.urls)),
]
