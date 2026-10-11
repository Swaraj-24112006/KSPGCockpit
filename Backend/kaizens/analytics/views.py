"""
Analytics Views
===============
DRF APIViews for Dashboard, Executive, and Employee Leaderboard analytics.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .filters import parse_analytics_filters
from .dashboard_service import compute_dashboard_analytics
from .executive_service import compute_executive_analytics
from .employee_service import compute_employee_leaderboard


class DashboardAnalyticsAPIView(APIView):
    """
    GET /api/kaizen/analytics/dashboard/
    GET /api/v1/kaizen/analytics/dashboard/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        filters = parse_analytics_filters(request)
        data = compute_dashboard_analytics(filters)
        return Response(data, status=status.HTTP_200_OK)


class ExecutiveAnalyticsAPIView(APIView):
    """
    GET /api/kaizen/analytics/executive/
    GET /api/v1/kaizen/analytics/executive/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        filters = parse_analytics_filters(request)
        data = compute_executive_analytics(filters)
        return Response(data, status=status.HTTP_200_OK)


class EmployeeLeaderboardAPIView(APIView):
    """
    GET /api/kaizen/analytics/employees/
    GET /api/v1/kaizen/analytics/employees/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        filters = parse_analytics_filters(request)
        data = compute_employee_leaderboard(filters)
        return Response(data, status=status.HTTP_200_OK)
