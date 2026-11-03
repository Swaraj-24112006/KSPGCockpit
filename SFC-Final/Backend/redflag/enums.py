from django.db import models

class RedFlagType(models.TextChoices):
    QUALITY = 'Quality', 'Quality (Defect/Spec)'
    PROCESS = 'Process', 'Process Parameter'
    MACHINE = 'Machine', 'Machine Breakdown'
    SAFETY = 'Safety', 'Safety & EHS Hazard'
    MATERIAL = 'Material', 'Material Inward Defect'
    FIVE_S = '5S', '5S Contamination'

class Severity(models.TextChoices):
    CRITICAL = 'Critical (Line Stop)', 'Critical (Line Stop)'
    MAJOR = 'Major (Quarantine)', 'Major (Quarantine Lot)'
    MODERATE = 'Moderate (Rework)', 'Moderate (Rework)'

class Category5M(models.TextChoices):
    MAN = 'Man', 'Man (Operator Skill/Handling)'
    MACHINE = 'Machine', 'Machine (Tool/Fixture/Sensor)'
    MATERIAL = 'Material', 'Material (Vendor/Raw Stock)'
    METHOD = 'Method', 'Method (Standard/Process)'
    MEASUREMENT = 'Measurement', 'Measurement (Gauge/Cal)'
    ENVIRONMENT = 'Environment', 'Environment (Oil/Mist/Dust)'

class Status(models.TextChoices):
    OPEN = 'Open', 'Open'
    CONTAINED = 'Contained', 'Contained'
    IN_PROGRESS = 'In-Progress', 'In-Progress'
    UNDER_SUSTENANCE = 'Under-Sustenance', 'Under-Sustenance'
    CLOSED = 'Closed', 'Closed'

class ContainmentStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    CONTAINED = 'Contained', 'Contained'
    VERIFIED = 'Verified', 'Verified'
    REJECTED = 'Rejected', 'Rejected'

class QaCustodianStatus(models.TextChoices):
    REVIEW_PENDING = 'Review Pending', 'Review Pending'
    CONTAINMENT_APPROVED = 'Containment Approved', 'Containment Approved'
    CAPA_VERIFIED = 'CAPA Verified', 'CAPA Verified'
    IN_SUSTENANCE = 'In Sustenance', 'In Sustenance'
    CLOSED_APPROVED = 'Closed Approved', 'Closed Approved'

class Repetitive(models.TextChoices):
    FIRST_TIME = 'First Time', 'First Time'
    REPETITIVE = 'Repetitive', 'Repetitive'

class CheckStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    PASSED = 'Passed', 'Passed'
    RECURRENCE_DETECTED = 'Recurrence Detected', 'Recurrence Detected'

class AttachmentKind(models.TextChoices):
    T0_EVIDENCE = 'T0_EVIDENCE', 'T0 Evidence Photo'
    T1_CONTAINMENT = 'T1_CONTAINMENT', 'T1 Containment Photo'
    SUSTENANCE_AUDIT = 'SUSTENANCE_AUDIT', 'Sustenance Audit Photo'
    CLOSURE_EVIDENCE = 'CLOSURE_EVIDENCE', 'Closure Evidence Photo'

class EscalationModule(models.TextChoices):
    PPSR = 'PPSR', 'PPSR (8D)'
    KAIZEN = 'KAIZEN', 'Kaizen Poka-Yoke'
    FIVES_RED_TAG = 'FIVES_RED_TAG', '5S Red Tag'

class EscalationState(models.TextChoices):
    LINKED = 'LINKED', 'Linked'
    PENDING_TARGET = 'PENDING_TARGET', 'Pending Target'

