"""
CFT Awards — Selectors (Read-only query layer)
===============================================
All database reads for the CFT Awards domain live here.
Views call selectors; selectors never touch request objects.
"""

from django.db.models import QuerySet, Count, Q
from cft_awards.models import (
    CftMember,
    CFTMember,
    AwardCycle,
    AttendanceRecord,
    MonthlyAward,
    CFTEvaluationSession,
    CFTRating,
    CFTSessionMember,
    AwardCategory,
)
from kaizens.models import Kaizen




# ─── CftMember Selectors ──────────────────────────────────────────────────────

def get_all_active_members(mini_factory: str | None = None) -> QuerySet:
    """Return all active CFT members, optionally filtered by mini_factory."""
    qs = CftMember.objects.filter(is_active=True)
    if mini_factory:
        qs = qs.filter(mini_factory=mini_factory)
    return qs.order_by('department', 'name')


def get_member_by_id(member_id: int) -> CftMember:
    """Fetch a single CftMember by PK. Raises DoesNotExist if not found."""
    return CftMember.objects.get(pk=member_id)


# ─── AwardCycle Selectors ─────────────────────────────────────────────────────

def get_all_cycles(mini_factory: str | None = None) -> QuerySet:
    """Return all award cycles, most recent first."""
    qs = AwardCycle.objects.annotate(
        present_count=Count('attendance_records', filter=Q(attendance_records__is_present=True)),
        award_count=Count('awards'),
    )
    if mini_factory:
        qs = qs.filter(mini_factory=mini_factory)
    return qs.order_by('-year', '-month')


def get_cycle_by_id(cycle_id: int) -> AwardCycle:
    """Fetch a single AwardCycle with prefetched attendance and awards."""
    return (
        AwardCycle.objects
        .prefetch_related(
            'attendance_records__member',
            'awards__member',
            'awards__linked_kaizen',
        )
        .get(pk=cycle_id)
    )


def get_current_cycle(mini_factory: str) -> AwardCycle | None:
    """
    Return the most recent non-finalized cycle for a given mini_factory.
    Returns None if none exists.
    """
    return (
        AwardCycle.objects
        .filter(mini_factory=mini_factory, is_finalized=False)
        .order_by('-year', '-month')
        .first()
    )


# ─── AttendanceRecord Selectors ───────────────────────────────────────────────

def get_attendance_for_cycle(cycle_id: int) -> QuerySet:
    """Return all attendance records for a given cycle."""
    return (
        AttendanceRecord.objects
        .filter(cycle_id=cycle_id)
        .select_related('member')
        .order_by('member__name')
    )


# ─── MonthlyAward Selectors ───────────────────────────────────────────────────

def get_awards_for_cycle(cycle_id: int) -> QuerySet:
    """Return all awards in a cycle, with member and kaizen data."""
    return (
        MonthlyAward.objects
        .filter(cycle_id=cycle_id)
        .select_related('member', 'linked_kaizen', 'nominated_by', 'approved_by')
        .order_by('-created_at')
    )


def get_awards_for_member(member_id: int) -> QuerySet:
    """Return the complete award history for a single CFT member."""
    return (
        MonthlyAward.objects
        .filter(member_id=member_id)
        .select_related('cycle', 'linked_kaizen')
        .order_by('-cycle__year', '-cycle__month')
    )


# ─── CFTEvaluationSession Selectors ───────────────────────────────────────────

def get_evaluation_session(month: str, year: int) -> CFTEvaluationSession | None:
    """
    Retrieve exactly one evaluation session by (month, year).
    Returns None if not found.
    """
    return (
        CFTEvaluationSession.objects
        .prefetch_related(
            'ratings__member',
            'ratings__kaizen',
            'session_members__member',
        )
        .filter(month__iexact=str(month).strip(), year=int(year))
        .first()
    )


def get_evaluation_session_by_id(session_id: int) -> CFTEvaluationSession:
    """Fetch an evaluation session by primary key."""
    return (
        CFTEvaluationSession.objects
        .prefetch_related(
            'ratings__member',
            'ratings__kaizen',
            'session_members__member',
        )
        .get(pk=session_id)
    )


def get_all_evaluation_sessions() -> QuerySet:
    """Return all evaluation sessions ordered by year and date opened."""
    return CFTEvaluationSession.objects.all().order_by('-year', '-opened_at')


# ─── CFTSessionMember Selectors ───────────────────────────────────────────────

def get_session_attendance(session_id: int) -> QuerySet:
    """Return all session membership / attendance records for a session."""
    return (
        CFTSessionMember.objects
        .filter(session_id=session_id)
        .select_related('member', 'marked_by')
        .order_by('member__department', 'member__name')
    )


def get_session_present_member_ids(session_id: int) -> list[int]:
    """Return list of member IDs who are marked present for a session."""
    return list(
        CFTSessionMember.objects
        .filter(session_id=session_id, present=True)
        .values_list('member_id', flat=True)
    )


# ─── AwardCategory & Eligible Kaizens Selectors ───────────────────────────────

def get_all_active_categories() -> QuerySet:
    """Return all active configurable award categories ordered by display order."""
    from cft_awards.services import ensure_default_award_categories
    ensure_default_award_categories()
    return AwardCategory.objects.filter(is_active=True).order_by('order', 'code')


def get_eligible_kaizens_for_session(
    session: CFTEvaluationSession,
    search: str | None = None,
    category: str | None = None,
    benefit: str | None = None,
) -> list[Kaizen]:
    """
    Step 8 & 9: Query Kaizens eligible for that session's month/year.
    Enforces eligibility rule in Django:
      - status in ('approved', 'good point', 'good_point', 'closed', 'submitted', 'pending')
      - month/year matches session.month and session.year
    Applies search, benefit, and category filters.
    """
    from cft_awards.services import (
        ELIGIBLE_KAIZEN_STATUSES,
        MONTH_NAME_TO_NUMBER,
        resolve_kaizen_category,
        is_kaizen_eligible_for_session,
    )

    target_month_str = (session.month or '').strip().lower()
    target_month_num = MONTH_NAME_TO_NUMBER.get(target_month_str)
    target_year = int(session.year)

    # 1. Base status eligibility filter
    status_q = Q()
    for s in ELIGIBLE_KAIZEN_STATUSES:
        status_q |= Q(status__iexact=s)

    # 2. Base month / year filter
    date_q = (
        Q(month__iexact=session.month) |
        Q(month__icontains=session.month)
    )
    if target_month_num:
        date_q |= (
            Q(suggestion_date__month=target_month_num, suggestion_date__year=target_year) |
            Q(created_at__month=target_month_num, created_at__year=target_year) |
            Q(submitted_at__month=target_month_num, submitted_at__year=target_year) |
            Q(implementation_date__month=target_month_num, implementation_date__year=target_year)
        )

    qs = (
        Kaizen.objects
        .filter(status_q & date_q)
        .select_related('benefits', 'created_by')
        .prefetch_related('cft_ratings')
        .order_by('-created_at')
    )

    # 3. Search query filter
    if search and search.strip():
        q_term = search.strip()
        qs = qs.filter(
            Q(sr_no__icontains=q_term) |
            Q(title__icontains=q_term) |
            Q(idea_by__icontains=q_term) |
            Q(location__icontains=q_term) |
            Q(area__icontains=q_term) |
            Q(machine__icontains=q_term)
        )

    # 4. Benefit filter ('p', 'q', 'c', 'd', 's', 'm')
    if benefit and benefit.strip() and benefit.strip().lower() != 'all':
        b_key = benefit.strip().lower()
        benefit_field_map = {
            'p': 'benefits__productivity',
            'q': 'benefits__quality',
            'c': 'benefits__cost',
            'd': 'benefits__delivery',
            's': 'benefits__safety',
            'm': 'benefits__morale',
        }
        field_name = benefit_field_map.get(b_key)
        if field_name:
            qs = qs.filter(**{field_name: True})

    # Double check Python-level eligibility rule
    kaizens = [k for k in qs if is_kaizen_eligible_for_session(k, session)]

    # 5. Category filter (accounts for manual session overrides + resolve_kaizen_category)
    if category and category.strip() and category.strip().lower() != 'all':
        cat_target = category.strip().lower()
        filtered = []
        for k in kaizens:
            assigned = (
                session.category_overrides.get(str(k.id))
                if (session.category_overrides and str(k.id) in session.category_overrides)
                else resolve_kaizen_category(k)
            )
            if assigned.lower() == cat_target:
                filtered.append(k)
        kaizens = filtered

    return kaizens



