from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Unmanaged reference to the central PostgreSQL 'users' table in kaizen_db.
    Matches the schema defined in Backend/accounts/models.py so that
    JWT authentication and foreign key relationships link seamlessly
    with the shared user database.
    """
    employee_id = models.CharField(max_length=50, blank=True)
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    plant = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True)
    mini_factory = models.CharField(max_length=50, blank=True, default='MF1')
    phone = models.CharField(max_length=20, blank=True)
    is_active_employee = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=False)

    class Meta:
        db_table = 'users'
        managed = False

    def __str__(self):
        return f"{self.username} ({self.employee_id or self.email})"
