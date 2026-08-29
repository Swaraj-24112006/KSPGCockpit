"""
Accounts Models — CustomUser and Role
======================================
Extends Django's AbstractUser with manufacturing-specific fields:
employee_id, department, designation, plant, area, and role assignment.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    """
    Kaizen system roles controlling access permissions.
    Roles: initiator, reviewer, kaizen_lead, cft_member, verifier, admin
    """
    ROLE_CHOICES = [
        ('initiator', 'Initiator'),
        ('reviewer', 'Reviewer / Manager'),
        ('kaizen_lead', 'Kaizen Lead / CFT Member'),
        ('cft_member', 'CFT Member'),
        ('verifier', 'Verifier'),
        ('admin', 'Administrator'),
        ('superadmin', 'Super Administrator'),
    ]

    name = models.CharField(max_length=50, unique=True, choices=ROLE_CHOICES)
    description = models.TextField(blank=True)
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text='Granular permission map for this role'
    )

    class Meta:
        db_table = 'roles'
        ordering = ['name']

    def __str__(self):
        return self.get_name_display()


class CustomUser(AbstractUser):
    """
    Extended user model for the Kaizen system.
    Stores employee details relevant to the manufacturing context.
    """
    employee_id = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique employee identifier (e.g., EMP-001)'
    )
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    plant = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True)
    mini_factory = models.CharField(
        max_length=50,
        default='MF1',
        blank=True,
        help_text='Primary assigned Mini-Factory (e.g. MF1, MF2, MF3, Central)'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    is_active_employee = models.BooleanField(
        default=True,
        help_text='Whether this employee is currently active in the system'
    )
    must_change_password = models.BooleanField(
        default=False,
        help_text='Forces user to change their temporary password on first login'
    )
    last_activity = models.DateTimeField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'users'
        ordering = ['employee_id']
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['department']),
            models.Index(fields=['plant']),
            models.Index(fields=['mini_factory']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.employee_id})"

    @property
    def is_superadmin(self) -> bool:
        """
        True strictly if user is a Django superuser or has the 'superadmin' role.
        Note: is_staff alone does NOT grant SuperAdmin privileges.
        """
        if not self.is_authenticated:
            return False
        if self.is_superuser:
            return True
        return bool(self.role and self.role.name == 'superadmin')

    @property
    def role_name(self) -> str:
        """Raw DB role name (e.g. 'initiator', 'kaizen_lead', 'superadmin')."""
        if self.is_superadmin:
            return 'superadmin'
        return self.role.name if self.role else 'initiator'

    @property
    def role_category(self) -> str:
        """
        Normalised RBAC category: 'superadmin' | 'admin' | 'coordinator' | 'committee' | 'initiator'.
        """
        if not self.is_authenticated:
            return 'initiator'
        if self.is_superadmin:
            return 'superadmin'
        from core.rbac import get_role_category
        return get_role_category(self)

    @property
    def is_initiator(self) -> bool:
        return self.role_category == 'initiator'

    @property
    def is_coordinator(self) -> bool:
        return self.role_category == 'coordinator'

    @property
    def is_committee(self) -> bool:
        return self.role_category == 'committee'

    @property
    def is_admin_role(self) -> bool:
        return self.role_category in ('admin', 'superadmin')

    def has_kaizen_permission(self, permission: str) -> bool:
        """Check if user has a specific Kaizen permission via their role."""
        if self.is_superadmin:
            return True
        from core.rbac import get_role_category, ROLE_ADMIN, ROLE_PERMISSIONS
        category = get_role_category(self)
        if category == ROLE_ADMIN:
            return True
        return ROLE_PERMISSIONS.get(category, {}).get(permission, False)


class UserModuleRole(models.Model):
    """
    Extensible module-specific role assignment for users.
    Supports Kaizen, 5S, PPSR, Safety Desk, etc.
    Exactly one role per module per user.
    """
    MODULE_CHOICES = [
        ('kaizen', 'Kaizen Continuous Improvement'),
        ('fives', '5S Workplace Organization'),
        ('ppsr', 'PPSR Problem Solving'),
        ('safety_desk', 'Safety Desk & Red Flags'),
    ]
    ROLE_CHOICES = [
        ('initiator', 'Initiator / Operator'),
        ('committee', 'Committee Member / Reviewer'),
        ('coordinator', 'Module Coordinator / Lead'),
        ('admin', 'Module Administrator'),
    ]
    MINI_FACTORY_CHOICES = [
        ('MF1', 'Mini-Factory 1 (MF1)'),
        ('MF2', 'Mini-Factory 2 (MF2)'),
        ('MF3', 'Mini-Factory 3 (MF3)'),
        ('Central', 'Plant Central / Shared'),
        ('ALL', 'All Mini-Factories (Global)'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='module_roles'
    )
    module_code = models.CharField(max_length=50, choices=MODULE_CHOICES)
    role_name = models.CharField(max_length=50, choices=ROLE_CHOICES, default='initiator')
    mini_factory = models.CharField(max_length=50, choices=MINI_FACTORY_CHOICES, default='MF1')
    assigned_at = models.DateTimeField(auto_now=True)
    assigned_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_module_roles'
    )

    class Meta:
        db_table = 'user_module_roles'
        unique_together = ('user', 'module_code')
        ordering = ['user', 'module_code']

    def __str__(self):
        return f"{self.user.username} → {self.module_code}: {self.role_name} ({self.mini_factory})"


class PasswordResetOTP(models.Model):
    """
    Stores cryptographically hashed One-Time Passwords (OTPs) for password resets.
    Follows zero-plaintext security principles:
    - OTP is stored as a salted cryptographic hash (make_password).
    - 5-minute strict expiration.
    - Locked after 5 failed verification attempts.
    - Single-use flag.
    - Issue of single-use reset token upon successful verification.
    """
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='password_reset_otps'
    )
    otp_hash = models.CharField(
        max_length=255,
        help_text='Salted hash of 6-digit OTP code'
    )
    reset_token_hash = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Salted hash of reset token issued after OTP verification'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempt_count = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'password_reset_otps'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"PasswordResetOTP(user={self.user.username}, valid={self.is_valid})"

    @property
    def is_expired(self) -> bool:
        from django.utils import timezone
        return timezone.now() > self.expires_at

    @property
    def is_locked(self) -> bool:
        return self.attempt_count >= 5

    @property
    def is_valid(self) -> bool:
        return (not self.is_used) and (not self.is_locked) and (not self.is_expired)

    @staticmethod
    def mask_phone_number(phone: str) -> str:
        """
        Mask phone number for safe display (e.g., +91 9876543210 -> +91 XXXXX 3210).
        Preserves country code / leading format and last 4 digits.
        """
        if not phone:
            return ""
        clean = phone.strip()
        if len(clean) <= 4:
            return "••••"
        prefix = ""
        digits = clean
        if clean.startswith('+'):
            parts = clean.split(' ', 1) if ' ' in clean else (clean[:3], clean[3:])
            prefix = parts[0] + " "
            digits = parts[1]
        
        digits_only = "".join(c for c in digits if c.isdigit())
        if len(digits_only) <= 4:
            return f"{prefix}••••"
        masked_middle = "X" * (len(digits_only) - 4)
        last_four = digits_only[-4:]
        return f"{prefix}{masked_middle} {last_four}".strip()
