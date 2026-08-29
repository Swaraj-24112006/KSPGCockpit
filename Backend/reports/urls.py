from django.urls import path
from .views import (
    dashboard_kpis,
    analytics_summary,
    export_csv,
    export_excel,
    export_pdf
)

urlpatterns = [
    path('dashboard/', dashboard_kpis, name='dashboard-kpis'),
    path('analytics/', analytics_summary, name='analytics-summary'),
    path('export/csv/', export_csv, name='export-csv'),
    path('export/excel/', export_excel, name='export-excel'),
    path('export/pdf/', export_pdf, name='export-pdf'),
]
