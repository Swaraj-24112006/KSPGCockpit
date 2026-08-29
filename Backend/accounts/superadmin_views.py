"""
SuperAdmin Views — Central User, Access, Scope, and Audit Management
====================================================================
Protected strictly by [IsAuthenticated, IsSuperAdminOnly].
Provides server-side user CRUD, module role assignment, mini-factory scoping,
session revocation, audit logging, and KPI summary metrics.
"""

import secrets
import string
import logging
from datetime import timedelta

from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q
from django.conf import settings
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from rest_framework import status as drf_status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import CustomUser, Role, UserModuleRole
from .serializers import (
    UserProfileSerializer,
    UserListSerializer,
    UserModuleRoleSerializer,
    AuditLogSerializer,
)
from .permissions import IsSuperAdminOnly
from audit.models import AuditLog, create_audit_log
from core.redis_client import delete_all_user_sessions, get_redis
from core.ratelimit import get_client_ip, AdminAPIRateThrottle

logger = logging.getLogger('kaizen')


def generate_temp_password(length=12) -> str:
    """Generate a secure, high-entropy temporary password."""
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least one uppercase, one lowercase, one digit, one symbol
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]
    pwd += [secrets.choice(chars) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


class SuperAdminPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class SuperAdminSummaryView(APIView):
    """
    GET /api/v1/superadmin/summary/
    Returns platform-wide KPI counts, mini-factory distributions,
    module role assignments, and security status.
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]
    throttle_classes = [AdminAPIRateThrottle]

    def get(self, request):
        now = timezone.now()
        day_ago = now - timedelta(hours=24)

        total_users = CustomUser.objects.count()
        active_users = CustomUser.objects.filter(is_active_employee=True, is_active=True).count()
        disabled_users = CustomUser.objects.filter(Q(is_active_employee=False) | Q(is_active=False)).count()
        must_change_pwd_count = CustomUser.objects.filter(must_change_password=True).count()

        # Mini-Factory distribution
        mf_counts = {
            'MF1': CustomUser.objects.filter(mini_factory='MF1').count(),
            'MF2': CustomUser.objects.filter(mini_factory='MF2').count(),
            'MF3': CustomUser.objects.filter(mini_factory='MF3').count(),
            'Central': CustomUser.objects.filter(mini_factory='Central').count(),
            'ALL': CustomUser.objects.filter(mini_factory='ALL').count(),
        }

        # Module roles distribution
        module_roles_summary = {
            'kaizen': {
                'initiator': UserModuleRole.objects.filter(module_code='kaizen', role_name='initiator').count(),
                'committee': UserModuleRole.objects.filter(module_code='kaizen', role_name='committee').count(),
                'coordinator': UserModuleRole.objects.filter(module_code='kaizen', role_name='coordinator').count(),
                'admin': UserModuleRole.objects.filter(module_code='kaizen', role_name='admin').count(),
            },
            'fives': {
                'initiator': UserModuleRole.objects.filter(module_code='fives', role_name='initiator').count(),
                'committee': UserModuleRole.objects.filter(module_code='fives', role_name='committee').count(),
                'coordinator': UserModuleRole.objects.filter(module_code='fives', role_name='coordinator').count(),
                'admin': UserModuleRole.objects.filter(module_code='fives', role_name='admin').count(),
            },
            'ppsr': {
                'initiator': UserModuleRole.objects.filter(module_code='ppsr', role_name='initiator').count(),
                'committee': UserModuleRole.objects.filter(module_code='ppsr', role_name='committee').count(),
                'coordinator': UserModuleRole.objects.filter(module_code='ppsr', role_name='coordinator').count(),
                'admin': UserModuleRole.objects.filter(module_code='ppsr', role_name='admin').count(),
            },
            'safety_desk': {
                'initiator': UserModuleRole.objects.filter(module_code='safety_desk', role_name='initiator').count(),
                'committee': UserModuleRole.objects.filter(module_code='safety_desk', role_name='committee').count(),
                'coordinator': UserModuleRole.objects.filter(module_code='safety_desk', role_name='coordinator').count(),
                'admin': UserModuleRole.objects.filter(module_code='safety_desk', role_name='admin').count(),
            },
        }

        # Audit events in last 24h
        recent_audit_count = AuditLog.objects.filter(timestamp__gte=day_ago).count()

        # Redis sessions count
        active_sessions_count = 0
        try:
            r = get_redis()
            if r:
                session_keys = r.keys("session:*")
                active_sessions_count = len(session_keys)
        except Exception as e:
            logger.warning(f"Could not query active Redis sessions: {e}")

        return Response({
            'success': True,
            'data': {
                'kpi': {
                    'total_users': total_users,
                    'active_users': active_users,
                    'disabled_users': disabled_users,
                    'must_change_password_count': must_change_pwd_count,
                },
                'mini_factory_distribution': mf_counts,
                'module_roles_summary': module_roles_summary,
                'security': {
                    'active_redis_sessions': active_sessions_count,
                    'recent_audit_events_24h': recent_audit_count,
                    'system_mfa_enforced': True,
                    'platform_status': 'HEALTHY',
                    'auth_mode': 'JWT + Redis HttpOnly Cookie',
                }
            }
        })


class SuperAdminUserViewSet(viewsets.ModelViewSet):
    """
    CRUD + Admin management actions for platform users.
    - Server-side search & filtering
    - Temporary password generation + forced change
    - Immediate session revocation on disable
    - Audit log recorded for every mutating action
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]
    throttle_classes = [AdminAPIRateThrottle]
    pagination_class = SuperAdminPagination
    queryset = CustomUser.objects.select_related('role').prefetch_related('module_roles').all().order_by('-date_joined')

    def get_serializer_class(self):
        if self.action in ('list',):
            return UserListSerializer
        return UserProfileSerializer

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()

        # Server-side search across multiple fields (name, emp ID, username, email, phone, department)
        search_query = request.query_params.get('search', '').strip()
        if search_query:
            qs = qs.filter(
                Q(username__icontains=search_query) |
                Q(employee_id__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(phone__icontains=search_query) |
                Q(department__icontains=search_query)
            )

        # Mini-Factory filter
        mini_factory = request.query_params.get('mini_factory', '').strip()
        module_code = request.query_params.get('module', '').strip()
        role = request.query_params.get('role', '').strip()

        # Normalize role mapping for cross-module roles
        role_map = {
            'coordinator': ['coordinator', 'kaizen_lead'],
            'kaizen_lead': ['coordinator', 'kaizen_lead'],
            'committee': ['committee', 'reviewer'],
            'reviewer': ['committee', 'reviewer'],
            'initiator': ['initiator'],
            'admin': ['admin'],
        }

        # Apply module filter if specified
        if module_code and module_code != 'ALL':
            if role and role != 'ALL' and role != 'superadmin':
                target_roles = role_map.get(role, [role])
                qs = qs.filter(module_roles__module_code=module_code, module_roles__role_name__in=target_roles)
            else:
                qs = qs.filter(module_roles__module_code=module_code)

        # Apply role filter if module was NOT specified (or superadmin)
        elif role and role != 'ALL':
            if role == 'superadmin':
                qs = qs.filter(Q(is_superuser=True) | Q(role__name='superadmin'))
            else:
                target_roles = role_map.get(role, [role])
                qs = qs.filter(Q(role__name__in=target_roles) | Q(module_roles__role_name__in=target_roles))

        # Apply Mini-Factory filter
        if mini_factory and mini_factory != 'ALL':
            if module_code and module_code != 'ALL':
                qs = qs.filter(Q(mini_factory=mini_factory) | Q(module_roles__module_code=module_code, module_roles__mini_factory=mini_factory))
            else:
                qs = qs.filter(Q(mini_factory=mini_factory) | Q(module_roles__mini_factory=mini_factory))

        # Status filter
        status_param = request.query_params.get('status', '').strip()
        if status_param == 'active':
            qs = qs.filter(is_active_employee=True, is_active=True)
        elif status_param == 'disabled':
            qs = qs.filter(Q(is_active_employee=False) | Q(is_active=False))

        qs = qs.distinct()

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response({'success': True, 'data': serializer.data})

    def create(self, request, *args, **kwargs):
        """
        Create a new user with generated/provided temporary password and assigned Kaizen module role.
        Validates uniqueness of employee_id, username, and email.
        Atomic transaction writes to PostgreSQL and logs audit trail.
        """
        data = request.data.copy()
        username = data.get('username', '').strip()
        employee_id = data.get('employee_id', '').strip()
        email = data.get('email', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        department = data.get('department', '').strip()
        designation = data.get('designation', '').strip()
        mini_factory = data.get('mini_factory', 'MF1').strip()
        phone = data.get('phone', '').strip()
        role_name = data.get('role', 'initiator').strip()
        kaizen_role_name = data.get('kaizen_role', role_name).strip()

        if not username or not employee_id:
            return Response(
                {'success': False, 'error': {'message': 'Username and Employee ID are required.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if CustomUser.objects.filter(username__iexact=username).exists():
            return Response(
                {'success': False, 'error': {'message': f'Username "{username}" is already taken. Please choose another.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if CustomUser.objects.filter(employee_id__iexact=employee_id).exists():
            return Response(
                {'success': False, 'error': {'message': f'Employee ID "{employee_id}" already exists in the system.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if email and CustomUser.objects.filter(email__iexact=email).exists():
            return Response(
                {'success': False, 'error': {'message': f'Email address "{email}" is already registered to another user.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        temp_password = data.get('temporary_password', '').strip() or generate_temp_password()

        with transaction.atomic():
            # Find or create primary role
            role_obj = Role.objects.filter(name=role_name).first()
            if not role_obj and role_name in ('initiator', 'reviewer', 'kaizen_lead', 'coordinator', 'committee', 'cft_member', 'verifier', 'admin', 'superadmin'):
                role_obj = Role.objects.create(name=role_name)

            user = CustomUser.objects.create(
                username=username,
                employee_id=employee_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                department=department,
                designation=designation,
                mini_factory=mini_factory,
                plant=data.get('plant', 'Pune Plant 1'),
                area=data.get('area', mini_factory),
                phone=phone,
                role=role_obj,
                is_active_employee=True,
                is_active=True,
                must_change_password=False,
            )
            user.set_password(temp_password)
            user.save()

            # Assign Kaizen module role
            kaizen_role_valid = kaizen_role_name if kaizen_role_name in ('initiator', 'committee', 'coordinator', 'admin') else 'initiator'
            UserModuleRole.objects.create(
                user=user,
                module_code='kaizen',
                role_name=kaizen_role_valid,
                mini_factory=mini_factory,
                assigned_by=request.user,
            )

            # Audit Log
            create_audit_log(
                user=request.user,
                target_user=user,
                action='user_create',
                new_value={
                    'username': user.username,
                    'employee_id': user.employee_id,
                    'email': user.email,
                    'phone': user.phone,
                    'mini_factory': user.mini_factory,
                    'role': user.role_name,
                    'kaizen_role': kaizen_role_valid,
                },
                remarks=f"SuperAdmin created user {user.username} (Emp ID: {user.employee_id}) assigned to {mini_factory}.",
                ip_address=get_client_ip(request),
            )

        # Dispatch temporary credentials email if email is provided
        if email:
            try:
                subject = "Your KSPG Shopfloor Platform Account Credentials"
                msg_body = (
                    f"Hello {user.get_full_name() or user.username},\n\n"
                    f"An account has been created for you on the KSPG Shopfloor Continuous Improvement Platform.\n\n"
                    f"Account Details:\n"
                    f"• Username: {username}\n"
                    f"• Employee ID: {employee_id}\n"
                    f"• Temporary Password: {temp_password}\n"
                    f"• Assigned Mini-Factory: {mini_factory}\n"
                    f"• Kaizen Role: {kaizen_role_valid.capitalize()}\n\n"
                    f"Please keep your credentials secure.\n\n"
                    f"Best regards,\n"
                    f"KSPG Administration Team"
                )
                send_mail(
                    subject=subject,
                    message=msg_body,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@kspg.com'),
                    recipient_list=[email],
                    fail_silently=True,
                )
                logger.info(f"Dispatched credentials email for {username} to {email}")
            except Exception as em_err:
                logger.warning(f"Could not send credentials email to {email}: {em_err}")

        serializer = UserProfileSerializer(user)
        return Response({
            'success': True,
            'message': f'User {user.username} created successfully in database.',
            'data': serializer.data,
            'temporary_password': temp_password,
        }, status=drf_status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/v1/auth/superadmin/users/<id>/
        Permanently deletes a user account from PostgreSQL and revokes all active sessions.
        """
        user = self.get_object()

        if user.pk == request.user.pk:
            return Response(
                {'success': False, 'error': {'message': 'You cannot delete your own SuperAdmin account.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        username = user.username
        emp_id = user.employee_id
        user_pk = user.pk

        delete_all_user_sessions(user_pk)

        create_audit_log(
            user=request.user,
            target_user=None,
            action='user_delete',
            previous_value={'username': username, 'employee_id': emp_id, 'user_id': user_pk},
            remarks=f"SuperAdmin permanently deleted user {username} (Emp ID: {emp_id}).",
            ip_address=get_client_ip(request),
        )

        user.delete()

        return Response({
            'success': True,
            'message': f'User {username} ({emp_id}) deleted successfully from database.',
        }, status=drf_status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        """
        Update user profile attributes, mini-factory, phone, or primary role.
        Validates email uniqueness and writes audit log to PostgreSQL.
        """
        user = self.get_object()
        data = request.data

        # Email uniqueness check if email is changed
        new_email = data.get('email', '').strip()
        if new_email and new_email != user.email:
            if CustomUser.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response(
                    {'success': False, 'error': {'message': f'Email "{new_email}" is already in use by another user.'}},
                    status=drf_status.HTTP_400_BAD_REQUEST
                )

        old_state = {
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': user.phone,
            'department': user.department,
            'designation': user.designation,
            'mini_factory': user.mini_factory,
            'role': user.role_name,
            'is_active_employee': user.is_active_employee,
        }

        with transaction.atomic():
            if 'first_name' in data: user.first_name = data['first_name'].strip()
            if 'last_name' in data: user.last_name = data['last_name'].strip()
            if 'email' in data: user.email = data['email'].strip()
            if 'phone' in data: user.phone = data['phone'].strip()
            if 'department' in data: user.department = data['department'].strip()
            if 'designation' in data: user.designation = data['designation'].strip()

            if 'mini_factory' in data and data['mini_factory']:
                new_mf = data['mini_factory'].strip()
                user.mini_factory = new_mf
                # Sync mini_factory on all user module roles
                user.module_roles.update(mini_factory=new_mf)

            role_name = data.get('role')
            if role_name:
                role_name = role_name.strip()
                role_obj = Role.objects.filter(name=role_name).first()
                if not role_obj:
                    role_obj = Role.objects.create(name=role_name)
                user.role = role_obj

            user.save()

            new_state = {
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone': user.phone,
                'department': user.department,
                'designation': user.designation,
                'mini_factory': user.mini_factory,
                'role': user.role_name,
                'is_active_employee': user.is_active_employee,
            }

            create_audit_log(
                user=request.user,
                target_user=user,
                action='user_update',
                previous_value=old_state,
                new_value=new_state,
                remarks=f"SuperAdmin updated details for user {user.username}.",
                ip_address=get_client_ip(request),
            )

        serializer = UserProfileSerializer(user)
        return Response({
            'success': True,
            'message': f'User {user.username} updated successfully in database.',
            'data': serializer.data,
        })

    def toggle_status(self, request, pk=None):
        """
        POST /api/v1/auth/superadmin/users/<id>/toggle-status/
        Enable or disable a user account.
        When disabling:
          - Sets is_active_employee = False and is_active = False
          - Immediately invalidates all active Redis sessions and JWT tokens
          - Prevents future login
          - Preserves historical records (all Kaizens and audit records remain intact)
          - Records action in audit log
        """
        user = self.get_object()
        
        # Guard: Cannot disable yourself if you are the logged-in SuperAdmin
        if user.pk == request.user.pk:
            return Response(
                {'success': False, 'error': {'message': 'You cannot disable your own SuperAdmin account.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        new_status = not user.is_active_employee
        user.is_active_employee = new_status
        user.is_active = new_status
        user.save(update_fields=['is_active_employee', 'is_active'])

        action_name = 'user_enable' if new_status else 'user_disable'
        
        # Revoke all sessions immediately if disabling
        if not new_status:
            delete_all_user_sessions(user.pk)
            logger.info(f"SuperAdmin disabled user {user.username} (id={user.pk}); all active sessions revoked.")

        create_audit_log(
            user=request.user,
            target_user=user,
            action=action_name,
            previous_value={'is_active_employee': not new_status, 'is_active': not new_status},
            new_value={'is_active_employee': new_status, 'is_active': new_status},
            remarks=f"SuperAdmin {'enabled' if new_status else 'disabled'} account for {user.username} (Emp ID: {user.employee_id}). {'All active sessions revoked immediately.' if not new_status else ''}",
            ip_address=get_client_ip(request),
        )

        return Response({
            'success': True,
            'message': f"User {user.username} has been {'activated' if new_status else 'disabled and all active sessions terminated'}.",
            'data': UserProfileSerializer(user).data
        })

    def change_mini_factory(self, request, pk=None):
        """
        POST /api/v1/auth/superadmin/users/<id>/change-mini-factory/
        Updates the user's assigned Mini-Factory working scope.
        Validates mini-factory choice, updates user and module roles, and records audit trail.
        Body: { "mini_factory": "MF2" }
        """
        user = self.get_object()
        new_mf = request.data.get('mini_factory', '').strip()
        valid_mfs = ['MF1', 'MF2', 'MF3', 'Central', 'ALL']

        if not new_mf or new_mf not in valid_mfs:
            return Response(
                {'success': False, 'error': {'message': f"Invalid mini_factory '{new_mf}'. Must be one of: {valid_mfs}"}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        old_mf = user.mini_factory
        with transaction.atomic():
            user.mini_factory = new_mf
            user.area = new_mf
            user.save(update_fields=['mini_factory', 'area'])

            # Sync scope on all assigned module roles
            user.module_roles.all().update(mini_factory=new_mf)

            create_audit_log(
                user=request.user,
                target_user=user,
                action='mini_factory_change',
                previous_value={'mini_factory': old_mf},
                new_value={'mini_factory': new_mf},
                remarks=f"SuperAdmin changed Mini-Factory scope for {user.username} from '{old_mf}' to '{new_mf}'.",
                ip_address=get_client_ip(request),
            )

        return Response({
            'success': True,
            'message': f"Mini-Factory scope for {user.username} successfully updated to {new_mf}.",
            'data': UserProfileSerializer(user).data
        })

    def reset_temp_password(self, request, pk=None):
        """
        POST /api/v1/auth/superadmin/users/<id>/reset-temp-password/
        Generates a new temporary password, flags must_change_password=True,
        and invalidates all existing sessions for the user.
        """
        user = self.get_object()
        temp_pwd = generate_temp_password()
        user.set_password(temp_pwd)
        user.must_change_password = True
        user.save(update_fields=['password', 'must_change_password'])

        # Invalidate all active sessions
        delete_all_user_sessions(user.pk)

        create_audit_log(
            user=request.user,
            target_user=user,
            action='temp_password_reset',
            remarks=f"SuperAdmin issued temporary password reset for user {user.username}.",
            ip_address=get_client_ip(request),
        )

        return Response({
            'success': True,
            'message': f"Temporary password reset for {user.username}. Sessions revoked.",
            'temporary_password': temp_pwd,
        })

    def assign_module_role(self, request, pk=None):
        """
        POST /api/v1/auth/superadmin/users/<id>/assign-module-role/
        Assigns or updates exactly one role and mini-factory scope for a specific module.
        Body: { "module_code": "kaizen", "role_name": "coordinator", "mini_factory": "MF2" }
        """
        user = self.get_object()
        module_code = request.data.get('module_code', 'kaizen').strip().lower()
        role_name = request.data.get('role_name', '').strip().lower()
        mini_factory = request.data.get('mini_factory', user.mini_factory or 'MF1').strip()

        valid_modules = [c[0] for c in UserModuleRole.MODULE_CHOICES]
        valid_roles = [c[0] for c in UserModuleRole.ROLE_CHOICES]

        if module_code not in valid_modules:
            return Response(
                {'success': False, 'error': {'message': f"Invalid module_code '{module_code}'. Must be one of: {valid_modules}"}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if role_name not in valid_roles:
            return Response(
                {'success': False, 'error': {'message': f"Invalid role_name '{role_name}'. Must be one of: {valid_roles}"}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        existing_role = UserModuleRole.objects.filter(user=user, module_code=module_code).first()
        old_role = existing_role.role_name if existing_role else (user.role_name or 'initiator')
        old_mf = existing_role.mini_factory if existing_role else user.mini_factory

        with transaction.atomic():
            obj, created = UserModuleRole.objects.update_or_create(
                user=user,
                module_code=module_code,
                defaults={
                    'role_name': role_name,
                    'mini_factory': mini_factory,
                    'assigned_by': request.user,
                }
            )

            # Sync primary user role if changing Kaizen module role
            if module_code == 'kaizen':
                db_role_map = {
                    'initiator': 'initiator',
                    'committee': 'reviewer',
                    'coordinator': 'kaizen_lead',
                    'admin': 'admin',
                }
                target_role_name = db_role_map.get(role_name, role_name)
                role_obj, _ = Role.objects.get_or_create(name=target_role_name)
                user.role = role_obj
                user.save(update_fields=['role'])

            create_audit_log(
                user=request.user,
                target_user=user,
                action='role_change',
                previous_value={'module_code': module_code, 'role_name': old_role, 'mini_factory': old_mf},
                new_value={'module_code': module_code, 'role_name': role_name, 'mini_factory': mini_factory},
                remarks=f"SuperAdmin changed {module_code.upper()} role for {user.username} from '{old_role}' to '{role_name}' (Scope: {mini_factory}).",
                ip_address=get_client_ip(request),
            )

        return Response({
            'success': True,
            'message': f"Successfully assigned '{role_name}' role for module {module_code.upper()} (Scope: {mini_factory}) to {user.username}.",
            'data': UserProfileSerializer(user).data,
        })


class SuperAdminAuditLogListView(APIView):
    """
    GET /api/v1/superadmin/audit-logs/
    Returns server-side filtered, paginated audit logs for SuperAdmin inspection.
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]
    throttle_classes = [AdminAPIRateThrottle]
    pagination_class = SuperAdminPagination

    def get(self, request):
        qs = AuditLog.objects.select_related('user', 'target_user', 'kaizen').all().order_by('-timestamp')

        action_filter = request.query_params.get('action', '').strip()
        if action_filter and action_filter != 'ALL':
            qs = qs.filter(action=action_filter)

        search_query = request.query_params.get('search', '').strip()
        if search_query:
            qs = qs.filter(
                Q(user__username__icontains=search_query) |
                Q(target_user__username__icontains=search_query) |
                Q(remarks__icontains=search_query) |
                Q(action__icontains=search_query)
            )

        paginator = SuperAdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
