import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from django.db.models import (
    Q, Count, Sum, Avg, F, Case, When, Value, CharField, IntegerField,
    OuterRef, Subquery
)
from django.db.models.functions import Coalesce
from django.utils import timezone

from redflag.models import (
    RedFlag, RedFlagContainment, SustenanceCheck, RedFlagClosure,
    StageHistory, RedFlagConfig, Department, Plant, Employee
)
from redflag.enums import (
    Status, ContainmentStatus, CheckStatus, Category5M, RedFlagType,
    EscalationModule, AttachmentKind
)
from redflag.storage import presign
from redflag.permissions import allowed_actions


KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


def parse_analytics_filters(params, base_qs=None):
    """
    Parses request query params and returns a filtered RedFlag QuerySet.
    Handles: plant, originatorDept, targetDept, defectType, category5M,
             severity, status, dateFrom, dateTo (IST dates on raised_at), search.
    """
    if base_qs is None:
        qs = RedFlag.objects.filter(deleted_at__isnull=True)
    else:
        qs = base_qs.filter(deleted_at__isnull=True)

    if not params:
        return qs

    # 1. Plant filter
    plant = params.get('plant')
    if plant and plant != 'ALL':
        try:
            val_uuid = uuid.UUID(str(plant))
            qs = qs.filter(plant_id=val_uuid)
        except (ValueError, TypeError):
            qs = qs.filter(Q(plant__code__iexact=plant) | Q(plant_name__iexact=plant))

    # 2. Originator Department filter
    orig_dept = params.get('originatorDept')
    if orig_dept and orig_dept != 'ALL':
        try:
            val_uuid = uuid.UUID(str(orig_dept))
            qs = qs.filter(raised_by_department_id=val_uuid)
        except (ValueError, TypeError):
            qs = qs.filter(
                Q(raised_by_department_name__iexact=orig_dept) |
                Q(raised_by_department__code__iexact=orig_dept) |
                Q(raised_by_department_name__icontains=orig_dept)
            )

    # 3. Target Department filter
    target_dept = params.get('targetDept')
    if target_dept and target_dept != 'ALL':
        try:
            val_uuid = uuid.UUID(str(target_dept))
            qs = qs.filter(target_department_id=val_uuid)
        except (ValueError, TypeError):
            qs = qs.filter(
                Q(target_department_name__iexact=target_dept) |
                Q(target_department__code__iexact=target_dept) |
                Q(target_department_name__icontains=target_dept)
            )

    # 4. Defect Type filter
    defect_type = params.get('defectType')
    if defect_type and defect_type != 'ALL':
        qs = qs.filter(red_flag_type__iexact=defect_type)

    # 5. Category 5M filter
    cat_5m = params.get('category5M')
    if cat_5m and cat_5m != 'ALL':
        qs = qs.filter(category_5m__iexact=cat_5m)

    # 6. Severity filter
    severity = params.get('severity')
    if severity and severity != 'ALL':
        qs = qs.filter(severity__icontains=severity)

    # 7. Status filter
    status = params.get('status')
    if status and status != 'ALL':
        if status == 'Open':
            qs = qs.filter(status=Status.OPEN)
        elif status == 'Contained':
            qs = qs.filter(status=Status.CONTAINED)
        elif status == 'In-Progress':
            qs = qs.filter(status=Status.IN_PROGRESS)
        elif status in ('Sustenance', 'Under-Sustenance'):
            qs = qs.filter(
                Q(status=Status.UNDER_SUSTENANCE) |
                (Q(sustenance_start_date__isnull=False) & ~Q(status=Status.CLOSED))
            )
        elif status == 'Closed':
            qs = qs.filter(status=Status.CLOSED)
        else:
            qs = qs.filter(status__iexact=status)

    # 8. Date Range filter (IST dates on raised_at)
    date_from = params.get('dateFrom')
    if date_from:
        try:
            d = datetime.strptime(str(date_from), '%Y-%m-%d')
            start_dt = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=KOLKATA_TZ)
            qs = qs.filter(raised_at__gte=start_dt)
        except (ValueError, TypeError):
            pass

    date_to = params.get('dateTo')
    if date_to:
        try:
            d = datetime.strptime(str(date_to), '%Y-%m-%d')
            end_dt = datetime(d.year, d.month, d.day, 23, 59, 59, 999999, tzinfo=KOLKATA_TZ)
            qs = qs.filter(raised_at__lte=end_dt)
        except (ValueError, TypeError):
            pass

    # 9. Free-text search
    search = params.get('search')
    if search:
        s = str(search).strip()
        qs = qs.filter(
            Q(red_flag_no__icontains=s) |
            Q(description__icontains=s) |
            Q(station_name__icontains=s) |
            Q(target_person_name__icontains=s)
        )

    return qs


def get_dashboard_analytics(qs):
    """
    Computes all analytics blocks for GET /api/redflags/analytics/dashboard
    using SQL aggregations. No Python loops over the full table.
    """
    config = RedFlagConfig.get_config()
    sla_minutes = getattr(config, 'containment_sla_minutes', 120)

    # 1. KPIs
    kpi_agg = qs.aggregate(
        total=Count('id'),
        openCount=Count('id', filter=Q(status=Status.OPEN)),
        unresolvedCount=Count('id', filter=~Q(status=Status.CLOSED)),
        containedCount=Count('id', filter=Q(status=Status.CONTAINED)),
        inProgressCount=Count('id', filter=Q(status=Status.IN_PROGRESS)),
        underSustenanceCount=Count('id', filter=Q(status=Status.UNDER_SUSTENANCE)),
        closedCount=Count('id', filter=Q(status=Status.CLOSED)),
        closedSustainedCount=Count('id', filter=Q(status=Status.CLOSED, sustenance_achieved=True)),
        criticalCount=Count('id', filter=Q(severity__icontains='Critical')),
        stage1PendingTarget=Count('id', filter=Q(status=Status.OPEN)),
        stage2PendingQuality=Count(
            'id',
            filter=Q(
                status=Status.CONTAINED,
                containment_attempts__is_current=True
            ) & ~Q(containment_attempts__status=ContainmentStatus.VERIFIED)
        ),
        containmentVerifiedCount=Count(
            'id',
            filter=Q(
                containment_attempts__is_current=True,
                containment_attempts__status=ContainmentStatus.VERIFIED
            ) | Q(status__in=[Status.UNDER_SUSTENANCE, Status.CLOSED]),
            distinct=True
        ),
        linkedPpsrCount=Count('id', filter=Q(escalation_links__target_module=EscalationModule.PPSR), distinct=True),
        linkedKaizenCount=Count('id', filter=Q(escalation_links__target_module=EscalationModule.KAIZEN), distinct=True),
        linkedFiveSCount=Count('id', filter=Q(escalation_links__target_module=EscalationModule.FIVES_RED_TAG), distinct=True),
    )

    total = kpi_agg['total'] or 0
    stage1_pending = kpi_agg['stage1PendingTarget'] or 0
    containment_rate_pct = round(((total - stage1_pending) / total) * 100) if total > 0 else 100

    kpis = {
        'total': total,
        'openCount': kpi_agg['openCount'] or 0,
        'unresolvedCount': kpi_agg['unresolvedCount'] or 0,
        'containedCount': kpi_agg['containedCount'] or 0,
        'inProgressCount': kpi_agg['inProgressCount'] or 0,
        'underSustenanceCount': kpi_agg['underSustenanceCount'] or 0,
        'closedCount': kpi_agg['closedCount'] or 0,
        'closedSustainedCount': kpi_agg['closedSustainedCount'] or 0,
        'criticalCount': kpi_agg['criticalCount'] or 0,
        'stage1PendingTarget': stage1_pending,
        'stage2PendingQuality': kpi_agg['stage2PendingQuality'] or 0,
        'containmentVerifiedCount': kpi_agg['containmentVerifiedCount'] or 0,
        'containmentRatePct': containment_rate_pct,
        'linkedPpsrCount': kpi_agg['linkedPpsrCount'] or 0,
        'linkedKaizenCount': kpi_agg['linkedKaizenCount'] or 0,
        'linkedFiveSCount': kpi_agg['linkedFiveSCount'] or 0,
    }

    # 2. Quarantine: real sums (nulls count as 0)
    quarantine_agg = RedFlagContainment.objects.filter(
        red_flag__in=qs, is_current=True
    ).aggregate(
        suspectQtyQuarantined=Coalesce(Sum('suspect_qty'), 0),
        sortingQtyInspected=Coalesce(Sum('sorting_inspected'), 0),
        sortingQtyOk=Coalesce(Sum('sorting_ok'), 0),
        sortingQtyRejected=Coalesce(Sum('sorting_rejected'), 0),
    )

    quarantine = {
        'suspectQtyQuarantined': quarantine_agg['suspectQtyQuarantined'] or 0,
        'sortingQtyInspected': quarantine_agg['sortingQtyInspected'] or 0,
        'sortingQtyOk': quarantine_agg['sortingQtyOk'] or 0,
        'sortingQtyRejected': quarantine_agg['sortingQtyRejected'] or 0,
    }

    # 3. TimeGap
    time_agg = RedFlagContainment.objects.filter(
        red_flag__in=qs, is_current=True, gap_minutes__isnull=False
    ).aggregate(
        completedCount=Count('id'),
        avgMinutes=Coalesce(Avg('gap_minutes'), 0.0),
        under30m=Count('id', filter=Q(gap_minutes__lte=30)),
        from30to60m=Count('id', filter=Q(gap_minutes__gt=30, gap_minutes__lte=60)),
        from60to120m=Count('id', filter=Q(gap_minutes__gt=60, gap_minutes__lte=120)),
        over120m=Count('id', filter=Q(gap_minutes__gt=120)),
        withinSlaCount=Count('id', filter=Q(gap_minutes__lte=sla_minutes)),
    )

    completed_gap_count = time_agg['completedCount'] or 0
    avg_minutes = round(time_agg['avgMinutes'] or 0)
    within_sla_count = time_agg['withinSlaCount'] or 0
    sla_compliance_pct = round((within_sla_count / completed_gap_count) * 100) if completed_gap_count > 0 else 100

    if completed_gap_count == 0:
        avg_label = "N/A"
    else:
        hrs = avg_minutes // 60
        rem_mins = avg_minutes % 60
        avg_label = f"{hrs}h {rem_mins}m" if hrs > 0 else f"{rem_mins}m"

    time_gap = {
        'avgMinutes': avg_minutes,
        'avgLabel': avg_label,
        'slaMinutes': sla_minutes,
        'slaCompliancePct': sla_compliance_pct,
        'completedCount': completed_gap_count,
        'buckets': {
            'under30m': time_agg['under30m'] or 0,
            'from30to60m': time_agg['from30to60m'] or 0,
            'from60to120m': time_agg['from60to120m'] or 0,
            'over120m': time_agg['over120m'] or 0,
            'pending': max(0, total - completed_gap_count),
        }
    }

    # 4. Pareto 5M
    standard_5m = ['Machine', 'Method', 'Material', 'Man', 'Measurement', 'Environment']
    cat_expr = Case(
        When(category_5m__in=standard_5m, then=F('category_5m')),
        default=Value('Unclassified'),
        output_field=CharField()
    )

    # Base counts for flags in qs
    cat_counts = qs.annotate(cat_group=cat_expr).values('cat_group').annotate(
        count=Count('id')
    )
    cat_count_map = {row['cat_group']: row['count'] for row in cat_counts}

    # Quarantined sums from current containments
    cat_quarantine = RedFlagContainment.objects.filter(
        red_flag__in=qs, is_current=True
    ).annotate(
        cat_group=Case(
            When(red_flag__category_5m__in=standard_5m, then=F('red_flag__category_5m')),
            default=Value('Unclassified'),
            output_field=CharField()
        )
    ).values('cat_group').annotate(
        quarantined=Coalesce(Sum('suspect_qty'), 0)
    )
    cat_quarantine_map = {row['cat_group']: row['quarantined'] for row in cat_quarantine}

    all_cats = list(standard_5m)
    if 'Unclassified' in cat_count_map and cat_count_map['Unclassified'] > 0:
        all_cats.append('Unclassified')

    raw_pareto = []
    for cat in all_cats:
        c = cat_count_map.get(cat, 0)
        q = cat_quarantine_map.get(cat, 0)
        raw_pareto.append({
            'category': cat,
            'count': c,
            'quarantined': q,
        })
    raw_pareto.sort(key=lambda x: x['count'], reverse=True)

    running_sum = 0
    pareto_5m = []
    for item in raw_pareto:
        running_sum += item['count']
        pct = round((item['count'] / total) * 100) if total > 0 else 0
        cum_pct = round((running_sum / total) * 100) if total > 0 else 0
        pareto_5m.append({
            'category': item['category'],
            'count': item['count'],
            'quarantined': item['quarantined'],
            'pct': pct,
            'cumulativePct': cum_pct,
        })

    # 5. Defect Types
    standard_types = ['Quality', 'Machine', 'Process', 'Safety', 'Material', '5S']
    type_counts = qs.values('red_flag_type').annotate(
        count=Count('id'),
        open=Count('id', filter=Q(status=Status.OPEN)),
    )
    type_count_map = {row['red_flag_type']: row for row in type_counts}

    type_quarantine = RedFlagContainment.objects.filter(
        red_flag__in=qs, is_current=True
    ).values('red_flag__red_flag_type').annotate(
        quarantined=Coalesce(Sum('suspect_qty'), 0)
    )
    type_quarantine_map = {row['red_flag__red_flag_type']: row['quarantined'] for row in type_quarantine}

    defect_types = []
    for t in standard_types:
        info = type_count_map.get(t, {'count': 0, 'open': 0})
        cnt = info['count']
        op = info['open']
        quar = type_quarantine_map.get(t, 0)
        pct = round((cnt / total) * 100) if total > 0 else 0
        defect_types.append({
            'type': t,
            'count': cnt,
            'open': op,
            'quarantined': quar,
            'pct': pct,
        })
    defect_types.sort(key=lambda x: x['count'], reverse=True)

    # 6. Department Matrix (Originator x Target by department ID)
    matrix_cells = qs.values(
        'raised_by_department__id',
        'raised_by_department_name',
        'target_department__id',
        'target_department_name'
    ).annotate(count=Count('id'))

    dept_matrix_map = {}
    cell_list = []
    for row in matrix_cells:
        orig_name = row['raised_by_department_name']
        tgt_name = row['target_department_name']
        cnt = row['count']
        if orig_name not in dept_matrix_map:
            dept_matrix_map[orig_name] = {}
        dept_matrix_map[orig_name][tgt_name] = cnt

        cell_list.append({
            'originatorId': str(row['raised_by_department__id']) if row['raised_by_department__id'] else None,
            'originatorName': orig_name,
            'targetId': str(row['target_department__id']) if row['target_department__id'] else None,
            'targetName': tgt_name,
            'count': cnt,
        })

    department_matrix = {
        'cells': cell_list,
        'matrix': dept_matrix_map,
    }

    # 7. Target Persons (Top 10)
    tp_qs = qs.values(
        'target_person__id',
        'target_person_name',
        'target_department_name'
    ).annotate(
        totalAssigned=Count('id'),
        open=Count('id', filter=Q(status=Status.OPEN)),
        closed=Count('id', filter=Q(status=Status.CLOSED)),
    ).order_by('-totalAssigned')[:10]

    tp_ids = [row['target_person__id'] for row in tp_qs if row['target_person__id']]

    # Quarantine and gap stats for these target persons
    tp_containment = RedFlagContainment.objects.filter(
        red_flag__in=qs,
        red_flag__target_person_id__in=tp_ids,
        is_current=True
    ).values('red_flag__target_person_id').annotate(
        quarantinedPcs=Coalesce(Sum('suspect_qty'), 0),
        completedGaps=Count('id', filter=Q(gap_minutes__isnull=False)),
        withinSla=Count('id', filter=Q(gap_minutes__lte=sla_minutes)),
        avgGap=Coalesce(Avg('gap_minutes'), 0.0),
    )
    tp_cont_map = {row['red_flag__target_person_id']: row for row in tp_containment}

    target_persons = []
    for row in tp_qs:
        pid = row['target_person__id']
        cont_info = tp_cont_map.get(pid, {})
        q_pcs = cont_info.get('quarantinedPcs', 0)
        c_gaps = cont_info.get('completedGaps', 0)
        w_sla = cont_info.get('withinSla', 0)
        avg_g = round(cont_info.get('avgGap', 0.0))
        sla_pct = round((w_sla / c_gaps) * 100) if c_gaps > 0 else 100

        target_persons.append({
            'id': str(pid) if pid else None,
            'name': row['target_person_name'],
            'department': row['target_department_name'],
            'totalAssigned': row['totalAssigned'],
            'open': row['open'],
            'closed': row['closed'],
            'quarantinedPcs': q_pcs,
            'averageGap': avg_g,
            'withinSlaPct': sla_pct,
        })

    # 8. Station Hotspots (Top 6) with Mode 5M Category computed in SQL
    station_rows = qs.values(
        'station__id',
        'station_name',
        'line_name',
        'plant_name',
        'plant__code'
    ).annotate(
        count=Count('id'),
        open=Count('id', filter=Q(status=Status.OPEN)),
    ).order_by('-count')[:6]

    st_ids = [row['station__id'] for row in station_rows if row['station__id']]

    # Quarantined per station
    st_quarantine = RedFlagContainment.objects.filter(
        red_flag__in=qs,
        red_flag__station_id__in=st_ids,
        is_current=True
    ).values('red_flag__station_id').annotate(
        quarantined=Coalesce(Sum('suspect_qty'), 0)
    )
    st_quar_map = {row['red_flag__station_id']: row['quarantined'] for row in st_quarantine}

    # Dominant 5M mode per station via SQL group by
    st_5m = qs.filter(station_id__in=st_ids).values(
        'station_id', 'category_5m'
    ).annotate(
        cat_count=Count('id')
    ).order_by('station_id', '-cat_count')

    dominant_5m_map = {}
    for entry in st_5m:
        sid = entry['station_id']
        if sid not in dominant_5m_map and entry['category_5m']:
            dominant_5m_map[sid] = entry['category_5m']

    station_hotspots = []
    for row in station_rows:
        sid = row['station__id']
        station_hotspots.append({
            'station': row['station_name'],
            'line': row['line_name'],
            'plant': row['plant_name'],
            'plantCode': row['plant__code'] or row['plant_name'],
            'count': row['count'],
            'open': row['open'],
            'quarantined': st_quar_map.get(sid, 0),
            'dominant5M': dominant_5m_map.get(sid, 'Machine'),
        })

    # 9. Sustenance Cohort (Months 1, 2, 3)
    def _cohort_month(m_num):
        checks = SustenanceCheck.objects.filter(red_flag__in=qs, month=m_num)
        chk_count = checks.filter(status__in=[CheckStatus.PASSED, CheckStatus.RECURRENCE_DETECTED]).count()
        pass_count = checks.filter(status=CheckStatus.PASSED).count()
        rate = round((pass_count / chk_count) * 100) if chk_count > 0 else 100
        return {
            'checked': chk_count,
            'passed': pass_count,
            'passRate': rate,
        }

    cohort_m1 = _cohort_month(1)
    cohort_m2 = _cohort_month(2)
    cohort_m3 = _cohort_month(3)

    items_with_sustenance = qs.filter(sustenance_start_date__isnull=False).count()
    sustained_success_count = qs.filter(sustenance_start_date__isnull=False).filter(
        Q(sustenance_achieved=True) |
        Q(sustenance_checks__month=3, sustenance_checks__status=CheckStatus.PASSED)
    ).distinct().count()

    overall_rate = round((sustained_success_count / items_with_sustenance) * 100) if items_with_sustenance > 0 else 100

    sustenance_cohort = {
        'month1': cohort_m1,
        'month2': cohort_m2,
        'month3': cohort_m3,
        'itemsWithSustenance': items_with_sustenance,
        'overallSuccessCount': sustained_success_count,
        'overallSuccessRate': overall_rate,
    }

    # 10. Drill Records (Capped at 5000 with truncated flag)
    drill_data = _build_drill_records(qs)

    return {
        'kpis': kpis,
        'quarantine': quarantine,
        'timeGap': time_gap,
        'pareto5M': pareto_5m,
        'defectTypes': defect_types,
        'departmentMatrix': department_matrix,
        'targetPersons': target_persons,
        'stationHotspots': station_hotspots,
        'sustenanceCohort': sustenance_cohort,
        'drillRecords': drill_data,
    }


def _build_drill_records(qs):
    """
    Constructs the 5000-capped drill down dataset in SfcStandardRecord shape.
    Uses SQL Subquery and .values() to eliminate ORM instantiation overhead.
    """
    current_cont_qty = RedFlagContainment.objects.filter(
        red_flag=OuterRef('pk'), is_current=True
    ).values('suspect_qty')[:1]

    drill_qs = qs.annotate(
        current_suspect_qty=Coalesce(Subquery(current_cont_qty), 0)
    ).values(
        'id', 'red_flag_no', 'description', 'plant__code', 'plant_name',
        'line_name', 'category_5m', 'red_flag_type', 'target_person_name',
        'raised_by_name', 'status', 'raised_at', 'current_suspect_qty'
    ).order_by('-raised_at')[:5001]

    raw_drill = list(drill_qs)
    truncated = len(raw_drill) > 5000
    display_drill = raw_drill[:5000]

    drill_records = []
    for row in display_drill:
        st = row['status']
        drill_status = 'Completed' if st == Status.CLOSED else ('Open' if st == Status.OPEN else 'In-Progress')
        drill_records.append({
            'id': str(row['id']),
            'code': row['red_flag_no'],
            'title': row['description'],
            'level1': row['plant__code'] or row['plant_name'],
            'level2': row['line_name'],
            'level3': row['category_5m'] or row['red_flag_type'] or 'Method',
            'owner': row['target_person_name'] or row['raised_by_name'],
            'status': drill_status,
            'rawStatus': st,
            'period': row['raised_at'].strftime('%Y-%m-%d') if row['raised_at'] else '',
            'metricValue': row['current_suspect_qty'],
        })

    return {
        'records': drill_records,
        'truncated': truncated,
        'totalCount': len(drill_records),
    }


def get_executive_analytics(qs):
    """
    Computes analytics block for GET /api/redflags/analytics/executive
    Used by the presentation deck in RedFlagSystem.
    """
    score_agg = qs.aggregate(
        total=Count('id'),
        open_count=Count('id', filter=Q(status=Status.OPEN)),
        in_sustenance=Count(
            'id',
            filter=Q(status=Status.UNDER_SUSTENANCE) |
                   (Q(sustenance_start_date__isnull=False) & ~Q(status=Status.CLOSED))
        ),
        closed_sustained=Count('id', filter=Q(status=Status.CLOSED, sustenance_achieved=True))
    )
    total = score_agg['total'] or 0
    open_count = score_agg['open_count'] or 0
    in_sustenance = score_agg['in_sustenance'] or 0
    closed_sustained = score_agg['closed_sustained'] or 0
    containment_rate = round(((total - open_count) / total) * 100) if total > 0 else 100

    scorecard = {
        'total': total,
        'open': open_count,
        'inSustenance': in_sustenance,
        'closedSustained': closed_sustained,
        'containmentRate': containment_rate,
    }

    # Top 4 active alerts with presigned evidence photos
    active_qs = qs.filter(
        status__in=[Status.OPEN, Status.CONTAINED]
    ).select_related('evidence_photo').prefetch_related('containment_attempts').order_by('-raised_at')[:4]

    active_alerts = []
    for rf in active_qs:
        curr_cont = None
        for a in rf.containment_attempts.all():
            if a.is_current:
                curr_cont = a
                break

        photo_url = ""
        if rf.evidence_photo:
            try:
                photo_url = presign(rf.evidence_photo)
            except Exception:
                photo_url = ""

        active_alerts.append({
            'id': str(rf.id),
            'redFlagNo': rf.red_flag_no,
            'stationName': rf.station_name,
            'lineName': rf.line_name,
            'severity': rf.severity,
            'redFlagDescription': rf.description,
            'raisedByDepartment': rf.raised_by_department_name,
            'targetDepartment': rf.target_department_name,
            'suspectQtyQuarantined': curr_cont.suspect_qty if curr_cont else 0,
            'status': rf.status,
            'evidencePhoto': photo_url,
        })

    # Sustenance Table (flags currently under sustenance)
    sustenance_qs = qs.filter(
        Q(status=Status.UNDER_SUSTENANCE) |
        (Q(sustenance_start_date__isnull=False) & ~Q(status=Status.CLOSED))
    ).prefetch_related('sustenance_checks').order_by('-raised_at')[:10]

    sustenance_table = []
    for rf in sustenance_qs:
        cycle = rf.sustenance_cycle or 1
        checks = {c.month: c for c in rf.sustenance_checks.all() if c.cycle_no == cycle}

        def _fmt(chk):
            if not chk:
                return {'status': 'Scheduled', 'scheduledDate': None}
            return {
                'status': chk.status,
                'scheduledDate': chk.scheduled_date.strftime('%Y-%m-%d') if chk.scheduled_date else None,
            }

        sustenance_table.append({
            'id': str(rf.id),
            'redFlagNo': rf.red_flag_no,
            'stationName': rf.station_name,
            'sustenanceStartDate': rf.sustenance_start_date.strftime('%Y-%m-%d') if rf.sustenance_start_date else (rf.raised_at.strftime('%Y-%m-%d') if rf.raised_at else ''),
            'month1Check': _fmt(checks.get(1)),
            'month2Check': _fmt(checks.get(2)),
            'month3Check': _fmt(checks.get(3)),
            'sustenanceAchieved': rf.sustenance_achieved,
            'qaCustodian': rf.qa_custodian_name or 'QA Custodian',
        })

    # 5M breakdown
    standard_5m = ['Method', 'Machine', 'Material', 'Man', 'Measurement', 'Environment']
    cat_counts = qs.values('category_5m').annotate(count=Count('id'))
    cat_map = {row['category_5m']: row['count'] for row in cat_counts}

    breakdown_5m = []
    for cat in standard_5m:
        cnt = cat_map.get(cat, 0)
        pct = round((cnt / total) * 100) if total > 0 else 0
        breakdown_5m.append({
            'category': cat,
            'count': cnt,
            'pct': pct,
        })

    # Accountability Flow: top originator -> target department pairs
    flow_rows = qs.values(
        'raised_by_department_name', 'target_department_name'
    ).annotate(
        count=Count('id')
    ).order_by('-count')[:5]

    accountability_flow = []
    for row in flow_rows:
        orig = row['raised_by_department_name']
        tgt = row['target_department_name']
        cnt = row['count']

        # Most frequent sub-types for this pair
        sub_types = qs.filter(
            raised_by_department_name=orig, target_department_name=tgt
        ).exclude(
            Q(red_flag_sub_type__isnull=True) | Q(red_flag_sub_type='')
        ).values('red_flag_sub_type').annotate(st_cnt=Count('id')).order_by('-st_cnt')[:3]

        frequent = [st['red_flag_sub_type'] for st in sub_types]
        desc = ", ".join(frequent) if frequent else "Non-conformance items"

        accountability_flow.append({
            'originator': orig,
            'target': tgt,
            'flow': f"{orig} ➔ {tgt}",
            'count': cnt,
            'desc': desc,
            'frequentSubTypes': frequent,
        })

    return {
        'scorecard': scorecard,
        'activeAlerts': active_alerts,
        'sustenanceTable': sustenance_table,
        'breakdown5M': breakdown_5m,
        'accountabilityFlow': accountability_flow,
    }


def get_summary_analytics(qs):
    """
    Computes summary block for GET /api/redflags/analytics/summary
    Used by the Global Dashboard and sidebar badge in App.tsx.
    """
    status_counts = qs.values('status').annotate(count=Count('id'))
    by_status = {
        Status.OPEN: 0,
        Status.CONTAINED: 0,
        Status.IN_PROGRESS: 0,
        Status.UNDER_SUSTENANCE: 0,
        Status.CLOSED: 0,
    }
    for row in status_counts:
        st = row['status']
        if st in by_status:
            by_status[st] = row['count']
        else:
            by_status[st] = row['count']

    open_count = by_status.get(Status.OPEN, 0)
    closed_count = by_status.get(Status.CLOSED, 0)
    unresolved_count = qs.exclude(status=Status.CLOSED).count()
    # Sidebar badge: Open + In-Progress (Decision 5)
    sidebar_badge = open_count + by_status.get(Status.IN_PROGRESS, 0)

    # Drill records for global dashboard (capped at 5000)
    drill_data = _build_drill_records(qs)

    return {
        'byStatus': by_status,
        'openCount': open_count,
        'unresolvedCount': unresolved_count,
        'closedCount': closed_count,
        'sidebarBadge': sidebar_badge,
        'drillRecords': drill_data,
    }


def get_presentation_data(flag, user, filter_params=None):
    """
    Computes presentation data for GET /api/redflags/:id/presentation.
    Returns:
      - flat flag (read serializer payload)
      - four stage blocks (Stage 1..4) with completed, actor, completedAt, photos, fields
      - queue of flags matching same filter criteria
      - allowedActions for the current user
    """
    from redflag.serializers import RedFlagReadSerializer

    # 1. Flat flag
    flat_flag = RedFlagReadSerializer(flag).data

    # 2. Stage History lookup
    sh_list = list(flag.stage_history.order_by('completed_at'))
    sh_by_stage = {entry.stage: entry for entry in sh_list}

    # Current containment attempt
    curr_attempt = flag.containment_attempts.filter(is_current=True).first()
    rc = getattr(flag, 'root_cause', None)
    closure = getattr(flag, 'closure', None)

    # Stage 1: Initiator Form
    sh1 = sh_by_stage.get('Detection')
    t0_photo = ""
    if flag.evidence_photo:
        try:
            t0_photo = presign(flag.evidence_photo)
        except Exception:
            t0_photo = ""

    stage1 = {
        'stageNumber': 1,
        'title': "1. Initiator Form",
        'subtitle': "Point-of-Defect & Problem Anomaly (T0 Photo)",
        'role': "Initiator (Originator)",
        'completed': True,
        'actor': sh1.completed_by if sh1 else flag.raised_by_name,
        'completedAt': (sh1.completed_at.isoformat() if sh1 else flag.raised_at.isoformat()) if flag.raised_at else None,
        'photos': [{'kind': 'T0_EVIDENCE', 'url': t0_photo}] if t0_photo else [],
        'fields': {
            'raisedBy': flag.raised_by_name,
            'raisedByDepartment': flag.raised_by_department_name,
            'raisedByRole': flag.raised_by_role,
            'raisedDate': flag.raised_at.strftime('%Y-%m-%d') if flag.raised_at else '',
            'raisedTimestamp': flag.raised_at.strftime('%Y-%m-%d %H:%M') if flag.raised_at else '',
            'mfName': flag.plant_name,
            'lineAreaName': flag.line_name,
            'stationName': flag.station_name,
            'modelName': flag.model_name,
            'redFlagType': flag.red_flag_type,
            'redFlagSubType': flag.red_flag_sub_type,
            'severity': flag.severity,
            'category5M': flag.category_5m,
            'redFlagDescription': flag.description,
            'targetDepartment': flag.target_department_name,
            'targetPerson': flag.target_person_name,
            'teamLeader': flag.team_leader,
        }
    }

    # Stage 2: Containment Action
    sh2 = sh_by_stage.get('Containment')
    t1_photo = ""
    if curr_attempt and curr_attempt.photo:
        try:
            t1_photo = presign(curr_attempt.photo)
        except Exception:
            t1_photo = ""

    s2_completed = curr_attempt is not None and curr_attempt.status in (ContainmentStatus.CONTAINED, ContainmentStatus.VERIFIED)

    stage2 = {
        'stageNumber': 2,
        'title': "2. Containment Action",
        'subtitle': "Immediate Quarantine & Containment Photo (T1 Photo)",
        'role': "Target Person",
        'completed': s2_completed,
        'actor': (sh2.completed_by if sh2 else curr_attempt.action_taken_by_name) if curr_attempt else "",
        'completedAt': (sh2.completed_at.isoformat() if sh2 else curr_attempt.contained_at.isoformat()) if (curr_attempt and curr_attempt.contained_at) else None,
        'photos': [{'kind': 'T1_CONTAINMENT', 'url': t1_photo}] if t1_photo else [],
        'fields': {
            'containmentAction': curr_attempt.action_text if curr_attempt else "",
            'suspectQtyQuarantined': curr_attempt.suspect_qty if curr_attempt else 0,
            'quarantineTagNo': curr_attempt.quarantine_tag_no if curr_attempt else "",
            'quarantineLocation': curr_attempt.quarantine_location if curr_attempt else "",
            'sortingQtyInspected': curr_attempt.sorting_inspected if curr_attempt else 0,
            'sortingQtyOk': curr_attempt.sorting_ok if curr_attempt else 0,
            'sortingQtyRejected': curr_attempt.sorting_rejected if curr_attempt else 0,
            'containmentGapMinutes': curr_attempt.gap_minutes if curr_attempt else None,
            'containmentStatus': curr_attempt.status if curr_attempt else "Pending",
        }
    }

    # Stage 3: Root Cause & Permanent Action
    sh3 = sh_by_stage.get('RootCause') or sh_by_stage.get('CAPA')
    s3_completed = rc is not None and bool(rc.permanent_action and rc.permanent_action.strip())

    stage3 = {
        'stageNumber': 3,
        'title': "3. Root Cause & Permanent Action",
        'subtitle': "5-Why RCA, CAPA & Engineering Standardization",
        'role': "Target Person / CFT",
        'completed': s3_completed,
        'actor': (sh3.completed_by if sh3 else flag.target_person_name) if s3_completed else "",
        'completedAt': (sh3.completed_at.isoformat() if sh3 else rc.saved_at.isoformat()) if (rc and rc.saved_at) else None,
        'photos': [],
        'fields': {
            'why1': rc.why1 if rc else "",
            'why2': rc.why2 if rc else "",
            'why3': rc.why3 if rc else "",
            'why4': rc.why4 if rc else "",
            'rootCause5Why': rc.root_cause if rc else "",
            'systematicPermanentAction': rc.permanent_action if rc else "",
            'standardizationUpdates': {
                'sopUpdated': rc.sop_updated if rc else False,
                'pfmeaUpdated': rc.pfmea_updated if rc else False,
                'controlPlanUpdated': rc.control_plan_updated if rc else False,
                'onePointLessonIssued': rc.opl_issued if rc else False,
            } if rc else {},
            'targetDate': flag.target_date.strftime('%Y-%m-%d') if flag.target_date else None,
        }
    }

    # Stage 4: Quality Verification & Sustenance
    sh4 = sh_by_stage.get('Sustenance') or sh_by_stage.get('Effectiveness')
    s4_completed = flag.status == Status.CLOSED or flag.sustenance_achieved

    closure_photo = ""
    if closure and closure.closure_evidence:
        try:
            closure_photo = presign(closure.closure_evidence)
        except Exception:
            closure_photo = ""

    # Month checks for cycle
    cycle = flag.sustenance_cycle or 1
    checks = {c.month: c for c in flag.sustenance_checks.all() if c.cycle_no == cycle}

    def _fmt_chk(chk):
        if not chk:
            return None
        return {
            'status': chk.status,
            'scheduledDate': chk.scheduled_date.strftime('%Y-%m-%d') if chk.scheduled_date else None,
            'auditDate': chk.audit_date.strftime('%Y-%m-%d') if chk.audit_date else None,
            'auditedBy': chk.auditor_name or None,
            'observations': chk.observations or '',
        }

    stage4 = {
        'stageNumber': 4,
        'title': "4. Quality Verification",
        'subtitle': "QA Custodian Approval & 3-Month Sustenance Audits",
        'role': "Quality Custodian",
        'completed': s4_completed,
        'actor': (sh4.completed_by if sh4 else flag.qa_custodian_name) if s4_completed else flag.qa_custodian_name,
        'completedAt': (closure.closure_date.isoformat() if (closure and closure.closure_date) else (sh4.completed_at.isoformat() if sh4 else None)),
        'photos': [{'kind': 'CLOSURE_EVIDENCE', 'url': closure_photo}] if closure_photo else [],
        'fields': {
            'qaCustodian': flag.qa_custodian_name,
            'qaCustodianStatus': flag.qa_custodian_status,
            'qaCustodianNotes': flag.qa_custodian_notes,
            'containmentVerifiedBy': curr_attempt.verified_by_name if (curr_attempt and curr_attempt.verified_by_name) else None,
            'containmentVerifiedDate': curr_attempt.verified_at.strftime('%Y-%m-%d') if (curr_attempt and curr_attempt.verified_at) else None,
            'sustenanceStartDate': flag.sustenance_start_date.strftime('%Y-%m-%d') if flag.sustenance_start_date else None,
            'sustenanceCycle': flag.sustenance_cycle,
            'sustenanceAchieved': flag.sustenance_achieved,
            'month1Check': _fmt_chk(checks.get(1)),
            'month2Check': _fmt_chk(checks.get(2)),
            'month3Check': _fmt_chk(checks.get(3)),
            'closureDate': closure.closure_date.strftime('%Y-%m-%d') if (closure and closure.closure_date) else None,
            'approvedByQA': closure.approved_by_qa_name if closure else None,
            'approvedByProduction': closure.approved_by_production_name if closure else None,
            'closedEarly': flag.closed_early,
            'earlyClosureReason': closure.early_closure_reason if closure else None,
        }
    }

    # 3. Queue (filtered identically to the tracker)
    queue_qs = parse_analytics_filters(filter_params or {}).order_by('-raised_at')[:200]
    queue = [
        {
            'id': str(f.id),
            'number': f.red_flag_no,
            'status': f.status,
            'severity': f.severity,
            'shortDescription': f.description[:80],
        }
        for f in queue_qs
    ]

    # 4. Allowed actions
    actions = allowed_actions(user, flag)

    return {
        'flag': flat_flag,
        'stages': [stage1, stage2, stage3, stage4],
        'queue': queue,
        'allowedActions': actions,
    }
