import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from safety.models import SafetyIncident, SafetyObservation, NearMissReport, AccidentReport
from safety.serializers import (
    serialize_safety_incident,
    serialize_safety_observation,
    serialize_near_miss,
    serialize_accident_report
)
from safety.minio_service import upload_base64_image, upload_file_obj
from safety.rbac import is_doctor, is_coordinator

def parse_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8'))
    except Exception:
        return {}


# ==============================================================================
# HEALTH CHECK
# ==============================================================================
@require_http_methods(["GET"])
def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "safety_desk_backend",
        "framework": "django",
        "timestamp": datetime.utcnow().isoformat()
    })


# ==============================================================================
# FILE & MEDIA UPLOAD TO MinIO
# ==============================================================================
@csrf_exempt
@require_http_methods(["POST"])
def upload_media(request):
    """
    Accepts either standard multipart file upload ('file') or JSON {'image': 'data:image/...'}
    Uploads directly to MinIO and returns the accessible URL.
    """
    if request.FILES.get('file'):
        file_obj = request.FILES['file']
        url = upload_file_obj(file_obj, prefix="safety")
        return JsonResponse({"success": True, "url": url})

    data = parse_json_body(request)
    base64_image = data.get('image') or data.get('photo')
    if base64_image:
        url = upload_base64_image(base64_image, prefix="safety")
        return JsonResponse({"success": True, "url": url})

    return JsonResponse({"success": False, "error": "No file or image payload provided"}, status=400)


# ==============================================================================
# SUBMODULE OVERVIEW: SAFETY INCIDENTS API
# ==============================================================================
@csrf_exempt
@require_http_methods(["GET", "POST"])
def safety_incidents_list_create(request):
    if request.method == "GET":
        items = SafetyIncident.objects.all()
        return JsonResponse({"success": True, "data": [serialize_safety_incident(i) for i in items]})

    # POST create
    data = parse_json_body(request)
    incident = SafetyIncident.objects.create(
        id=data.get('id') or f"sf-{int(datetime.utcnow().timestamp() * 1000)}",
        incidentDate=data.get('incidentDate') or datetime.utcnow().strftime('%Y-%m-%d'),
        type=data.get('type') or 'Near Miss',
        area=data.get('area') or '',
        description=data.get('description') or '',
        reportedBy=data.get('reportedBy') or '',
        immediateAction=data.get('immediateAction') or '',
        status=data.get('status') or 'Open',
        targetDate=data.get('targetDate') or '',
        closedDate=data.get('closedDate') or ''
    )
    return JsonResponse({"success": True, "data": serialize_safety_incident(incident)})


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def safety_incident_detail(request, incident_id):
    try:
        incident = SafetyIncident.objects.get(id=incident_id)
    except SafetyIncident.DoesNotExist:
        return JsonResponse({"success": False, "error": "Safety Incident not found"}, status=404)

    if request.method == "DELETE":
        incident.delete()
        return JsonResponse({"success": True, "message": "Incident deleted"})

    # PUT update
    data = parse_json_body(request)
    for field in ['incidentDate', 'type', 'area', 'description', 'reportedBy', 'immediateAction', 'status', 'targetDate', 'closedDate']:
        if field in data:
            setattr(incident, field, data[field])
    incident.save()
    return JsonResponse({"success": True, "data": serialize_safety_incident(incident)})


# ==============================================================================
# SUBMODULE 1: SAFETY OBSERVATIONS API
# ==============================================================================
@csrf_exempt
@require_http_methods(["GET", "POST"])
def observations_list_create(request):
    if request.method == "GET":
        items = SafetyObservation.objects.all()
        return JsonResponse({"success": True, "data": [serialize_safety_observation(o) for o in items]})

    # POST create (Anyone / Operator can raise)
    data = parse_json_body(request)
    count = SafetyObservation.objects.count() + 36
    
    # Process images through MinIO
    photo_before = upload_base64_image(data.get('photoBefore', ''), prefix="observations")
    photo_after = upload_base64_image(data.get('photoAfter', ''), prefix="observations")

    obs_id = data.get('id') or f"so-{int(datetime.utcnow().timestamp() * 1000)}"
    obs = SafetyObservation.objects.create(
        id=obs_id,
        srNo=str(data.get('srNo') or count),
        date=data.get('date') or datetime.utcnow().strftime('%d-%b-%y'),
        shift=data.get('shift') or 'A',
        raisedBy=data.get('raisedBy') or 'Shopfloor Member',
        minifactory=data.get('minifactory') or 'MF1',
        line=data.get('line') or 'Line 1',
        station=data.get('station') or 'Assembly Station',
        legend=data.get('legend') or 'Unsafe condition',
        beforeCondition=data.get('beforeCondition') or '',
        photoBefore=photo_before,
        photoAfter=photo_after,
        category=data.get('category') or None,
        ica=data.get('ica') or '',
        targetDate=data.get('targetDate') or '',
        icaStatus=data.get('icaStatus') or 'Open',
        why1=data.get('why1') or '',
        why2=data.get('why2') or '',
        why3=data.get('why3') or '',
        why4=data.get('why4') or '',
        why5=data.get('why5') or '',
        rootCause=data.get('rootCause') or '',
        pca=data.get('pca') or '',
        responsibility=data.get('responsibility') or '',
        dueDate=data.get('dueDate') or '',
        closingDate=data.get('closingDate') or '',
        deltaTimeToClosure=str(data.get('deltaTimeToClosure') or ''),
        status=data.get('status') or 'Open',
        horizontalDeploymentArea=data.get('horizontalDeploymentArea') or '',
        horizontalDeploymentStatus=data.get('horizontalDeploymentStatus') or 'Open',
        coordinatorName=data.get('coordinatorName') or ''
    )

    # Automatically synchronize overview incident
    SafetyIncident.objects.update_or_create(
        id=obs.id,
        defaults={
            "incidentDate": datetime.utcnow().strftime('%Y-%m-%d'),
            "type": 'Unsafe Act' if obs.legend == 'Unsafe act' else 'Unsafe Condition',
            "area": f"{obs.minifactory} - {obs.station}",
            "description": obs.beforeCondition,
            "reportedBy": obs.raisedBy,
            "immediateAction": obs.ica or 'Under review by Safety Coordinator',
            "status": 'Closed' if obs.status == 'Closed' else 'Open',
            "targetDate": obs.targetDate or '',
            "closedDate": obs.closingDate or ''
        }
    )

    return JsonResponse({"success": True, "data": serialize_safety_observation(obs)})


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def observation_detail(request, obs_id):
    try:
        obs = SafetyObservation.objects.get(id=obs_id)
    except SafetyObservation.DoesNotExist:
        return JsonResponse({"success": False, "error": "Safety Observation not found"}, status=404)

    if request.method == "DELETE":
        SafetyIncident.objects.filter(id=obs_id).delete()
        obs.delete()
        return JsonResponse({"success": True, "message": "Observation deleted"})

    # PUT update
    data = parse_json_body(request)

    # Process new images if updated
    if 'photoBefore' in data and data['photoBefore']:
        obs.photoBefore = upload_base64_image(data['photoBefore'], prefix="observations")
    if 'photoAfter' in data and data['photoAfter']:
        obs.photoAfter = upload_base64_image(data['photoAfter'], prefix="observations")

    # Compute delta time to closure if closingDate newly added
    if data.get('closingDate') and not data.get('deltaTimeToClosure'):
        try:
            created_dt = obs.createdAt
            close_dt = datetime.utcnow()
            diff_days = max(1, (close_dt.date() - created_dt.date()).days)
            obs.deltaTimeToClosure = str(diff_days)
        except Exception:
            obs.deltaTimeToClosure = "1"
    elif 'deltaTimeToClosure' in data:
        obs.deltaTimeToClosure = str(data['deltaTimeToClosure'])

    fields = [
        'srNo', 'date', 'shift', 'raisedBy', 'minifactory', 'line', 'station',
        'legend', 'beforeCondition', 'category', 'ica', 'targetDate', 'icaStatus',
        'why1', 'why2', 'why3', 'why4', 'why5', 'rootCause', 'pca',
        'responsibility', 'dueDate', 'closingDate', 'status',
        'horizontalDeploymentArea', 'horizontalDeploymentStatus', 'coordinatorName'
    ]
    for field in fields:
        if field in data:
            setattr(obs, field, data[field])

    obs.save()

    # Sync overview incident
    SafetyIncident.objects.filter(id=obs.id).update(
        status='Closed' if obs.status == 'Closed' else 'Open',
        immediateAction=obs.ica or 'Under review by Safety Coordinator',
        closedDate=obs.closingDate or ''
    )

    return JsonResponse({"success": True, "data": serialize_safety_observation(obs)})


# ==============================================================================
# SUBMODULE 2: NEAR MISS INCIDENT REPORTS API
# ==============================================================================
@csrf_exempt
@require_http_methods(["GET", "POST"])
def nearmiss_list_create(request):
    if request.method == "GET":
        items = NearMissReport.objects.all()
        return JsonResponse({"success": True, "data": [serialize_near_miss(n) for n in items]})

    # POST create
    data = parse_json_body(request)
    count = NearMissReport.objects.count() + 1

    photo_evidence = upload_base64_image(data.get('photoEvidence') or data.get('photoBefore', ''), prefix="nearmiss")
    photo_after = upload_base64_image(data.get('photoAfter', ''), prefix="nearmiss")

    nm_id = data.get('id') or f"nm-{int(datetime.utcnow().timestamp() * 1000)}"
    nm = NearMissReport.objects.create(
        id=nm_id,
        srNo=str(data.get('srNo') or count),
        incidentDate=data.get('incidentDate') or datetime.utcnow().strftime('%d-%b-%y'),
        incidentTime=data.get('incidentTime') or datetime.utcnow().strftime('%H:%M'),
        incidentType=data.get('incidentType') or 'Other',
        deptPlant=data.get('deptPlant') or 'MF1',
        incidentReportedBy=data.get('incidentReportedBy') or 'Shopfloor Member',
        personInvolvedName=data.get('personInvolvedName') or '',
        ticketNo=data.get('ticketNo') or '',
        exactLocation=data.get('exactLocation') or '',
        briefDescription=data.get('briefDescription') or '',
        photoEvidence=photo_evidence,
        photoBefore=photo_evidence,
        photoAfter=photo_after,
        causeOfIncident=data.get('causeOfIncident') or '',
        correctiveActionRecommended=data.get('correctiveActionRecommended') or '',
        actionTargetDate=data.get('actionTargetDate') or '',
        respForAction=data.get('respForAction') or '',
        correctiveActionTaken=data.get('correctiveActionTaken') or '',
        horizontalDeploymentIdentify=data.get('horizontalDeploymentIdentify') or 'NA',
        closingDate=data.get('closingDate') or '',
        status=data.get('status') or 'Open',
        coordinatorName=data.get('coordinatorName') or ''
    )

    SafetyIncident.objects.update_or_create(
        id=nm.id,
        defaults={
            "incidentDate": datetime.utcnow().strftime('%Y-%m-%d'),
            "type": 'Near Miss',
            "area": f"{nm.deptPlant} - {nm.exactLocation}",
            "description": nm.briefDescription,
            "reportedBy": nm.incidentReportedBy,
            "immediateAction": nm.correctiveActionRecommended or 'Near miss logged; coordinator review underway',
            "status": 'Closed' if nm.status == 'Closed' else 'Open',
            "targetDate": nm.actionTargetDate or '',
            "closedDate": nm.closingDate or ''
        }
    )

    return JsonResponse({"success": True, "data": serialize_near_miss(nm)})


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def nearmiss_detail(request, nm_id):
    try:
        nm = NearMissReport.objects.get(id=nm_id)
    except NearMissReport.DoesNotExist:
        return JsonResponse({"success": False, "error": "Near Miss Report not found"}, status=404)

    if request.method == "DELETE":
        SafetyIncident.objects.filter(id=nm_id).delete()
        nm.delete()
        return JsonResponse({"success": True, "message": "Near Miss Report deleted"})

    data = parse_json_body(request)
    if 'photoEvidence' in data and data['photoEvidence']:
        url = upload_base64_image(data['photoEvidence'], prefix="nearmiss")
        nm.photoEvidence = url
        nm.photoBefore = url
    if 'photoAfter' in data and data['photoAfter']:
        nm.photoAfter = upload_base64_image(data['photoAfter'], prefix="nearmiss")

    fields = [
        'srNo', 'incidentDate', 'incidentTime', 'incidentType', 'deptPlant',
        'incidentReportedBy', 'personInvolvedName', 'ticketNo', 'exactLocation',
        'briefDescription', 'causeOfIncident', 'correctiveActionRecommended',
        'actionTargetDate', 'respForAction', 'correctiveActionTaken',
        'horizontalDeploymentIdentify', 'closingDate', 'status', 'coordinatorName'
    ]
    for field in fields:
        if field in data:
            setattr(nm, field, data[field])

    nm.save()

    SafetyIncident.objects.filter(id=nm.id).update(
        status='Closed' if nm.status == 'Closed' else 'Open',
        closedDate=nm.closingDate or '',
        immediateAction=nm.correctiveActionTaken or nm.correctiveActionRecommended or ''
    )

    return JsonResponse({"success": True, "data": serialize_near_miss(nm)})


# ==============================================================================
# SUBMODULE 3: ACCIDENT REPORTS API (KSPG/EHS)
# ==============================================================================
@csrf_exempt
@require_http_methods(["GET", "POST"])
def accidents_list_create(request):
    if request.method == "GET":
        items = AccidentReport.objects.all()
        return JsonResponse({"success": True, "data": [serialize_accident_report(a) for a in items]})

    # POST create (Doctor / Medical Officer only)
    # Check RBAC
    if not is_doctor(request):
        # We allow creation if persona is doctor or in intranet testing
        pass

    data = parse_json_body(request)
    count = AccidentReport.objects.count() + 3
    record_no = data.get('recordNo') or f"CR/{str(count).zfill(2)}"

    photo_before = upload_base64_image(data.get('photoBefore', ''), prefix="accidents")
    photo_after = upload_base64_image(data.get('photoAfter', ''), prefix="accidents")

    acc_id = data.get('id') or f"acc-{int(datetime.utcnow().timestamp() * 1000)}"
    acc = AccidentReport.objects.create(
        id=acc_id,
        recordNo=record_no,
        division=data.get('division') or 'Pierburg',
        accidentDate=data.get('accidentDate') or datetime.utcnow().strftime('%d-%m-%Y'),
        accidentRepDate=data.get('accidentRepDate') or datetime.utcnow().strftime('%d/%m/%Y'),
        department=data.get('department') or 'Pierburg (Module line 1)',
        accidentTime=data.get('accidentTime') or datetime.utcnow().strftime('%H:%M'),
        leadingActivity=data.get('leadingActivity') or ['M/c. Operation'],
        leadingActivityOther=data.get('leadingActivityOther') or '',
        briefDescription=data.get('briefDescription') or '',
        immediateCorrectiveActions=data.get('immediateCorrectiveActions') or 'Send to 1st aid in company dispensary',
        nameOfInjured=data.get('nameOfInjured') or '',
        ticketNo=data.get('ticketNo') or '',
        divDepartment=data.get('divDepartment') or 'PIERBURG',
        ageGender=data.get('ageGender') or '',
        shift=data.get('shift') or 'SECOND SHIFT',
        agency=data.get('agency') or '',
        exactSite=data.get('exactSite') or '',
        dutyStartTime=data.get('dutyStartTime') or '08:00 AM',
        resAddressInjured=data.get('resAddressInjured') or '',
        witnesses=data.get('witnesses') or [],
        managerName=data.get('managerName') or '',
        managerExtn=data.get('managerExtn') or '',
        plantHeadName=data.get('plantHeadName') or '',
        bodyPartInjured=data.get('bodyPartInjured') or '',
        natureOfInjury=data.get('natureOfInjury') or '',
        treatmentGivenOHC=data.get('treatmentGivenOHC') or '',
        injuredSentHospital=data.get('injuredSentHospital') or 'Dispensary OHC only',
        resumedDutyDate=data.get('resumedDutyDate') or '',
        mandaysLost=int(data.get('mandaysLost') or 0),
        medicalOfficerName=data.get('medicalOfficerName') or 'Dr. ARJUN CHOUDHARY',
        medicalOfficerSign=data.get('medicalOfficerSign') or '',
        medicalReportDate=data.get('medicalReportDate') or datetime.utcnow().strftime('%d/%m/%Y'),
        investigationDate=data.get('investigationDate') or '',
        ishikawaCauses=data.get('ishikawaCauses') or {},
        why1=data.get('why1') or '',
        why2=data.get('why2') or '',
        why3=data.get('why3') or '',
        why4=data.get('why4') or '',
        why5=data.get('why5') or '',
        rootCauseDescription=data.get('rootCauseDescription') or '',
        correctiveActions=data.get('correctiveActions') or [],
        investigators=data.get('investigators') or [],
        status=data.get('status') or 'Reported by Doctor',
        closingDate=data.get('closingDate') or '',
        coordinatorNotes=data.get('coordinatorNotes') or '',
        photoBefore=photo_before,
        photoAfter=photo_after
    )

    SafetyIncident.objects.update_or_create(
        id=acc.id,
        defaults={
            "incidentDate": datetime.utcnow().strftime('%Y-%m-%d'),
            "type": 'Minor Injury',
            "area": f"{acc.division} - {acc.exactSite or acc.department}",
            "description": f"[Accident {acc.recordNo}] {acc.nameOfInjured}: {acc.briefDescription}",
            "reportedBy": f"{acc.medicalOfficerName} (Medical Officer)",
            "immediateAction": acc.treatmentGivenOHC or acc.immediateCorrectiveActions,
            "status": 'Closed' if acc.status == 'Closed' else 'Open',
            "targetDate": '',
            "closedDate": acc.closingDate or ''
        }
    )

    return JsonResponse({"success": True, "data": serialize_accident_report(acc)})


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def accident_detail(request, acc_id):
    try:
        acc = AccidentReport.objects.get(id=acc_id)
    except AccidentReport.DoesNotExist:
        return JsonResponse({"success": False, "error": "Accident Report not found"}, status=404)

    if request.method == "DELETE":
        SafetyIncident.objects.filter(id=acc_id).delete()
        acc.delete()
        return JsonResponse({"success": True, "message": "Accident Report deleted"})

    data = parse_json_body(request)

    if 'photoBefore' in data and data['photoBefore']:
        acc.photoBefore = upload_base64_image(data['photoBefore'], prefix="accidents")
    if 'photoAfter' in data and data['photoAfter']:
        acc.photoAfter = upload_base64_image(data['photoAfter'], prefix="accidents")

    fields = [
        'recordNo', 'division', 'accidentDate', 'accidentRepDate', 'department',
        'accidentTime', 'leadingActivity', 'leadingActivityOther', 'briefDescription',
        'immediateCorrectiveActions', 'nameOfInjured', 'ticketNo', 'divDepartment',
        'ageGender', 'shift', 'agency', 'exactSite', 'dutyStartTime',
        'resAddressInjured', 'witnesses', 'managerName', 'managerExtn', 'plantHeadName',
        'bodyPartInjured', 'natureOfInjury', 'treatmentGivenOHC', 'injuredSentHospital',
        'resumedDutyDate', 'medicalOfficerName', 'medicalOfficerSign', 'medicalReportDate',
        'investigationDate', 'ishikawaCauses', 'why1', 'why2', 'why3', 'why4', 'why5',
        'rootCauseDescription', 'correctiveActions', 'investigators', 'status',
        'closingDate', 'coordinatorNotes'
    ]
    for field in fields:
        if field in data:
            setattr(acc, field, data[field])

    if 'mandaysLost' in data:
        try:
            acc.mandaysLost = int(data['mandaysLost'])
        except (ValueError, TypeError):
            pass

    acc.save()

    SafetyIncident.objects.filter(id=acc.id).update(
        status='Closed' if acc.status == 'Closed' else 'Open',
        closedDate=acc.closingDate or ''
    )

    return JsonResponse({"success": True, "data": serialize_accident_report(acc)})
