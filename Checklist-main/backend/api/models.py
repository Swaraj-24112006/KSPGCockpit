from django.db import models


class Minifactory(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.id} - {self.name}"


class Line(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    minifactory = models.ForeignKey(Minifactory, on_delete=models.CASCADE, related_name='lines')
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.name} ({self.id})"


class Station(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    number = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    minifactory_id = models.CharField(max_length=64)
    line = models.ForeignKey(Line, on_delete=models.CASCADE, related_name='stations')
    line_name = models.CharField(max_length=255, blank=True, default='')
    operator_name = models.CharField(max_length=255, blank=True, default='')
    operator_id = models.CharField(max_length=64, blank=True, default='')
    status = models.CharField(max_length=64, default='PENDING')
    shift = models.CharField(max_length=128, default='Shift 1 (06:00 - 14:00)')
    completion_percentage = models.IntegerField(default=0)
    machine_checkpoints = models.JSONField(default=list, blank=True)
    pokayoke_checkpoints = models.JSONField(default=list, blank=True)
    deviations = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['number', 'name']

    def __str__(self):
        return f"Station {self.number} - {self.name}"


class ChecklistTemplate(models.Model):
    station_id = models.CharField(max_length=128, primary_key=True)
    machine_checkpoints = models.JSONField(default=list, blank=True)
    pokayoke_checkpoints = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Checklist Template for {self.station_id}"


class ChecklistSubmission(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    minifactory_id = models.CharField(max_length=64)
    line_id = models.CharField(max_length=64)
    station_id = models.CharField(max_length=128)
    station_number = models.CharField(max_length=64, blank=True, default='')
    line_name = models.CharField(max_length=255, blank=True, default='')
    operator_name = models.CharField(max_length=255, blank=True, default='')
    operator_id = models.CharField(max_length=64, blank=True, default='')
    shift = models.CharField(max_length=128, blank=True, default='')
    submitted_at = models.CharField(max_length=128)
    completed_at = models.CharField(max_length=128, blank=True, default='')
    time_taken_seconds = models.IntegerField(default=0)
    location = models.JSONField(default=dict, blank=True)
    machine_checkpoints = models.JSONField(default=list, blank=True)
    pokayoke_checkpoints = models.JSONField(default=list, blank=True)
    deviations = models.JSONField(default=list, blank=True)
    overall_status = models.CharField(max_length=32, default='OK')
    verification_hash = models.CharField(max_length=255, blank=True, default='')
    is_authentic = models.BooleanField(default=True)
    photo_evidence_keys = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Submission {self.id} ({self.station_id})"


class DeviationLog(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    sn = models.IntegerField(default=1)
    date = models.CharField(max_length=64, blank=True, default='')
    timestamp = models.CharField(max_length=128)
    minifactory_id = models.CharField(max_length=64)
    line_id = models.CharField(max_length=64)
    station_id = models.CharField(max_length=128)
    location = models.CharField(max_length=255, blank=True, default='')
    problem_description = models.TextField(blank=True, default='')
    owner = models.CharField(max_length=255, blank=True, default='')
    countermeasure = models.TextField(blank=True, default='')
    target_date = models.CharField(max_length=64, blank=True, default='')
    status = models.CharField(max_length=64, default='Open')
    checkpoint_name = models.CharField(max_length=255, blank=True, default='')
    photo_evidence_url = models.TextField(blank=True, default='')
    assigned_to = models.CharField(max_length=255, blank=True, default='')
    resolved_at = models.CharField(max_length=128, blank=True, null=True)
    resolved_by = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Deviation {self.id} [{self.status}]"


class StationState(models.Model):
    id = models.CharField(max_length=128, primary_key=True)
    station_id = models.CharField(max_length=128)
    minifactory_id = models.CharField(max_length=64)
    line_id = models.CharField(max_length=64)
    status = models.CharField(max_length=64, default='PENDING')
    last_submitted_at = models.CharField(max_length=128, blank=True, null=True)
    completion_percentage = models.IntegerField(default=0)
    current_operator_id = models.CharField(max_length=64, blank=True, default='')
    last_verification_hash = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return f"StationState {self.station_id}: {self.status}"
