"""
CFT Awards — Business Logic Services (Write layer)
===================================================
All state-mutating operations live here.
Services accept plain Python arguments (not request objects).
"""

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

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




# ─── CftMember Services ───────────────────────────────────────────────────────

def create_cft_member(
    *,
    name: str,
    role: str,
    department: str,
    mini_factory: str = 'MF1',
    employee_id: str | None = None,
    notes: str = '',
    user=None,
    created_by=None,
) -> CftMember:
    """Create a new CFT member and attach to active open sessions."""
    member = CftMember.objects.create(
        name=name,
        role=role,
        department=department,
        mini_factory=mini_factory or 'MF1',
        employee_id=employee_id or None,
        notes=notes,
        user=user,
        created_by=created_by,
    )
    # Sync with any open evaluation sessions
    for s in CFTEvaluationSession.objects.filter(status='OPEN'):
        CFTSessionMember.objects.get_or_create(
            session=s,
            member=member,
            defaults={'present': True, 'marked_by': created_by},
        )
        if isinstance(s.present_member_ids, list) and member.id not in s.present_member_ids:
            s.present_member_ids.append(member.id)
            s.save(update_fields=['present_member_ids', 'updated_at'])

    _audit(actor=created_by, action='CFT_MEMBER_CREATED', detail=f'Created CFT member: {member}')
    return member



def update_cft_member(*, member: CftMember, actor=None, **fields) -> CftMember:
    """Update allowed fields on an existing CftMember."""
    allowed = {'name', 'role', 'department', 'mini_factory', 'employee_id', 'notes', 'is_active'}
    for field, value in fields.items():
        if field in allowed:
            setattr(member, field, value)
    member.save()
    _audit(actor=actor, action='CFT_MEMBER_UPDATED', detail=f'Updated CFT member: {member}')
    return member


def deactivate_cft_member(*, member: CftMember, actor=None) -> CftMember:
    """Soft-delete: set is_active=False."""
    member.is_active = False
    member.save(update_fields=['is_active', 'updated_at'])
    _audit(actor=actor, action='CFT_MEMBER_DEACTIVATED', detail=f'Deactivated: {member}')
    return member


# ─── AwardCycle Services ──────────────────────────────────────────────────────

@transaction.atomic
def create_award_cycle(
    *,
    title: str,
    mini_factory: str,
    month: int,
    year: int,
    session_date=None,
    notes: str = '',
    auto_populate_members: bool = True,
    created_by=None,
) -> AwardCycle:
    """
    Create a new AwardCycle.
    If auto_populate_members=True, pre-create AttendanceRecord rows
    for all currently active members in the same mini_factory.
    """
    cycle = AwardCycle.objects.create(
        title=title,
        mini_factory=mini_factory,
        month=month,
        year=year,
        session_date=session_date,
        notes=notes,
        created_by=created_by,
    )

    if auto_populate_members:
        members = CftMember.objects.filter(mini_factory=mini_factory, is_active=True)
        AttendanceRecord.objects.bulk_create([
            AttendanceRecord(cycle=cycle, member=m, is_present=False)
            for m in members
        ])

    _audit(
        actor=created_by,
        action='AWARD_CYCLE_CREATED',
        detail=f'Created award cycle: {cycle}',
    )
    return cycle


def finalize_award_cycle(*, cycle: AwardCycle, actor=None) -> AwardCycle:
    """Lock a cycle so no further edits to attendance or awards are possible."""
    if cycle.is_finalized:
        raise ValidationError('This award cycle is already finalized.')
    cycle.is_finalized = True
    cycle.save(update_fields=['is_finalized', 'updated_at'])
    _audit(actor=actor, action='AWARD_CYCLE_FINALIZED', detail=f'Finalized: {cycle}')
    return cycle


# ─── Attendance Services ──────────────────────────────────────────────────────

@transaction.atomic
def bulk_update_attendance(
    *,
    cycle: AwardCycle,
    attendance_data: list[dict],
    marked_by=None,
) -> list[AttendanceRecord]:
    """
    Accept a list of {'member_id': int, 'is_present': bool} dicts
    and update (or create) AttendanceRecord rows atomically.
    Raises ValidationError if cycle is finalized.
    """
    if cycle.is_finalized:
        raise ValidationError('Cannot update attendance for a finalized cycle.')

    records = []
    for entry in attendance_data:
        record, _ = AttendanceRecord.objects.update_or_create(
            cycle=cycle,
            member_id=entry['member_id'],
            defaults={
                'is_present': entry['is_present'],
                'marked_by': marked_by,
            },
        )
        records.append(record)

    _audit(
        actor=marked_by,
        action='ATTENDANCE_BULK_UPDATED',
        detail=f'Bulk attendance update for cycle {cycle.id} ({len(records)} records)',
    )
    return records


def toggle_attendance(
    *,
    cycle: AwardCycle,
    member: CftMember,
    is_present: bool,
    marked_by=None,
) -> AttendanceRecord:
    """Toggle attendance for a single member in a cycle."""
    if cycle.is_finalized:
        raise ValidationError('Cannot update attendance for a finalized cycle.')

    record, _ = AttendanceRecord.objects.update_or_create(
        cycle=cycle,
        member=member,
        defaults={'is_present': is_present, 'marked_by': marked_by},
    )
    return record


# ─── Award Services ───────────────────────────────────────────────────────────

def nominate_award(
    *,
    cycle: AwardCycle,
    member: CftMember,
    award_type: str,
    citation: str = '',
    custom_award_label: str = '',
    linked_kaizen=None,
    points: int = 0,
    nominated_by=None,
) -> MonthlyAward:
    """Create a new award nomination."""
    if cycle.is_finalized:
        raise ValidationError('Cannot nominate awards in a finalized cycle.')

    award = MonthlyAward.objects.create(
        cycle=cycle,
        member=member,
        award_type=award_type,
        citation=citation,
        custom_award_label=custom_award_label,
        linked_kaizen=linked_kaizen,
        points=points,
        nominated_by=nominated_by,
        status='nominated',
    )
    _audit(
        actor=nominated_by,
        action='AWARD_NOMINATED',
        detail=f'Nominated {member} for {award.award_label} in {cycle}',
    )
    return award


def approve_award(*, award: MonthlyAward, actor=None) -> MonthlyAward:
    """Approve a pending nomination."""
    award.status = 'approved'
    award.approved_by = actor
    award.approved_at = timezone.now()
    award.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
    _audit(actor=actor, action='AWARD_APPROVED', detail=f'Approved: {award}')
    return award


def reject_award(*, award: MonthlyAward, actor=None) -> MonthlyAward:
    """Reject a nomination."""
    award.status = 'rejected'
    award.save(update_fields=['status', 'updated_at'])
    _audit(actor=actor, action='AWARD_REJECTED', detail=f'Rejected: {award}')
    return award


def delete_award(*, award: MonthlyAward, actor=None) -> None:
    """Remove an award nomination."""
    if award.cycle.is_finalized:
        raise ValidationError('Cannot delete awards from a finalized cycle.')
    _audit(actor=actor, action='AWARD_DELETED', detail=f'Deleted award: {award}')
    award.delete()


# ─── CFTEvaluationSession Services ───────────────────────────────────────────

DEFAULT_AWARD_CATEGORIES = [
    {
        'code': 'MF1',
        'name': 'Minifactory 1 (MF1)',
        'subtitle': 'Vacuum Pump & Sub-Assemblies',
        'winner_count': 1,
        'badge_bg': 'from-amber-500 to-yellow-600 border-amber-400 text-slate-950',
        'order': 1,
    },
    {
        'code': 'MF2',
        'name': 'Minifactory 2 (MF2)',
        'subtitle': 'EGR Valve & Power Cell Lines (2 Winners)',
        'winner_count': 2,
        'badge_bg': 'from-blue-600 to-indigo-700 border-blue-400 text-white',
        'order': 2,
    },
    {
        'code': 'MF3',
        'name': 'Minifactory 3 (MF3)',
        'subtitle': 'Bypass Valve & Smart Sensors',
        'winner_count': 1,
        'badge_bg': 'from-emerald-600 to-teal-700 border-emerald-400 text-white',
        'order': 3,
    },
    {
        'code': 'Machining',
        'name': 'Machining Department',
        'subtitle': 'CNC, Milling, Turning & Tooling Shop',
        'winner_count': 1,
        'badge_bg': 'from-orange-500 to-amber-600 border-amber-400 text-slate-950',
        'order': 4,
    },
    {
        'code': 'Quality',
        'name': 'Quality Department',
        'subtitle': 'QA/QC, Metrology & Inspection Benches',
        'winner_count': 1,
        'badge_bg': 'from-violet-600 to-purple-700 border-purple-400 text-white',
        'order': 5,
    },
    {
        'code': 'Maintenance',
        'name': 'Maintenance Department',
        'subtitle': 'Plant Electrical, Utilities & Automation',
        'winner_count': 1,
        'badge_bg': 'from-rose-600 to-pink-700 border-rose-400 text-white',
        'order': 6,
    },
]


def ensure_default_award_categories() -> list[AwardCategory]:
    """
    Seed initial configurable award categories if none exist.
    Returns the list of active award categories.
    """
    if AwardCategory.objects.filter(is_active=True).exists():
        return list(AwardCategory.objects.filter(is_active=True).order_by('order', 'code'))

    created = []
    for item in DEFAULT_AWARD_CATEGORIES:
        cat, _ = AwardCategory.objects.get_or_create(
            code=item['code'],
            defaults={
                'name': item['name'],
                'subtitle': item['subtitle'],
                'winner_count': item['winner_count'],
                'badge_bg': item['badge_bg'],
                'order': item['order'],
                'is_active': True,
            }
        )
        created.append(cat)
    return created


def resolve_kaizen_category(kaizen: Kaizen) -> str:
    """
    Step 11: Determine the initial category from the Kaizen's existing organizational information.
    Explicit and deterministic category assignment without relying on loose string matching.
    Priority:
      1. Mini-factory code: 'MF1', 'MF2', 'MF3'
      2. Classification: 'Good Point' / 'good_point' -> 'Quality'
      3. Organizational heuristics on area, location, machine:
         - Quality (QA/QC, metrology, inspection, CMM)
         - Maintenance (electrical, utilities, automation, blower, conduit)
         - Machining (CNC, milling, turning, grinding, tooling)
         - Line specific: BPV -> MF3, EGR / Power Cell -> MF2, Vacuum Pump -> MF1
      4. Default fallback: 'MF1'
    """
    # 1. Direct mini-factory designation
    mf_val = str(getattr(kaizen, 'mini_factory', '') or '').strip().upper()
    if mf_val in ('MF1', 'MINI FACTORY 1', 'MINIFACTORY 1'):
        return 'MF1'
    if mf_val in ('MF2', 'MINI FACTORY 2', 'MINIFACTORY 2'):
        return 'MF2'
    if mf_val in ('MF3', 'MINI FACTORY 3', 'MINIFACTORY 3'):
        return 'MF3'

    # 2. Classification
    classification = str(getattr(kaizen, 'classification', '') or '').strip().lower()
    if classification in ('good_point', 'good point'):
        return 'Quality'

    # 3. Contextual search across area, location, machine
    area = str(getattr(kaizen, 'area', '') or '').strip().lower()
    location = str(getattr(kaizen, 'location', '') or '').strip().lower()
    machine = str(getattr(kaizen, 'machine', '') or '').strip().lower()
    combined = f"{area} {location} {machine}"

    # Quality indicators
    if any(q in combined for q in ('quality', 'qa', 'qc', 'metrology', 'cmm', 'inspection')):
        return 'Quality'

    # Maintenance indicators
    if any(m in combined for m in ('maintenance', 'maint', 'utilit', 'electrical', 'automation', 'blower', 'conduit')):
        return 'Maintenance'

    # Machining indicators
    if any(mach in combined for mach in ('machining', 'machin', 'cnc', 'milling', 'turning', 'grind', 'tooling')):
        return 'Machining'

    # Line-level mini-factory indicators
    if any(m3 in combined for m3 in ('bpv', 'bypass valve', 'mf3', 'mini factory 3')):
        return 'MF3'
    if any(m2 in combined for m2 in ('egr', 'power cell', 'mf2', 'mini factory 2')):
        return 'MF2'
    if any(m1 in combined for m1 in ('vacuum pump', 'mf1', 'mini factory 1', 'pune')):
        return 'MF1'

    # 4. Fallback default
    return 'MF1'


# ─── Eligibility Rules ────────────────────────────────────────────────────────

ELIGIBLE_KAIZEN_STATUSES = (
    'approved',
    'good point',
    'good_point',
    'closed',
    'submitted',
    'pending',
)

MONTH_NAME_TO_NUMBER = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
}


def is_kaizen_eligible_for_session(kaizen: Kaizen, session: CFTEvaluationSession) -> bool:
    """
    Step 8: Define the Eligibility Rule in Django.
    A Kaizen is eligible for an evaluation session if:
      1. status is in ('approved', 'good point', 'good_point', 'closed', 'submitted', 'pending')
      2. It belongs to the session's designated month and year.
    """
    # 1. Status eligibility
    status_lower = (kaizen.status or '').strip().lower()
    if status_lower not in ELIGIBLE_KAIZEN_STATUSES:
        return False

    # 2. Month and Year matching
    target_month_str = (session.month or '').strip().lower()
    target_month_num = MONTH_NAME_TO_NUMBER.get(target_month_str)
    target_year = int(session.year)

    # Check explicit month string on Kaizen
    k_month_str = (kaizen.month or '').strip().lower()
    if k_month_str and (k_month_str == target_month_str or target_month_str in k_month_str):
        # Check year if available
        for dt_field in (kaizen.suggestion_date, getattr(kaizen, 'implementation_date', None)):
            if dt_field and hasattr(dt_field, 'year'):
                if dt_field.year == target_year:
                    return True
        for ts_field in (kaizen.created_at, kaizen.submitted_at):
            if ts_field and hasattr(ts_field, 'year'):
                if ts_field.year == target_year:
                    return True
        # If no year is present on dates, month string match suffices
        return True

    # Check date fields against month number and year
    for dt_field in (kaizen.suggestion_date, getattr(kaizen, 'implementation_date', None)):
        if dt_field and hasattr(dt_field, 'month') and hasattr(dt_field, 'year'):
            if dt_field.month == target_month_num and dt_field.year == target_year:
                return True

    for ts_field in (kaizen.created_at, kaizen.submitted_at):
        if ts_field and hasattr(ts_field, 'month') and hasattr(ts_field, 'year'):
            if ts_field.month == target_month_num and ts_field.year == target_year:
                return True

    return False


DEFAULT_CFT_ROSTER = [
    {'name': 'Amit Mehta',     'role': 'Kaizen & Quality Lead', 'department': 'Quality',     'mini_factory': 'MF1'},
    {'name': 'Sunita Rao',     'role': 'Quality Specialist',    'department': 'Quality',     'mini_factory': 'MF1'},
    {'name': 'Rajesh Patil',   'role': 'Plant Supervisor',      'department': 'Operations',  'mini_factory': 'MF1'},
    {'name': 'Arjun Mehra',    'role': 'Automation Lead',       'department': 'Engineering', 'mini_factory': 'MF1'},
    {'name': 'Vijay Deshmukh', 'role': 'Area Leader',           'department': 'Maintenance', 'mini_factory': 'MF1'},
    {'name': 'Sanjay Patil',   'role': 'Process Specialist',    'department': 'Machining',   'mini_factory': 'MF1'},
    {'name': 'Rahul Sharma',   'role': 'Maintenance Lead',      'department': 'Maintenance', 'mini_factory': 'MF1'},
]


def ensure_default_cft_members() -> list[CftMember]:
    """
    Seed initial CFT committee members if the roster is currently empty.
    Returns the list of active members.
    """
    if CftMember.objects.filter(is_active=True).exists():
        return list(CftMember.objects.filter(is_active=True))

    created = []
    for item in DEFAULT_CFT_ROSTER:
        member = CftMember.objects.create(
            name=item['name'],
            role=item['role'],
            department=item['department'],
            mini_factory=item['mini_factory'],
            is_active=True,
        )
        created.append(member)
    return created



@transaction.atomic
def get_or_create_evaluation_session(
    *,
    month: str,
    year: int,
    opened_by=None,
) -> tuple[CFTEvaluationSession, bool]:
    """
    Retrieve or create exactly one CFTEvaluationSession for a given (month, year).
    Ensures UNIQUE(month, year) constraint.
    Auto-populates member roster and default CFTSessionMember rows if new.
    """
    month_clean = str(month).strip().capitalize()
    year_int = int(year)

    # Make sure default roster exists
    active_members = ensure_default_cft_members()
    all_member_ids = [m.id for m in active_members]

    session = CFTEvaluationSession.objects.filter(
        month__iexact=month_clean,
        year=year_int,
    ).first()

    created = False
    if not session:
        user = opened_by if (opened_by and opened_by.is_authenticated) else None
        session = CFTEvaluationSession.objects.create(
            month=month_clean,
            year=year_int,
            opened_by=user,
            status='OPEN',
            present_member_ids=all_member_ids,
            category_overrides={},
        )
        created = True

        # Create CFTSessionMember records for all active members
        CFTSessionMember.objects.bulk_create([
            CFTSessionMember(
                session=session,
                member=m,
                present=True,
                marked_by=user,
            )
            for m in active_members
        ])

        _audit(
            actor=user,
            action='CFT_SESSION_OPENED',
            detail=f'Opened evaluation session for {month_clean} {year_int}',
        )
    else:
        # If session exists but no CFTSessionMember rows exist, seed them
        if not session.session_members.exists():
            for m in active_members:
                CFTSessionMember.objects.get_or_create(
                    session=session,
                    member=m,
                    defaults={'present': True, 'marked_by': session.opened_by},
                )
            if not session.present_member_ids and all_member_ids:
                session.present_member_ids = all_member_ids
                session.save(update_fields=['present_member_ids', 'updated_at'])

    return session, created


@transaction.atomic
def update_session_attendance(
    *,
    session: CFTEvaluationSession,
    present_member_ids: list,
    actor=None,
) -> CFTEvaluationSession:
    """
    Update present CFT member IDs for the session.
    Enforces that at least 1 member must be present.
    Synchronizes CFTSessionMember records.
    """
    if session.status in ('FINALIZED', 'LOCKED'):
        raise ValidationError(f'Cannot update attendance: Session is {session.status}.')

    # Normalize IDs
    clean_ids = [int(i) for i in present_member_ids if str(i).isdigit()]
    if not clean_ids:
        raise ValidationError('At least 1 CFT member must be present for evaluation.')

    # Ensure all active members have a CFTSessionMember record for this session
    active_members = CftMember.objects.filter(is_active=True)
    for m in active_members:
        is_present = m.id in clean_ids
        CFTSessionMember.objects.update_or_create(
            session=session,
            member=m,
            defaults={
                'present': is_present,
                'marked_by': actor if (actor and actor.is_authenticated) else None,
            }
        )

    session.present_member_ids = clean_ids
    session.save(update_fields=['present_member_ids', 'updated_at'])
    _audit(
        actor=actor,
        action='CFT_SESSION_ATTENDANCE_UPDATED',
        detail=f'Updated attendance for {session.month} {session.year}: {len(clean_ids)} present',
    )
    return session



@transaction.atomic
def submit_session_ratings(
    *,
    session: CFTEvaluationSession,
    member_id: int,
    ratings_dict: dict,
    actor=None,
) -> list[CFTRating]:
    """
    Save or update Kaizen star ratings (1..5) by a CFT member for this session.
    ratings_dict is a map of { kaizen_id: star_value }.
    """
    if session.status in ('FINALIZED', 'LOCKED'):
        raise ValidationError(f'Cannot submit ratings: Session is {session.status}.')

    member = CftMember.objects.get(pk=member_id)
    saved_ratings = []

    for kaizen_id, stars in ratings_dict.items():
        rating_obj, _ = CFTRating.objects.update_or_create(
            session=session,
            member=member,
            kaizen_id=int(kaizen_id),
            defaults={'stars': int(stars)},
        )
        saved_ratings.append(rating_obj)

    _audit(
        actor=actor,
        action='CFT_SESSION_RATINGS_SUBMITTED',
        detail=f'Member {member.name} submitted {len(saved_ratings)} ratings in {session.month} {session.year}',
    )
    return saved_ratings


def update_session_overrides(
    *,
    session: CFTEvaluationSession,
    category_overrides: dict,
    actor=None,
) -> CFTEvaluationSession:
    """
    Save manual department/minifactory category overrides for Kaizens in this session.
    """
    if session.status in ('FINALIZED', 'LOCKED'):
        raise ValidationError(f'Cannot update category overrides: Session is {session.status}.')

    session.category_overrides = category_overrides
    session.save(update_fields=['category_overrides', 'updated_at'])
    _audit(
        actor=actor,
        action='CFT_SESSION_OVERRIDES_UPDATED',
        detail=f'Updated category overrides for {session.month} {session.year}',
    )
    return session


def finalize_evaluation_session(
    *,
    session: CFTEvaluationSession,
    actor=None,
) -> CFTEvaluationSession:
    """
    Finalize and lock the evaluation session.
    """
    if session.status == 'FINALIZED':
        raise ValidationError('This evaluation session is already finalized.')

    session.status = 'FINALIZED'
    session.save(update_fields=['status', 'updated_at'])
    _audit(
        actor=actor,
        action='CFT_SESSION_FINALIZED',
        detail=f'Finalized evaluation session {session.month} {session.year}',
    )
    return session


from audit.models import create_audit_log


# ─── Internal helper ──────────────────────────────────────────────────────────

def _audit(actor, action: str, detail: str):
    """Write a single audit log entry using the shared utility. Silently skips on error."""
    _ACTION_MAP = {
        'CFT_MEMBER_CREATED':               'create',
        'CFT_MEMBER_UPDATED':               'update',
        'CFT_MEMBER_DEACTIVATED':           'update',
        'AWARD_CYCLE_CREATED':              'create',
        'AWARD_CYCLE_FINALIZED':            'update',
        'ATTENDANCE_BULK_UPDATED':          'update',
        'AWARD_NOMINATED':                  'create',
        'AWARD_APPROVED':                   'approve',
        'AWARD_REJECTED':                   'reject',
        'AWARD_DELETED':                    'delete',
        'CFT_SESSION_OPENED':               'create',
        'CFT_SESSION_ATTENDANCE_UPDATED':   'update',
        'CFT_SESSION_RATINGS_SUBMITTED':    'vote',
        'CFT_SESSION_OVERRIDES_UPDATED':    'update',
        'CFT_SESSION_FINALIZED':            'update',
    }
    mapped = _ACTION_MAP.get(action, 'update')
    try:
        user = actor if (actor and actor.is_authenticated) else None
        create_audit_log(user=user, action=mapped, remarks=f'[{action}] {detail}')
    except Exception:
        pass


@transaction.atomic
def calculate_monthly_winners(session: CFTEvaluationSession, actor=None) -> dict:
    """
    Calculate and persist the winning Kaizens for a given evaluation session.
    
    1. Loads eligible Kaizens for the session.
    2. Loads valid CFT ratings (only for members present).
    3. Resolves category overrides and groups Kaizens by category.
    4. Ranks Kaizens based on tie-breaking rules.
    5. Persists the top winners in MonthlyAward as PREVIEW.
    """
    from cft_awards.selectors import (
        get_eligible_kaizens_for_session,
        get_all_active_categories,
        get_session_present_member_ids
    )
    from cft_awards.services import resolve_kaizen_category

    # 1. Get categories and their config
    categories = get_all_active_categories()
    cat_winner_counts = {c.code.upper(): c.winner_count for c in categories}
    
    # 2. Get eligible kaizens (no category filter initially)
    kaizens = get_eligible_kaizens_for_session(session)
    
    # 3. Get present members
    present_member_ids = set(get_session_present_member_ids(session.id))
    
    # 4. Load valid ratings for the session
    # A valid rating is from a member who is marked as present.
    ratings_qs = CFTRating.objects.filter(session=session)
    
    # Map Kaizen ID to its score metrics
    # { kaizen_id: {'score': int, 'fives': int} }
    kaizen_scores = {k.id: {'score': 0, 'fives': 0} for k in kaizens}
    
    for r in ratings_qs:
        if r.member_id in present_member_ids and r.kaizen_id in kaizen_scores:
            kaizen_scores[r.kaizen_id]['score'] += r.stars
            if r.stars == 5:
                kaizen_scores[r.kaizen_id]['fives'] += 1

    # 5. Group Kaizens by resolved category
    grouped_kaizens = {}
    
    for k in kaizens:
        cat_code = (
            session.category_overrides.get(str(k.id))
            if (session.category_overrides and str(k.id) in session.category_overrides)
            else resolve_kaizen_category(k)
        ).upper()
        
        if cat_code not in grouped_kaizens:
            grouped_kaizens[cat_code] = []
            
        metrics = kaizen_scores[k.id]
        
        # Tie-breaking sort tuple (Higher is better for sorting)
        # Note: Cost savings are stored as strings (e.g. "1,00,000"), we need to parse them, 
        # or we can assume it's just k.cost_save or similar float field. Assuming float/decimal `cost_save`
        cost_savings = 0
        try:
            if k.cost_save:
                cost_savings = float(str(k.cost_save).replace(',', '').strip())
        except ValueError:
            pass
            
        # For date, earlier is better. We can negate the timestamp or just use ID (lower is earlier).
        # We will use negative ID as proxy for earlier submission.
        grouped_kaizens[cat_code].append({
            'kaizen': k,
            'score': metrics['score'],
            'fives': metrics['fives'],
            'cost_savings': cost_savings,
            'neg_id': -k.id
        })
        
    # 6. Delete existing PREVIEW awards for this session to recalculate
    MonthlyAward.objects.filter(session=session, winner_status='PREVIEW').delete()
    
    # 7. Sort, rank, and save winners
    response_data = {
        'session_id': session.id,
        'categories': []
    }
    
    saved_awards = []
    
    for cat_code, items in grouped_kaizens.items():
        # Sort by: Score (DESC), Fives (DESC), Cost Savings (DESC), Neg_ID (DESC -> meaning lower ID, earlier date)
        items.sort(key=lambda x: (x['score'], x['fives'], x['cost_savings'], x['neg_id']), reverse=True)
        
        winner_count = cat_winner_counts.get(cat_code, 1) # Default to 1 winner if category unknown
        winners = items[:winner_count]
        
        if not winners:
            continue
            
        cat_response = {
            'category': cat_code,
            'winners': []
        }
        
        for idx, w in enumerate(winners):
            rank = idx + 1
            if w['score'] == 0:
                continue # Do not award a kaizen with 0 score
                
            award = MonthlyAward(
                session=session,
                category=cat_code,
                kaizen=w['kaizen'],
                rank=rank,
                score=w['score'],
                winner_status='PREVIEW'
            )
            saved_awards.append(award)
            
            cat_response['winners'].append({
                'kaizen_id': w['kaizen'].id,
                'rank': rank,
                'score': w['score'],
                'fives': w['fives'],
                'status': 'PREVIEW',
                'kaizen': {
                    'id': w['kaizen'].id,
                    'title': w['kaizen'].title,
                    'srNo': w['kaizen'].sr_no,
                    'ideaBy': w['kaizen'].idea_by,
                    'minifactory': getattr(w['kaizen'].mini_factory, 'name', w['kaizen'].mini_factory) if hasattr(w['kaizen'], 'mini_factory') else None,
                    'location': getattr(w['kaizen'].location, 'name', w['kaizen'].location) if hasattr(w['kaizen'], 'location') else None,
                    'costSave': w['kaizen'].cost_save
                }
            })
            
        response_data['categories'].append(cat_response)
        
    # Bulk create new preview winners
    if saved_awards:
        MonthlyAward.objects.bulk_create(saved_awards)
        
    _audit(
        actor=actor,
        action='CFT_SESSION_WINNERS_CALCULATED',
        detail=f'Calculated {len(saved_awards)} preview winners for session {session.month} {session.year}'
    )
        
    return response_data


def get_session_winners(session: CFTEvaluationSession) -> dict:
    """
    Returns the persisted winners for the given session grouped by category.
    Includes both PREVIEW and FINAL winners.
    """
    awards = MonthlyAward.objects.filter(session=session).select_related('kaizen').order_by('category', 'rank')
    
    response_data = {
        'session_id': session.id,
        'categories': []
    }
    
    grouped = {}
    for award in awards:
        if award.category not in grouped:
            grouped[award.category] = []
            
        # Get count of 5-star ratings for the Kaizen to include in output
        # Assuming we can just query it, or we could leave it as 0 since frontend mainly uses the total score and rank
        # It's better to fetch it if needed, but the original requirements don't mandate `fives` in the GET payload.
        # We'll just return what's necessary for the podium.
        grouped[award.category].append({
            'kaizen_id': award.kaizen.id,
            'rank': award.rank,
            'score': award.score,
            'status': award.winner_status,
            'kaizen': {
                'id': award.kaizen.id,
                'title': award.kaizen.title,
                'srNo': award.kaizen.sr_no,
                'ideaBy': award.kaizen.idea_by,
                'minifactory': getattr(award.kaizen.mini_factory, 'name', award.kaizen.mini_factory) if hasattr(award.kaizen, 'mini_factory') else None,
                'location': getattr(award.kaizen.location, 'name', award.kaizen.location) if hasattr(award.kaizen, 'location') else None,
                'costSave': award.kaizen.cost_save
            }
        })
        
    for cat_code, winners in grouped.items():
        response_data['categories'].append({
            'category': cat_code,
            'winners': winners
        })
        
    return response_data

