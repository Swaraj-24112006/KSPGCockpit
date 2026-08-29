"""
Accounts Serializers — Registration, Login, User Management
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser, Role, UserModuleRole
from audit.models import AuditLog


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions']


class UserModuleRoleSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source='get_module_code_display', read_only=True)
    role_display = serializers.CharField(source='get_role_name_display', read_only=True)
    mini_factory_display = serializers.CharField(source='get_mini_factory_display', read_only=True)

    class Meta:
        model = UserModuleRole
        fields = [
            'id', 'module_code', 'module_display', 'role_name',
            'role_display', 'mini_factory', 'mini_factory_display',
            'assigned_at',
        ]
        read_only_fields = ['id', 'assigned_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration with password validation."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'employee_id', 'department',
            'designation', 'plant', 'area', 'mini_factory', 'phone', 'role',
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'employee_id': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for viewing/updating user profiles."""
    role_detail = RoleSerializer(source='role', read_only=True)
    module_roles = UserModuleRoleSerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()
    role_category = serializers.SerializerMethodField()
    is_superadmin = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'employee_id', 'department', 'designation',
            'plant', 'area', 'mini_factory', 'phone', 'role', 'role_detail',
            'role_category', 'is_superadmin', 'is_active_employee',
            'must_change_password', 'module_roles',
            'last_activity', 'date_joined', 'last_login',
        ]
        read_only_fields = ['id', 'username', 'date_joined', 'last_login', 'last_activity', 'is_superadmin']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role_category(self, obj) -> str:
        """
        Returns the normalised RBAC category string for the frontend.
        One of: 'superadmin' | 'admin' | 'coordinator' | 'committee' | 'initiator'
        """
        return obj.role_category


class UserListSerializer(serializers.ModelSerializer):
    """Compact serializer for user listings with module-specific roles and mini-factory."""
    role_name = serializers.CharField(source='role.get_name_display', read_only=True, default='Initiator')
    full_name = serializers.SerializerMethodField()
    role_category = serializers.SerializerMethodField()
    module_roles = UserModuleRoleSerializer(many=True, read_only=True)
    is_superadmin = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone',
            'employee_id', 'full_name', 'department', 'designation',
            'plant', 'area', 'mini_factory', 'role', 'role_name',
            'role_category', 'is_superadmin', 'is_active_employee',
            'must_change_password', 'module_roles', 'last_login', 'date_joined',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role_category(self, obj) -> str:
        return obj.role_category


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class ForcePasswordChangeSerializer(serializers.Serializer):
    """Serializer for mandatory first-time password changes."""
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return attrs


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for immutable audit trail logs."""
    user_name = serializers.SerializerMethodField()
    target_user_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'target_user', 'target_user_name',
            'kaizen', 'action', 'action_display', 'previous_value',
            'new_value', 'timestamp', 'remarks', 'ip_address',
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'System'

    def get_target_user_name(self, obj):
        if obj.target_user:
            return obj.target_user.get_full_name() or obj.target_user.username
        return None
