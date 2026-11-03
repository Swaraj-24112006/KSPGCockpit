from datetime import timedelta
from django.utils import timezone

from redflag.enums import RedFlagType, Category5M
from redflag.storage import presign


def build_ppsr_payload(flag, actor, config):
    """
    Builds the 8D PPSR payload mapping from RedFlag.
    """
    attempt = flag.containment_attempts.filter(is_current=True).first()
    rc = getattr(flag, 'root_cause', None)

    # 1. Problem statement
    action = attempt.action_text if (attempt and attempt.action_text) else "Under quarantine"
    problem_statement = (
        f"Originating from Red Flag {flag.red_flag_no} at {flag.line_name} ({flag.station_name}): "
        f"{flag.description}. Immediate containment action: {action}."
    )

    # 2. Root cause analysis
    if rc and rc.root_cause and rc.root_cause.strip():
        rc_text = rc.root_cause.strip()
    elif rc and any([rc.why1, rc.why2, rc.why3, rc.why4]):
        whys = []
        if rc.why1:
            whys.append(f"1. {rc.why1}")
        if rc.why2:
            whys.append(f"2. {rc.why2}")
        if rc.why3:
            whys.append(f"3. {rc.why3}")
        if rc.why4:
            whys.append(f"4. {rc.why4}")
        rc_text = " ".join(whys)
    else:
        rc_text = ""

    # 3. Permanent corrective action
    perm_action = rc.permanent_action.strip() if (rc and rc.permanent_action) else ""

    # 4. Target date
    if flag.target_date:
        target_date_str = flag.target_date.strftime('%Y-%m-%d')
    else:
        default_days = getattr(config, 'ppsr_default_days', 14)
        target_date_str = (timezone.localdate() + timedelta(days=default_days)).strftime('%Y-%m-%d')

    lead_owner = flag.closure_responsibility.label if flag.closure_responsibility else (flag.qa_custodian_name or "")
    coach = flag.team_leader or ""
    cft = f"{flag.target_department_name} CFT" if flag.target_department_name else ""

    return {
        'title': f"[RF Escalation] {flag.red_flag_no}: {flag.description[:60]}...",
        'problemStatement': problem_statement,
        'rootCauseAnalysis': rc_text,
        'containmentAction': attempt.action_text if (attempt and attempt.action_text) else "",
        'permanentCorrectiveAction': perm_action,
        'validationCheck': "3-shift defect-free production trial required for closure sign-off.",
        'status': "Open",
        'targetDate': target_date_str,
        'leadOwner': lead_owner,
        'coach': coach,
        'cft': cft,
        'responsibility': lead_owner,
        'jiraNumber': f"QA-RF-{flag.red_flag_no}",
        'createdAt': timezone.now().isoformat(),
    }


def build_kaizen_payload(flag, actor, config):
    """
    Builds the Kaizen Poka-Yoke payload mapping from RedFlag.
    Cost fields (costBefore, costAfter, costSavings) must NOT be included.
    """
    rc = getattr(flag, 'root_cause', None)
    closure = getattr(flag, 'closure', None)

    sub_type = flag.red_flag_sub_type or 'Defect'
    title = f"Poka-Yoke: Eliminate {sub_type} ({flag.red_flag_no})"

    rc_text = rc.root_cause.strip() if (rc and rc.root_cause) else ""
    problem_before = f"Defect logged in Red Flag {flag.red_flag_no}: {flag.description}. Root cause: {rc_text}"
    countermeasure_after = rc.permanent_action.strip() if (rc and rc.permanent_action) else ""

    category = "Safety" if flag.red_flag_type == RedFlagType.SAFETY else "Quality"

    photo_before = ""
    if flag.evidence_photo:
        try:
            photo_before = presign(flag.evidence_photo)
        except Exception:
            photo_before = ""

    photo_after = ""
    if closure and closure.closure_evidence:
        try:
            photo_after = presign(closure.closure_evidence)
        except Exception:
            photo_after = ""

    if flag.target_date:
        impl_date = flag.target_date.strftime('%Y-%m-%d')
    else:
        impl_date = timezone.localdate().strftime('%Y-%m-%d')

    lead_owner = flag.closure_responsibility.label if flag.closure_responsibility else (flag.qa_custodian_name or "")

    return {
        'title': title,
        'problemBefore': problem_before,
        'counterMeasureAfter': countermeasure_after,
        'area': flag.line_name or "",
        'line': flag.line_name or "",
        'minifactory': flag.plant_name or "",
        'plant': getattr(flag.plant, 'code', None) or flag.plant_name or "",
        'location': flag.station_name or "",
        'station': flag.station_name or "",
        'machine': flag.station_name or "",
        'teamMembers': lead_owner,
        'category': category,
        'photoBefore': photo_before,
        'photoAfter': photo_after,
        'implementationDate': impl_date,
        'suggestionDate': timezone.localdate().strftime('%Y-%m-%d'),
        'month': timezone.localdate().strftime('%B'),
        'benefits': f"Zero defect escape. Eliminates risk of {sub_type} non-conformance.",
        'status': "Submitted",
        'result': "Permanent poka-yoke in place to prevent repeat failure.",
        'createdAt': timezone.now().isoformat(),
    }


def build_fives_red_tag_payload(flag, actor, config):
    """
    Builds the 5S Red Tag holding area payload mapping from RedFlag.
    """
    attempt = flag.containment_attempts.filter(is_current=True).first()

    # Category mapping: Material -> Raw Material, Machine -> Tooling / Jig, else WIP / Suspect Lot
    is_material = (
        flag.category_5m == Category5M.MATERIAL or 
        flag.red_flag_type == RedFlagType.MATERIAL
    )
    is_machine = (
        flag.category_5m == Category5M.MACHINE or 
        flag.red_flag_type == RedFlagType.MACHINE
    )
    if is_material:
        category = "Raw Material"
    elif is_machine:
        category = "Tooling / Jig"
    else:
        category = "WIP / Suspect Lot"

    suspect_qty = attempt.suspect_qty if attempt else 0
    tagged_by = flag.target_person_name or flag.team_leader or ""
    reason = f"Non-conformance Red Flag: {flag.red_flag_sub_type or flag.description}"

    if flag.target_date:
        deadline_str = flag.target_date.strftime('%Y-%m-%d')
    else:
        disposal_days = getattr(config, 'red_tag_disposal_days', 7)
        deadline_str = (timezone.localdate() + timedelta(days=disposal_days)).strftime('%Y-%m-%d')

    photo_url = ""
    if flag.evidence_photo:
        try:
            photo_url = presign(flag.evidence_photo)
        except Exception:
            photo_url = ""

    today_str = timezone.localdate().strftime('%Y-%m-%d')
    quarantine_loc = (attempt.quarantine_location if attempt and attempt.quarantine_location else "") or f"{flag.station_name} ({flag.plant_name})"

    return {
        'itemCategory': category,
        'category': category,
        'itemDescription': f"Suspect quarantined material from Red Flag {flag.red_flag_no}: {flag.description[:80]}",
        'quantity': suspect_qty,
        'unit': "pcs",
        'area': flag.line_name or "",
        'areaFound': flag.line_name or "",
        'location': quarantine_loc,
        'locationFound': f"{flag.station_name} ({flag.plant_name})",
        'taggedBy': tagged_by,
        'reasonForTagging': reason,
        'reason': reason,
        'disposalDeadline': deadline_str,
        'dispositionDeadline': deadline_str,
        'photoUrl': photo_url,
        'taggedDate': today_str,
        'dateTagged': today_str,
        'status': "Holding",
        'proposedDisposal': "Quarantine Hold & 100% Inspection",
        'daysAged': 0,
    }

