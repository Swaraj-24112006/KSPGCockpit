from django.urls import re_path
from .views import (
    MeView, LookupsView,
    AttachmentUploadView, RedFlagListCreateView,
    RedFlagDetailView, RedFlagExportCSVView,
    ContainmentSubmitView, ContainmentApproveView, ContainmentRejectView,
    RootCauseSubmitView, SustenanceStartView, SustenanceCheckLogView,
    SustenanceDueView, RedFlagCloseView,
    EscalatePpsrView, ConvertKaizenView, LinkFiveSRedTagView,
    RedFlagDashboardAnalyticsView, RedFlagExecutiveAnalyticsView,
    RedFlagSummaryAnalyticsView, RedFlagPresentationModeView,
    HealthCheckView,
)

urlpatterns = [
    re_path(r'^health/?$', HealthCheckView.as_view(), name='redflag-health'),
    re_path(r'^me/?$', MeView.as_view(), name='redflag-me'),
    re_path(r'^lookups/?$', LookupsView.as_view(), name='redflag-lookups'),
    re_path(r'^attachments/?$', AttachmentUploadView.as_view(), name='redflag-attachments'),
    re_path(r'^export\.csv$', RedFlagExportCSVView.as_view(), name='redflag-export-csv'),
    re_path(r'^sustenance/due/?$', SustenanceDueView.as_view(), name='redflag-sustenance-due'),

    # Phase 6: Analytics
    re_path(r'^analytics/dashboard/?$', RedFlagDashboardAnalyticsView.as_view(), name='redflag-analytics-dashboard'),
    re_path(r'^analytics/executive/?$', RedFlagExecutiveAnalyticsView.as_view(), name='redflag-analytics-executive'),
    re_path(r'^analytics/summary/?$', RedFlagSummaryAnalyticsView.as_view(), name='redflag-analytics-summary'),

    # Presentation Mode (Detail View with full 4-stage data & queue)
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/presentation/?$', RedFlagPresentationModeView.as_view(), name='redflag-presentation'),

    # Red Flag Actions & Lifecycle
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/containment/approve/?$', ContainmentApproveView.as_view(), name='redflag-containment-approve'),
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/containment/reject/?$', ContainmentRejectView.as_view(), name='redflag-containment-reject'),
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/containment/?$', ContainmentSubmitView.as_view(), name='redflag-containment-submit'),
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/root-cause/?$', RootCauseSubmitView.as_view(), name='redflag-root-cause'),
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/sustenance/start/?$', SustenanceStartView.as_view(), name='redflag-sustenance-start'),
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/sustenance/checks/(?P<month>[1-3])/?$', SustenanceCheckLogView.as_view(), name='redflag-sustenance-check-log'),
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/close/?$', RedFlagCloseView.as_view(), name='redflag-close'),

    # Phase 5: Cross-Module Escalations
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/escalate-ppsr/?$', EscalatePpsrView.as_view(), name='redflag-escalate-ppsr'),
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/convert-kaizen/?$', ConvertKaizenView.as_view(), name='redflag-convert-kaizen'),
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/link-fives/?$', LinkFiveSRedTagView.as_view(), name='redflag-link-fives'),

    # Detail & Root
    re_path(r'^(?P<pk>[0-9a-fA-F-]{36})/?$', RedFlagDetailView.as_view(), name='redflag-detail'),
    re_path(r'^$', RedFlagListCreateView.as_view(), name='redflag-list-create'),
]
