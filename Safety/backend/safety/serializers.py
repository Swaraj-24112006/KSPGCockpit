"""
Serialization helpers matching the React TypeScript types exactly.
"""

def serialize_safety_incident(item):
    return {
        "id": item.id,
        "incidentDate": item.incidentDate,
        "type": item.type,
        "area": item.area,
        "description": item.description,
        "reportedBy": item.reportedBy,
        "immediateAction": item.immediateAction,
        "status": item.status,
        "targetDate": item.targetDate,
        "closedDate": item.closedDate,
        "createdAt": item.createdAt.isoformat() if hasattr(item.createdAt, 'isoformat') else str(item.createdAt),
    }


def serialize_safety_observation(item):
    sr_no_val = item.srNo
    try:
        sr_no_val = int(item.srNo)
    except (ValueError, TypeError):
        pass

    delta_time = item.deltaTimeToClosure
    try:
        if delta_time != "" and delta_time is not None:
            delta_time = int(delta_time)
    except (ValueError, TypeError):
        pass

    return {
        "id": item.id,
        "srNo": sr_no_val,
        "date": item.date,
        "shift": item.shift,
        "raisedBy": item.raisedBy,
        "minifactory": item.minifactory,
        "line": item.line,
        "station": item.station,
        "legend": item.legend,
        "beforeCondition": item.beforeCondition,
        "photoBefore": item.photoBefore or "",
        "photoAfter": item.photoAfter or "",
        "category": item.category if item.category else None,
        "ica": item.ica or "",
        "targetDate": item.targetDate or "",
        "icaStatus": item.icaStatus or "Open",
        "why1": item.why1 or "",
        "why2": item.why2 or "",
        "why3": item.why3 or "",
        "why4": item.why4 or "",
        "why5": item.why5 or "",
        "rootCause": item.rootCause or "",
        "pca": item.pca or "",
        "responsibility": item.responsibility or "",
        "dueDate": item.dueDate or "",
        "closingDate": item.closingDate or "",
        "deltaTimeToClosure": delta_time,
        "status": item.status,
        "horizontalDeploymentArea": item.horizontalDeploymentArea or "",
        "horizontalDeploymentStatus": item.horizontalDeploymentStatus or "Open",
        "coordinatorName": item.coordinatorName or "",
        "createdAt": item.createdAt.isoformat() if hasattr(item.createdAt, 'isoformat') else str(item.createdAt),
    }


def serialize_near_miss(item):
    sr_no_val = item.srNo
    try:
        sr_no_val = int(item.srNo)
    except (ValueError, TypeError):
        pass

    return {
        "id": item.id,
        "srNo": sr_no_val,
        "incidentDate": item.incidentDate,
        "incidentTime": item.incidentTime,
        "incidentType": item.incidentType,
        "deptPlant": item.deptPlant,
        "incidentReportedBy": item.incidentReportedBy,
        "personInvolvedName": item.personInvolvedName or "",
        "ticketNo": item.ticketNo or "",
        "exactLocation": item.exactLocation,
        "briefDescription": item.briefDescription,
        "photoEvidence": item.photoEvidence or "",
        "photoBefore": item.photoBefore or item.photoEvidence or "",
        "photoAfter": item.photoAfter or "",
        "causeOfIncident": item.causeOfIncident or "",
        "correctiveActionRecommended": item.correctiveActionRecommended or "",
        "actionTargetDate": item.actionTargetDate or "",
        "respForAction": item.respForAction or "",
        "correctiveActionTaken": item.correctiveActionTaken or "",
        "horizontalDeploymentIdentify": item.horizontalDeploymentIdentify or "NA",
        "closingDate": item.closingDate or "",
        "status": item.status,
        "coordinatorName": item.coordinatorName or "",
        "createdAt": item.createdAt.isoformat() if hasattr(item.createdAt, 'isoformat') else str(item.createdAt),
    }


def serialize_accident_report(item):
    return {
        "id": item.id,
        "recordNo": item.recordNo,
        "division": item.division,
        "accidentDate": item.accidentDate,
        "accidentRepDate": item.accidentRepDate,
        "department": item.department,
        "accidentTime": item.accidentTime,
        "leadingActivity": item.leadingActivity or [],
        "leadingActivityOther": item.leadingActivityOther or "",
        "briefDescription": item.briefDescription,
        "immediateCorrectiveActions": item.immediateCorrectiveActions,
        "nameOfInjured": item.nameOfInjured,
        "ticketNo": item.ticketNo,
        "divDepartment": item.divDepartment,
        "ageGender": item.ageGender,
        "shift": item.shift,
        "agency": item.agency,
        "exactSite": item.exactSite,
        "dutyStartTime": item.dutyStartTime,
        "resAddressInjured": item.resAddressInjured or "",
        "witnesses": item.witnesses or [],
        "managerName": item.managerName or "",
        "managerExtn": item.managerExtn or "",
        "plantHeadName": item.plantHeadName or "",
        "bodyPartInjured": item.bodyPartInjured,
        "natureOfInjury": item.natureOfInjury,
        "treatmentGivenOHC": item.treatmentGivenOHC,
        "injuredSentHospital": item.injuredSentHospital or "Dispensary OHC only",
        "resumedDutyDate": item.resumedDutyDate or "",
        "mandaysLost": item.mandaysLost or 0,
        "medicalOfficerName": item.medicalOfficerName,
        "medicalOfficerSign": item.medicalOfficerSign or "",
        "medicalReportDate": item.medicalReportDate,
        "investigationDate": item.investigationDate or "",
        "ishikawaCauses": item.ishikawaCauses or {
            "ppe": [],
            "environmental": [],
            "machineEquipment": [],
            "injuredPerson": [],
            "management": [],
            "jobProcedure": []
        },
        "why1": item.why1 or "",
        "why2": item.why2 or "",
        "why3": item.why3 or "",
        "why4": item.why4 or "",
        "why5": item.why5 or "",
        "rootCauseDescription": item.rootCauseDescription or "",
        "correctiveActions": item.correctiveActions or [],
        "investigators": item.investigators or [],
        "status": item.status,
        "closingDate": item.closingDate or "",
        "coordinatorNotes": item.coordinatorNotes or "",
        "photoBefore": item.photoBefore or "",
        "photoAfter": item.photoAfter or "",
        "createdAt": item.createdAt.isoformat() if hasattr(item.createdAt, 'isoformat') else str(item.createdAt),
    }

