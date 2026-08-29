"""
CFT Awards — URL Configuration
================================
All endpoints are mounted under /api/v1/cft/ in the root urls.py.
"""

from django.urls import path

from cft_awards import views

app_name = 'cft_awards'

urlpatterns = [
    # ── CFT Members ──────────────────────────────────────────────────────────
    path('members/',         views.cft_member_list,   name='member-list'),
    path('members/<int:pk>/', views.cft_member_detail, name='member-detail'),

    # ── Award Cycles ──────────────────────────────────────────────────────────
    path('cycles/',               views.award_cycle_list,   name='cycle-list'),
    path('cycles/<int:pk>/',      views.award_cycle_detail, name='cycle-detail'),
    path('cycles/<int:pk>/finalize/', views.finalize_cycle, name='cycle-finalize'),

    # ── Attendance ────────────────────────────────────────────────────────────
    path('cycles/<int:cycle_pk>/attendance/',        views.attendance_list,        name='attendance-list'),
    path('cycles/<int:cycle_pk>/attendance/bulk/',   views.bulk_attendance_update, name='attendance-bulk'),

    # ── Awards (cycle-scoped) ─────────────────────────────────────────────────
    path('cycles/<int:cycle_pk>/awards/', views.award_list, name='award-list'),

    # ── Awards (standalone actions) ───────────────────────────────────────────
    path('awards/<int:pk>/approve/', views.approve_award_view, name='award-approve'),
    path('awards/<int:pk>/reject/',  views.reject_award_view,  name='award-reject'),
    path('awards/<int:pk>/',         views.delete_award_view,  name='award-delete'),

    # ── Award Categories (Configurable) ───────────────────────────────────────
    path('categories/', views.award_category_list_view, name='category-list'),

    # ── Monthly Evaluation Sessions (Frontend Single-Screen Desk) ─────────────
    path('sessions/get-or-create/',              views.get_or_create_session_view,      name='session-get-or-create'),
    path('sessions/',                            views.session_list_view,               name='session-list'),
    path('sessions/<int:pk>/',                   views.session_detail_view,             name='session-detail'),
    path('sessions/<int:pk>/kaizens/',           views.session_eligible_kaizens_view,   name='session-eligible-kaizens'),
    path('sessions/<int:pk>/attendance/',        views.session_attendance_view,         name='session-attendance'),
    path('sessions/<int:pk>/update-attendance/', views.update_session_attendance_view,  name='session-update-attendance'),
    path('sessions/<int:pk>/submit-ratings/',    views.submit_session_ratings_view,     name='session-submit-ratings'),
    path('sessions/<int:pk>/update-overrides/',  views.update_session_overrides_view,   name='session-update-overrides'),
    path('sessions/<int:pk>/calculate-winners/', views.calculate_session_winners_view,  name='session-calculate-winners'),
    path('sessions/<int:pk>/winners/',           views.session_winners_view,            name='session-winners'),
    path('sessions/<int:pk>/finalize/',          views.finalize_session_view,           name='session-finalize'),
]




