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
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import CustomUser, Role, UserModuleRole
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.http import Http404
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import (
    ValidationError,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    MethodNotAllowed,
    Throttled,
)
from ppsr.exceptions import ppsr_exception_handler
from .serializers import (
    UserProfileSerializer,
    UserListSerializer,
    UserModuleRoleSerializer,
    SuperAdminUserSerializer,
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


def superadmin_exception_handler(exc, context):
    """
    Standardized exception handler for all SuperAdmin views.
    Guarantees consistent JSON structure:
    {
        "success": false,
        "error": {
            "message": "...",
            "fields": { ... }  # optional, present on validation errors
        }
    }
    Never returns an HTML error page.
    """
    if isinstance(exc, ValidationError):
        message = 'Validation failed.'
        fields = None
        if isinstance(exc.detail, dict):
            fields = {}
            for k, v in exc.detail.items():
                if isinstance(v, list) and v:
                    fields[k] = [str(item) for item in v]
                else:
                    fields[k] = [str(v)]
            # Pick first error as message
            for v in exc.detail.values():
                if isinstance(v, list) and v:
                    message = str(v[0])
                    break
                elif isinstance(v, str):
                    message = v
                    break
        elif isinstance(exc.detail, list) and exc.detail:
            message = str(exc.detail[0])
        elif hasattr(exc, 'detail'):
            message = str(exc.detail)

        error_data = {'message': message}
        if fields:
            error_data['fields'] = fields
        return Response({'success': False, 'error': error_data}, status=drf_status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, PermissionDenied):
        msg = str(exc.detail) if hasattr(exc, 'detail') else 'You do not have permission to perform this action.'
        return Response({'success': False, 'error': {'message': msg}}, status=drf_status.HTTP_403_FORBIDDEN)

    if isinstance(exc, NotAuthenticated):
        msg = str(exc.detail) if hasattr(exc, 'detail') else 'Authentication credentials were not provided.'
        return Response({'success': False, 'error': {'message': msg}}, status=drf_status.HTTP_401_UNAUTHORIZED)

    if isinstance(exc, (NotFound, Http404)):
        msg = str(exc.detail) if hasattr(exc, 'detail') and not isinstance(exc, Http404) else 'The requested user or resource was not found.'
        return Response({'success': False, 'error': {'message': msg}}, status=drf_status.HTTP_404_NOT_FOUND)

    if isinstance(exc, MethodNotAllowed):
        req = context.get('request')
        m = getattr(req, 'method', 'HTTP')
        return Response({'success': False, 'error': {'message': f"Method '{m}' not allowed."}}, status=drf_status.HTTP_405_METHOD_NOT_ALLOWED)

    if isinstance(exc, Throttled):
        wait = int(exc.wait) if getattr(exc, 'wait', None) is not None else 60
        res = Response({
            'success': False,
            'error': {
                'message': f'Request rate limit exceeded. Retry after {wait} seconds.',
            }
        }, status=drf_status.HTTP_429_TOO_MANY_REQUESTS)
        res['Retry-After'] = str(wait)
        return res

    # Check django-ratelimit Ratelimited exception
    try:
        from django_ratelimit.exceptions import Ratelimited
        if isinstance(exc, Ratelimited):
            res = Response({
                'success': False,
                'error': {
                    'message': 'Rate limit exceeded. Please try again later.'
                }
            }, status=drf_status.HTTP_429_TOO_MANY_REQUESTS)
            res['Retry-After'] = '60'
            return res
    except ImportError:
        pass

    if isinstance(exc, ProtectedError):
        protected_counts = {}
        for obj in exc.protected_objects:
            model_name = obj._meta.verbose_name.title()
            protected_counts[model_name] = protected_counts.get(model_name, 0) + 1
        summary = ", ".join(f"{cnt} {name}(s)" for name, cnt in protected_counts.items())
        return Response({
            'success': False,
            'error': {
                'message': (
                    f"Cannot permanently delete resource because it is referenced by existing records ({summary}). "
                    f"Please disable the account instead to revoke access while preserving audit history, or use Force Delete."
                ),
                'has_protected_records': True,
                'protected_records': protected_counts,
            }
        }, status=drf_status.HTTP_400_BAD_REQUEST)

    # Fallback to DRF/PPSR exception handler
    response = ppsr_exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and 'success' in response.data and 'error' in response.data:
            return response
        msg = 'An error occurred.'
        if isinstance(response.data, dict) and 'detail' in response.data:
            msg = str(response.data['detail'])
        return Response({'success': False, 'error': {'message': msg}}, status=response.status_code)

    # Uncaught exceptions — return JSON 500, never an HTML page
    logger.exception(f"Unhandled SuperAdmin exception: {exc}")
    return Response({
        'success': False,
        'error': {
            'message': str(exc) if settings.DEBUG else 'An unexpected error occurred. Please try again later.'
        }
    }, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)


MODULE_ROLES_MAP = {
    'kaizen': ['initiator', 'committee', 'coordinator', 'admin', 'none'],
    'ppsr': ['initiator', 'committee', 'coordinator', 'admin', 'none'],
    'fives': ['initiator', 'committee', 'coordinator', 'admin', 'none'],
    'safety_desk': ['initiator', 'committee', 'coordinator', 'admin', 'none'],
    'tpm': ['initiator', 'committee', 'coordinator', 'admin', 'none'],
    'mps': ['demand_planner', 'supply_planner', 'production', 'management', 'none'],
    'checklist': ['coordinator', 'operator', 'none'],
}


def is_last_active_superadmin(user: CustomUser) -> bool:
    """
    Returns True if the given user is an active SuperAdmin and there are NO other
    active SuperAdmins in the system. Prevents lockout by protecting the last SuperAdmin.
    """
    if not (user.is_superuser or (user.role and user.role.name == 'superadmin')):
        return False
    active_sa_count = CustomUser.objects.filter(
        is_active=True,
        is_active_employee=True,
    ).filter(
        Q(is_superuser=True) | Q(role__name='superadmin')
    ).count()
    return active_sa_count <= 1


def clean_param(val, default=''):
    """Safe string extraction for API inputs, preventing NoneType crashes."""
    if val is None:
        return default
    return str(val).strip()


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

    def get_exception_handler(self):
        return superadmin_exception_handler

    def get(self, request):
        now = timezone.now()
        day_ago = now - timedelta(hours=24)

        total_users = CustomUser.objects.count()
        active_users = CustomUser.objects.filter(is_active_employee=True, is_active=True).count()
        disabled_users = CustomUser.objects.filter(Q(is_active_employee=False) | Q(is_active=False)).count()
        must_change_pwd_count = CustomUser.objects.filter(must_change_password=True).count()
        superadmin_count = CustomUser.objects.filter(Q(is_superuser=True) | Q(role__name='superadmin')).count()

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
            'mps': {
                'demand_planner': UserModuleRole.objects.filter(module_code='mps', role_name='demand_planner').count(),
                'supply_planner': UserModuleRole.objects.filter(module_code='mps', role_name='supply_planner').count(),
                'production': UserModuleRole.objects.filter(module_code='mps', role_name='production').count(),
                'management': UserModuleRole.objects.filter(module_code='mps', role_name='management').count(),
            },
            'checklist': {
                'coordinator': UserModuleRole.objects.filter(module_code='checklist', role_name='coordinator').count(),
                'operator': UserModuleRole.objects.filter(module_code='checklist', role_name='operator').count(),
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
                    'superadmin_count': superadmin_count,
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


class SuperAdminRbacMetadataView(APIView):
    """
    GET /api/v1/auth/superadmin/rbac-metadata/
    Returns platform-wide RBAC metadata:
    - module-to-roles map
    - valid modules
    - valid mini-factories
    - system roles
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]
    throttle_classes = [AdminAPIRateThrottle]

    def get_exception_handler(self):
        return superadmin_exception_handler

    def get(self, request):
        return Response({
            'success': True,
            'data': {
                'modules': list(MODULE_ROLES_MAP.keys()),
                'module_roles_map': MODULE_ROLES_MAP,
                'mini_factories': [c[0] for c in UserModuleRole.MINI_FACTORY_CHOICES],
                'system_roles': [
                    {'name': c[0], 'label': c[1]} for c in Role.ROLE_CHOICES
                ],
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
    serializer_class = SuperAdminUserSerializer
    queryset = CustomUser.objects.select_related('role').prefetch_related('module_roles').all().order_by('-date_joined')

    def get_serializer_class(self):
        return SuperAdminUserSerializer

    def get_exception_handler(self):
        return superadmin_exception_handler

    @action(detail=False, methods=['get'], url_path='rbac-metadata')
    def rbac_metadata(self, request):
        """GET /api/v1/auth/superadmin/users/rbac-metadata/"""
        view = SuperAdminRbacMetadataView()
        return view.get(request)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = SuperAdminUserSerializer(instance)
        return Response(serializer.data)

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
                if role.lower() in ('none', 'no_access', 'no access'):
                    active_users = UserModuleRole.objects.filter(
                        module_code=module_code
                    ).exclude(role_name='none').values_list('user_id', flat=True)
                    qs = qs.exclude(id__in=active_users)
                else:
                    target_roles = role_map.get(role, [role])
                    qs = qs.filter(module_roles__module_code=module_code, module_roles__role_name__in=target_roles)
            else:
                qs = qs.filter(module_roles__module_code=module_code).exclude(module_roles__role_name='none')

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
            serializer = SuperAdminUserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = SuperAdminUserSerializer(qs, many=True)
        return Response({'success': True, 'data': serializer.data})

    def create(self, request, *args, **kwargs):
        """
        Create a new user.
        - Only username, employee ID and password are required.
        - Blank email, phone, names, department, designation, plant, area and mini-factory accepted.
        - Uniqueness is checked only when a value is given.
        - Password strength is a warning shown to the admin, not a block.
        - Validate role names against MODULE_ROLES_MAP only when being set, not when omitted.
        """
        data = request.data
        username = clean_param(data.get('username'))
        employee_id = clean_param(data.get('employee_id'))
        password = clean_param(data.get('password'))

        # 1. Required fields
        if not username or not employee_id:
            return Response(
                {'success': False, 'error': {'message': 'Username and Employee ID are required.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if not password:
            return Response(
                {'success': False, 'error': {'message': 'Password is required. Super Admin must set the password for the new user.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        # 2. Uniqueness (only when given)
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

        email = clean_param(data.get('email'))
        if email:
            try:
                validate_email(email)
            except DjangoValidationError:
                raise ValidationError({'email': ['Enter a valid email address.']})
            if CustomUser.objects.filter(email__iexact=email).exists():
                raise ValidationError({'email': [f'Email address "{email}" is already registered to another user.']})

        # 3. Password strength warning (warning, not a block)
        password_warning = None
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(password)
        except Exception as pe:
            password_warning = str(pe)

        # 4. Validate role names against MODULE_ROLES_MAP only when being set
        module_roles_to_set = {}
        for mod, allowed_roles in MODULE_ROLES_MAP.items():
            key = f"{mod}_role"
            if key in data:
                val = clean_param(data.get(key)).lower()
                if val:  # only validate if provided
                    if val not in allowed_roles:
                        return Response(
                            {'success': False, 'error': {'message': f"Invalid {key} '{val}'. Must be one of: {allowed_roles}"}},
                            status=drf_status.HTTP_400_BAD_REQUEST
                        )
                    module_roles_to_set[mod] = val

        # Optional profile fields (accept blank)
        first_name = clean_param(data.get('first_name'))
        last_name = clean_param(data.get('last_name'))
        phone = clean_param(data.get('phone'))
        department = clean_param(data.get('department'))
        designation = clean_param(data.get('designation'))
        plant = clean_param(data.get('plant'))
        mini_factory = clean_param(data.get('mini_factory'))
        area = clean_param(data.get('area'), default=mini_factory)

        with transaction.atomic():
            # Derive primary role if kaizen_role or role explicitly given
            role_obj = None
            if 'kaizen' in module_roles_to_set:
                kz_val = module_roles_to_set['kaizen']
                if kz_val != 'none':
                    db_role_map = {
                        'initiator': 'initiator',
                        'committee': 'reviewer',
                        'coordinator': 'kaizen_lead',
                        'admin': 'admin',
                    }
                    p_name = db_role_map.get(kz_val, 'initiator')
                    role_obj, _ = Role.objects.get_or_create(name=p_name)
            elif 'role' in data and data.get('role'):
                r_val = clean_param(data.get('role')).lower()
                role_obj = Role.objects.filter(name=r_val).first()
                if not role_obj:
                    role_obj, _ = Role.objects.get_or_create(name=r_val)

            user = CustomUser.objects.create(
                username=username,
                employee_id=employee_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                department=department,
                designation=designation,
                mini_factory=mini_factory,
                plant=plant,
                area=area,
                phone=phone,
                role=role_obj,
                is_active_employee=True,
                is_active=True,
                must_change_password=False,
            )
            user.set_password(password)
            user.save()

            for mod, r_name in module_roles_to_set.items():
                if r_name != 'none':
                    UserModuleRole.objects.create(
                        user=user,
                        module_code=mod,
                        role_name=r_name,
                        mini_factory=mini_factory or 'MF1',
                        assigned_by=request.user,
                    )

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
                    'module_roles': module_roles_to_set,
                },
                remarks=f"SuperAdmin created user {user.username} (Emp ID: {user.employee_id}).",
                ip_address=get_client_ip(request),
            )

        if email:
            try:
                module_access_lines = []
                for mod, r_name in module_roles_to_set.items():
                    module_access_lines.append(f"• {mod.capitalize()} Role: {r_name.capitalize()}")
                module_summary = "\n".join(module_access_lines) if module_access_lines else "None assigned"

                subject = "Your KSPG Shopfloor Platform Account Credentials"
                msg_body = (
                    f"Hello {user.get_full_name() or user.username},\n\n"
                    f"An account has been created for you on the KSPG Continuous Improvement Platform.\n\n"
                    f"Account Details:\n"
                    f"• Username: {username}\n"
                    f"• Employee ID: {employee_id}\n"
                    f"• Assigned Mini-Factory: {mini_factory or 'None'}\n"
                    f"\nModule Access:\n{module_summary}\n\n"
                    f"Please contact your administrator for your login password.\n\n"
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

        serializer = SuperAdminUserSerializer(user)
        resp_data = {
            'success': True,
            'message': f'User {user.username} created successfully.',
            'data': serializer.data,
        }
        if password_warning:
            resp_data['warning'] = password_warning
        return Response(resp_data, status=drf_status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/v1/auth/superadmin/users/<id>/
        Permanently remove a user account from the database.
        - Last SuperAdmin cannot be deleted.
        - Cannot delete self.
        - If user is referenced by protected models (e.g. Kaizen, Verification, Voting):
            - If ?force=true: cascades and removes associated records within transaction.
            - Else: returns 400 Bad Request with informative error and has_protected_records=True.
        - Invalidates all sessions on Redis and records in AuditLog.
        """
        user = self.get_object()

        if user.pk == request.user.pk:
            return Response(
                {'success': False, 'error': {'message': 'You cannot delete your own SuperAdmin account.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if is_last_active_superadmin(user):
            return Response(
                {'success': False, 'error': {'message': 'Cannot delete the last active SuperAdmin account in the system.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        username = user.username
        emp_id = user.employee_id
        user_pk = user.pk

        force = (
            request.query_params.get('force', '').lower() in ('true', '1') or
            (isinstance(request.data, dict) and request.data.get('force') is True)
        )

        try:
            with transaction.atomic():
                if force:
                    from kaizens.models import Kaizen
                    from workflow.models import WorkflowHistory
                    from verification.models import KaizenVerification, KaizenClosure
                    from voting.models import VotingSession, CftVote

                    kz_count = Kaizen.objects.filter(created_by=user).count()
                    Kaizen.objects.filter(created_by=user).delete()
                    KaizenVerification.objects.filter(verifier=user).delete()
                    KaizenClosure.objects.filter(closed_by=user).delete()
                    VotingSession.objects.filter(opened_by=user).delete()
                    CftVote.objects.filter(voter=user).delete()
                    WorkflowHistory.objects.filter(performed_by=user).delete()

                    user.delete()
                    delete_all_user_sessions(user_pk)

                    create_audit_log(
                        user=request.user,
                        target_user=None,
                        action='user_delete',
                        previous_value={'username': username, 'employee_id': emp_id, 'user_id': user_pk, 'force': True},
                        remarks=f"SuperAdmin force-deleted user {username} (Emp ID: {emp_id}) and cleaned up {kz_count} associated Kaizen(s).",
                        ip_address=get_client_ip(request),
                    )

                    return Response({
                        'success': True,
                        'message': f'User {username} ({emp_id}) and associated records force-deleted successfully.',
                    }, status=drf_status.HTTP_200_OK)

                else:
                    user.delete()
                    delete_all_user_sessions(user_pk)

                    create_audit_log(
                        user=request.user,
                        target_user=None,
                        action='user_delete',
                        previous_value={'username': username, 'employee_id': emp_id, 'user_id': user_pk},
                        remarks=f"SuperAdmin permanently deleted user {username} (Emp ID: {emp_id}).",
                        ip_address=get_client_ip(request),
                    )

                    return Response({
                        'success': True,
                        'message': f'User {username} ({emp_id}) deleted successfully from database.',
                    }, status=drf_status.HTTP_200_OK)

        except ProtectedError as pe:
            protected_counts = {}
            for obj in pe.protected_objects:
                model_name = obj._meta.verbose_name.title()
                protected_counts[model_name] = protected_counts.get(model_name, 0) + 1
            summary = ", ".join(f"{cnt} {name}(s)" for name, cnt in protected_counts.items())
            return Response({
                'success': False,
                'error': {
                    'message': (
                        f"Cannot permanently delete user '{username}' because they have associated records in the system ({summary}). "
                        f"To preserve historical audit records, please disable the user instead to revoke all access, or use Force Delete if this is a test account."
                    ),
                    'has_protected_records': True,
                    'protected_records': protected_counts,
                }
            }, status=drf_status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        """
        PATCH /api/v1/auth/superadmin/users/<id>/
        Update user profile attributes and per-module role assignments.
        - A blank value never blocks a save.
        - Only fields present in the request are changed.
        - Handle null safely (no 500).
        - A blank mini_factory in the request does nothing.
        - Do not touch the primary role unless the Kaizen role is actually changing.
        - A kaizen_role: 'none' for a user with no Kaizen role must be a no-op.
        - Role names validated against MODULE_ROLES_MAP only when being set, not when omitted.
        """
        user = self.get_object()
        data = request.data

        # Guard: last superadmin
        if is_last_active_superadmin(user):
            if data.get('is_active_employee') is False or data.get('is_active') is False:
                return Response(
                    {'success': False, 'error': {'message': 'Cannot deactivate the last active SuperAdmin account in the system.'}},
                    status=drf_status.HTTP_400_BAD_REQUEST
                )
            if 'role' in data and data['role'] and clean_param(data['role']).lower() != 'superadmin':
                return Response(
                    {'success': False, 'error': {'message': 'Cannot demote the last active SuperAdmin account in the system.'}},
                    status=drf_status.HTTP_400_BAD_REQUEST
                )

        # Validate email uniqueness & format ONLY IF present in request and non-blank
        if 'email' in data:
            new_email = clean_param(data.get('email'))
            if new_email and new_email != user.email:
                try:
                    validate_email(new_email)
                except DjangoValidationError:
                    raise ValidationError({'email': ['Enter a valid email address.']})
                if CustomUser.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                    raise ValidationError({'email': [f'Email "{new_email}" is already in use by another user.']})

        # Validate role names against MODULE_ROLES_MAP only when being set
        for mod, allowed_roles in MODULE_ROLES_MAP.items():
            key = f"{mod}_role"
            if key in data:
                val = clean_param(data.get(key)).lower()
                if val:  # only validate if non-blank
                    if val not in allowed_roles:
                        return Response(
                            {'success': False, 'error': {'message': f"Invalid {key} '{val}'. Must be one of: {allowed_roles}"}},
                            status=drf_status.HTTP_400_BAD_REQUEST
                        )

        # Capture old state for audit
        old_state = {
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': user.phone,
            'department': user.department,
            'designation': user.designation,
            'plant': user.plant,
            'area': user.area,
            'mini_factory': user.mini_factory,
            'role': user.role_name,
            'is_active_employee': user.is_active_employee,
        }

        with transaction.atomic():
            # Only fields present in request are changed. A blank value never blocks a save.
            if 'first_name' in data:
                user.first_name = clean_param(data.get('first_name'))
            if 'last_name' in data:
                user.last_name = clean_param(data.get('last_name'))
            if 'email' in data:
                user.email = clean_param(data.get('email'))
            if 'phone' in data:
                user.phone = clean_param(data.get('phone'))
            if 'department' in data:
                user.department = clean_param(data.get('department'))
            if 'designation' in data:
                user.designation = clean_param(data.get('designation'))
            if 'plant' in data:
                user.plant = clean_param(data.get('plant'))
            if 'area' in data:
                user.area = clean_param(data.get('area'))

            if 'is_active_employee' in data:
                val = data.get('is_active_employee')
                if val is not None:
                    user.is_active_employee = bool(val)
                    user.is_active = bool(val)

            # A blank mini_factory in the request does nothing.
            if 'mini_factory' in data:
                new_mf = clean_param(data.get('mini_factory'))
                if new_mf:  # Only if non-blank!
                    user.mini_factory = new_mf
                    user.module_roles.update(mini_factory=new_mf)

            # Kaizen module role & primary role handling:
            # "Do not touch the primary role unless the Kaizen role is actually changing.
            # A kaizen_role: 'none' for a user with no Kaizen role must be a no-op."
            if 'kaizen_role' in data:
                new_kz = clean_param(data.get('kaizen_role')).lower()
                if new_kz:
                    current_kz_mr = user.module_roles.filter(module_code='kaizen').first()
                    current_kz_role = current_kz_mr.role_name if current_kz_mr else 'none'
                    
                    if new_kz != current_kz_role:
                        # Role is actually changing!
                        if new_kz != 'none':
                            UserModuleRole.objects.update_or_create(
                                user=user,
                                module_code='kaizen',
                                defaults={
                                    'role_name': new_kz,
                                    'mini_factory': user.mini_factory or 'MF1',
                                    'assigned_by': request.user,
                                }
                            )
                            db_role_map = {
                                'initiator': 'initiator',
                                'committee': 'reviewer',
                                'coordinator': 'kaizen_lead',
                                'admin': 'admin',
                            }
                            primary_name = db_role_map.get(new_kz, 'initiator')
                            role_obj, _ = Role.objects.get_or_create(name=primary_name)
                            user.role = role_obj
                        else:
                            # new_kz == 'none' and previously had a role
                            if current_kz_mr:
                                current_kz_mr.role_name = 'none'
                                current_kz_mr.save(update_fields=['role_name'])
                            role_obj, _ = Role.objects.get_or_create(name='initiator')
                            user.role = role_obj

            # Other module roles:
            for mod in ('ppsr', 'fives', 'safety_desk', 'tpm', 'mps', 'checklist'):
                key = f"{mod}_role"
                if key in data:
                    r_val = clean_param(data.get(key)).lower()
                    if r_val:
                        cur_mr = user.module_roles.filter(module_code=mod).first()
                        cur_role = cur_mr.role_name if cur_mr else 'none'
                        if r_val != cur_role:
                            UserModuleRole.objects.update_or_create(
                                user=user,
                                module_code=mod,
                                defaults={
                                    'role_name': r_val,
                                    'mini_factory': user.mini_factory or 'MF1',
                                    'assigned_by': request.user,
                                }
                            )

            # Explicit 'role' or 'role_name' if passed and kaizen_role not in data
            if ('role' in data or 'role_name' in data) and 'kaizen_role' not in data:
                r_val = clean_param(data.get('role_name') or data.get('role')).lower()
                if r_val:
                    r_obj = Role.objects.filter(name=r_val).first()
                    if not r_obj:
                        r_obj, _ = Role.objects.get_or_create(name=r_val)
                    user.role = r_obj

            user.save()

            new_state = {
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone': user.phone,
                'department': user.department,
                'designation': user.designation,
                'plant': user.plant,
                'area': user.area,
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

        serializer = SuperAdminUserSerializer(user)
        return Response({
            'success': True,
            'message': f'User {user.username} updated successfully.',
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
        Protected by last-superadmin guard and self-disable block.
        """
        user = self.get_object()

        # Guard: Cannot disable yourself if you are the logged-in SuperAdmin
        if user.pk == request.user.pk:
            return Response(
                {'success': False, 'error': {'message': 'You cannot disable your own SuperAdmin account.'}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if user.is_active_employee and is_last_active_superadmin(user):
            return Response(
                {'success': False, 'error': {'message': 'Cannot disable the last active SuperAdmin account in the system.'}},
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
            remarks=f"SuperAdmin {'enabled' if new_status else 'disabled and revoked sessions for'} user {user.username}.",
            ip_address=get_client_ip(request),
        )

        return Response({
            'success': True,
            'message': f"User {user.username} has been {'activated' if new_status else 'disabled and all active sessions terminated'}.",
            'data': SuperAdminUserSerializer(user).data
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
            'data': SuperAdminUserSerializer(user).data
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
        Assigns, updates, or revokes a role for a specific module.
        Body: { "module_code": "kaizen", "role_name": "coordinator", "mini_factory": "MF2" }
        Pass role_name='none' to revoke access for that module.
        """
        user = self.get_object()
        module_code = clean_param(request.data.get('module_code', 'kaizen')).lower()
        role_name = clean_param(request.data.get('role_name')).lower()
        mini_factory = clean_param(request.data.get('mini_factory'), default=user.mini_factory or 'MF1')

        valid_modules = list(MODULE_ROLES_MAP.keys())
        if module_code not in valid_modules:
            return Response(
                {'success': False, 'error': {'message': f"Invalid module_code '{module_code}'. Must be one of: {valid_modules}"}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        allowed_roles = MODULE_ROLES_MAP[module_code]
        if role_name not in allowed_roles:
            return Response(
                {'success': False, 'error': {'message': f"Invalid role_name '{role_name}' for module '{module_code}'. Must be one of: {allowed_roles}"}},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        existing_role = UserModuleRole.objects.filter(user=user, module_code=module_code).first()
        old_role = existing_role.role_name if existing_role else 'none'
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
                if role_name != 'none':
                    db_role_map = {
                        'initiator': 'initiator',
                        'committee': 'reviewer',
                        'coordinator': 'kaizen_lead',
                        'admin': 'admin',
                    }
                    target_role_name = db_role_map.get(role_name, 'initiator')
                    role_obj, _ = Role.objects.get_or_create(name=target_role_name)
                    user.role = role_obj
                    user.save(update_fields=['role'])
                else:
                    if old_role != 'none':
                        role_obj, _ = Role.objects.get_or_create(name='initiator')
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
            'message': f"Successfully {'revoked' if role_name == 'none' else 'assigned'} '{role_name}' role for module {module_code.upper()} to {user.username}.",
            'data': SuperAdminUserSerializer(user).data,
        })

class SuperAdminAuditLogListView(APIView):
    """
    GET /api/v1/superadmin/audit-logs/
    Returns server-side filtered, paginated audit logs for SuperAdmin inspection.
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]
    throttle_classes = [AdminAPIRateThrottle]
    pagination_class = SuperAdminPagination

    def get_exception_handler(self):
        return superadmin_exception_handler

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
