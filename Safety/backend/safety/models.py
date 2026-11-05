from django.db import models
from django.utils import timezone
import uuid

# ==============================================================================
# SUBMODULE OVERVIEW: SAFETY INCIDENTS
# ==============================================================================
class SafetyIncident(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    incidentDate = models.CharField(max_length=32, default=timezone.now)
    type = models.CharField(
        max_length=32,
        choices=[
            ('Unsafe Act', 'Unsafe Act'),
            ('Unsafe Condition', 'Unsafe Condition'),
            ('Near Miss', 'Near Miss'),
            ('Minor Injury', 'Minor Injury'),
        ],
        default='Near Miss'
    )
    area = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    reportedBy = models.CharField(max_length=255, blank=True, default='')
    immediateAction = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=32,
        choices=[('Open', 'Open'), ('Closed', 'Closed')],
        default='Open'
    )
    targetDate = models.CharField(max_length=32, blank=True, default='')
    closedDate = models.CharField(max_length=32, blank=True, default='')
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-createdAt']

    def __str__(self):
        return f"[{self.type}] {self.area} - {self.status}"


# ==============================================================================
# SUBMODULE 1: SAFETY OBSERVATION (Attachment 1)
# ==============================================================================
class SafetyObservation(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    srNo = models.CharField(max_length=32, blank=True, default='')
    date = models.CharField(max_length=32, blank=True, default='')
    shift = models.CharField(
        max_length=16,
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('General', 'General')],
        default='A'
    )
    raisedBy = models.CharField(max_length=255, blank=True, default='Shopfloor Member')
    minifactory = models.CharField(max_length=128, blank=True, default='MF1')
    line = models.CharField(max_length=128, blank=True, default='Line 1')
    station = models.CharField(max_length=128, blank=True, default='Assembly Station')
    legend = models.CharField(
        max_length=32,
        choices=[('Unsafe condition', 'Unsafe condition'), ('Unsafe act', 'Unsafe act')],
        default='Unsafe condition'
    )
    beforeCondition = models.TextField(blank=True, default='')
    photoBefore = models.TextField(blank=True, default='')
    photoAfter = models.TextField(blank=True, default='')

    # Safety Coordinator Section (Category A/B/C, 5-Why, ICA/PCA)
    category = models.CharField(
        max_length=8,
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C')],
        blank=True,
        null=True
    )
    ica = models.TextField(blank=True, default='')
    targetDate = models.CharField(max_length=32, blank=True, default='')
    icaStatus = models.CharField(
        max_length=16,
        choices=[('Open', 'Open'), ('Closed', 'Closed')],
        default='Open'
    )
    why1 = models.TextField(blank=True, default='')
    why2 = models.TextField(blank=True, default='')
    why3 = models.TextField(blank=True, default='')
    why4 = models.TextField(blank=True, default='')
    why5 = models.TextField(blank=True, default='')
    rootCause = models.TextField(blank=True, default='')
    pca = models.TextField(blank=True, default='')
    responsibility = models.CharField(max_length=255, blank=True, default='')
    dueDate = models.CharField(max_length=32, blank=True, default='')
    closingDate = models.CharField(max_length=32, blank=True, default='')
    deltaTimeToClosure = models.CharField(max_length=32, blank=True, default='')
    status = models.CharField(
        max_length=32,
        choices=[('Open', 'Open'), ('In-Progress', 'In-Progress'), ('Closed', 'Closed')],
        default='Open'
    )
    horizontalDeploymentArea = models.TextField(blank=True, default='')
    horizontalDeploymentStatus = models.CharField(
        max_length=16,
        choices=[('Open', 'Open'), ('Closed', 'Closed'), ('NA', 'NA')],
        default='Open'
    )
    coordinatorName = models.CharField(max_length=255, blank=True, default='')
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-createdAt']

    def __str__(self):
        return f"SO #{self.srNo} - {self.station} ({self.status})"


# ==============================================================================
# SUBMODULE 2: NEAR MISS INCIDENT REPORT (Attachment 2)
# ==============================================================================
class NearMissReport(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    srNo = models.CharField(max_length=32, blank=True, default='')
    incidentDate = models.CharField(max_length=32, blank=True, default='')
    incidentTime = models.CharField(max_length=16, blank=True, default='')
    incidentType = models.CharField(
        max_length=16,
        choices=[('F', 'Fire/Fall'), ('PD', 'Property Damage'), ('E', 'Environmental'), ('Other', 'Other')],
        default='Other'
    )
    deptPlant = models.CharField(max_length=255, blank=True, default='MF1')
    incidentReportedBy = models.CharField(max_length=255, blank=True, default='Shopfloor Member')
    personInvolvedName = models.CharField(max_length=255, blank=True, default='')
    ticketNo = models.CharField(max_length=64, blank=True, default='')
    exactLocation = models.CharField(max_length=255, blank=True, default='')
    briefDescription = models.TextField(blank=True, default='')
    photoEvidence = models.TextField(blank=True, default='')
    photoBefore = models.TextField(blank=True, default='')
    photoAfter = models.TextField(blank=True, default='')

    # Coordinator Investigation & CAPA
    causeOfIncident = models.TextField(blank=True, default='')
    correctiveActionRecommended = models.TextField(blank=True, default='')
    actionTargetDate = models.CharField(max_length=32, blank=True, default='')
    respForAction = models.CharField(max_length=255, blank=True, default='')
    correctiveActionTaken = models.TextField(blank=True, default='')
    horizontalDeploymentIdentify = models.CharField(max_length=255, blank=True, default='NA')
    closingDate = models.CharField(max_length=32, blank=True, default='')
    status = models.CharField(
        max_length=32,
        choices=[('Open', 'Open'), ('In-Progress', 'In-Progress'), ('Closed', 'Closed')],
        default='Open'
    )
    coordinatorName = models.CharField(max_length=255, blank=True, default='')
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-createdAt']

    def __str__(self):
        return f"NM #{self.srNo} - {self.exactLocation} ({self.status})"


# ==============================================================================
# SUBMODULE 3: ACCIDENT REPORT (Attachment 3 - KSPG/EHS ACCIDENT REPORT)
# ==============================================================================
class AccidentReport(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    recordNo = models.CharField(max_length=64, blank=True, default='CR/01')
    division = models.CharField(max_length=128, blank=True, default='Pierburg')
    accidentDate = models.CharField(max_length=32, blank=True, default='')
    accidentRepDate = models.CharField(max_length=32, blank=True, default='')
    department = models.CharField(max_length=255, blank=True, default='')
    accidentTime = models.CharField(max_length=16, blank=True, default='')
    leadingActivity = models.JSONField(default=list, blank=True)
    leadingActivityOther = models.CharField(max_length=255, blank=True, default='')
    briefDescription = models.TextField(blank=True, default='')
    immediateCorrectiveActions = models.TextField(blank=True, default='')

    # Injured Person Details
    nameOfInjured = models.CharField(max_length=255, blank=True, default='')
    ticketNo = models.CharField(max_length=64, blank=True, default='')
    divDepartment = models.CharField(max_length=128, blank=True, default='')
    ageGender = models.CharField(max_length=32, blank=True, default='')
    shift = models.CharField(
        max_length=32,
        choices=[
            ('FIRST SHIFT', 'FIRST SHIFT'),
            ('SECOND SHIFT', 'SECOND SHIFT'),
            ('THIRD SHIFT', 'THIRD SHIFT'),
            ('GENERAL SHIFT', 'GENERAL SHIFT')
        ],
        default='FIRST SHIFT'
    )
    agency = models.TextField(blank=True, default='')
    exactSite = models.CharField(max_length=255, blank=True, default='')
    dutyStartTime = models.CharField(max_length=16, blank=True, default='08:00 AM')
    resAddressInjured = models.TextField(blank=True, default='')
    witnesses = models.JSONField(default=list, blank=True)
    managerName = models.CharField(max_length=255, blank=True, default='')
    managerExtn = models.CharField(max_length=64, blank=True, default='')
    plantHeadName = models.CharField(max_length=255, blank=True, default='')

    # Medical Officer (Doctor) Section
    bodyPartInjured = models.CharField(max_length=255, blank=True, default='')
    natureOfInjury = models.CharField(max_length=255, blank=True, default='')
    treatmentGivenOHC = models.TextField(blank=True, default='')
    injuredSentHospital = models.CharField(max_length=255, blank=True, default='Dispensary OHC only')
    resumedDutyDate = models.CharField(max_length=64, blank=True, default='')
    mandaysLost = models.IntegerField(default=0)
    medicalOfficerName = models.CharField(max_length=255, blank=True, default='Dr. ARJUN CHOUDHARY')
    medicalOfficerSign = models.CharField(max_length=255, blank=True, default='')
    medicalReportDate = models.CharField(max_length=32, blank=True, default='')

    # Safety Coordinator Section (5-Why, Ishikawa, Action items)
    investigationDate = models.CharField(max_length=32, blank=True, default='')
    ishikawaCauses = models.JSONField(default=dict, blank=True)
    why1 = models.TextField(blank=True, default='')
    why2 = models.TextField(blank=True, default='')
    why3 = models.TextField(blank=True, default='')
    why4 = models.TextField(blank=True, default='')
    why5 = models.TextField(blank=True, default='')
    rootCauseDescription = models.TextField(blank=True, default='')
    correctiveActions = models.JSONField(default=list, blank=True)
    investigators = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=64,
        choices=[
            ('Reported by Doctor', 'Reported by Doctor'),
            ('Under Coordinator Investigation', 'Under Coordinator Investigation'),
            ('Actions In-Progress', 'Actions In-Progress'),
            ('Closed', 'Closed')
        ],
        default='Reported by Doctor'
    )
    closingDate = models.CharField(max_length=32, blank=True, default='')
    coordinatorNotes = models.TextField(blank=True, default='')
    photoBefore = models.TextField(blank=True, default='')
    photoAfter = models.TextField(blank=True, default='')
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-createdAt']

    def __str__(self):
        return f"Accident {self.recordNo} - {self.nameOfInjured} ({self.status})"
