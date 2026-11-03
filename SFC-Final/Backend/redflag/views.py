import csv
import io
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.db import connection, transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, serializers
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import UserRateThrottle, ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import (
    Department, Plant, Line, Station, ProductModel, Employee, RedFlagConfig,
    Attachment, RedFlag, StageHistory, RedFlagAuditLog,
    RedFlagContainment, RedFlagRootCause, SustenanceCheck, RedFlagClosure,
    EscalationLink,
)
from .enums import (
    RedFlagType,
    Severity,
    Category5M,
    Status,
    ContainmentStatus,
    QaCustodianStatus,
    Repetitive,
    CheckStatus,
    EscalationModule,
    AttachmentKind,
)
from .permissions import (
    user_roles, ROLE_PLANT_HEAD, ROLE_QUALITY_CUSTODIAN, allowed_actions,
    IsPlantHead,
)
from .exceptions import UnprocessableEntity, ConflictError
from .serializers import (
    UserMeSerializer,
    PlantLookupSerializer,
    DepartmentLookupSerializer,
    ProductModelLookupSerializer,
    EmployeeLookupSerializer,
    RedFlagConfigLookupSerializer,
    LookupsResponseSerializer,
    AttachmentSerializer,
    RedFlagReadSerializer,
    RedFlagPatchSerializer,
    RedFlagDeleteSerializer,
    ContainmentSubmitSerializer,
    ContainmentApproveSerializer,
    ContainmentRejectSerializer,
    RootCauseSubmitSerializer,
    SustenanceStartSerializer,
    SustenanceCheckLogSerializer,
    RedFlagCloseSerializer,
    SustenanceDueCheckSerializer,
    EscalationLinkSerializer,
    PpsrEscalationResponseSerializer,
    KaizenEscalationResponseSerializer,
    FiveSEscalationResponseSerializer,
    DashboardAnalyticsResponseSerializer,
    ExecutiveAnalyticsResponseSerializer,
    SummaryAnalyticsResponseSerializer,
    PresentationDataResponseSerializer,
    HealthCheckResponseSerializer,
)
from .selectors import (
    parse_analytics_filters,
    get_dashboard_analytics,
    get_executive_analytics,
    get_summary_analytics,
    get_presentation_data,
)
from .services.raise_red_flag import raise_red_flag
from .services.submit_containment import submit_containment
from .services.containment_approval import approve_containment, reject_containment
from .services.save_root_cause import save_root_cause
from .services.sustenance_engine import start_sustenance, log_month_check
from .services.close_red_flag import close_red_flag
from .services.escalate_red_flag import escalate_red_flag

logger = logging.getLogger(__name__)


# ===================== Phase 1 Views =====================

class MeView(APIView):
    """
    Returns current authenticated user details, roles, employee profile.
    GET /api/redflags/me
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserMeSerializer

    @extend_schema(
        summary="Get Current User Identity & Roles",
        responses={200: UserMeSerializer}
    )
    def get(self, request):
        user = request.user
        employee = getattr(user, 'employee_profile', None)
        if not employee and user.is_authenticated:
            dept = Department.objects.filter(name__iexact=getattr(user, 'department', '')).first() or Department.objects.first()
            plant = Plant.objects.filter(code__iexact=getattr(user, 'plant', '')).first() or Plant.objects.first()
            emp_code = getattr(user, 'employee_id', None) or f"EMP-{user.username.upper()[:6]}"
            employee, _ = Employee.objects.get_or_create(
                user=user,
                defaults={
                    'employee_code': emp_code,
                    'full_name': user.get_full_name() or user.username,
                    'designation': getattr(user, 'designation', 'Staff') or 'Staff',
                    'department': dept,
                    'plant': plant,
                    'email': user.email or '',
                    'is_active': True,
                }
            )
        roles = user_roles(user)
        
        data = {
            'user_id': user.id,
            'employee_id': employee.id if employee else None,
            'label': employee.label if employee else (user.get_full_name() or user.username),
            'department': employee.department.name if employee and employee.department else None,
            'roles': roles,
            'is_plant_head': ROLE_PLANT_HEAD in roles,
            'is_quality_custodian': ROLE_QUALITY_CUSTODIAN in roles,
        }
        serializer = UserMeSerializer(data)
        return Response(serializer.data)


class LookupsView(APIView):
    """
    Returns all master data, dropdown choices, and configuration needed by Red Flag frontend.
    GET /api/redflags/lookups
    """
    permission_classes = [IsAuthenticated]
    serializer_class = LookupsResponseSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'lookups'

    @extend_schema(
        summary="Get System Lookups, Master Data, Enums, and Configuration",
        responses={200: LookupsResponseSerializer}
    )
    def get(self, request):
        plants = Plant.objects.filter(is_active=True).prefetch_related('lines__stations')
        plants_data = PlantLookupSerializer(plants, many=True).data

        models = ProductModel.objects.filter(is_active=True)
        models_data = ProductModelLookupSerializer(models, many=True).data

        departments = Department.objects.filter(is_active=True)
        departments_data = DepartmentLookupSerializer(departments, many=True).data

        employees = Employee.objects.filter(is_active=True).select_related('department')
        dept_param = request.query_params.get('department')
        plant_param = request.query_params.get('plant')

        if dept_param:
            employees = employees.filter(department__name__iexact=dept_param)
        if plant_param:
            employees = employees.filter(plant__code__iexact=plant_param)

        employees_data = EmployeeLookupSerializer(employees, many=True).data

        def enum_to_choices(enum_cls):
            return [{'value': choice.value, 'label': choice.label} for choice in enum_cls]

        enums_data = {
            'red_flag_type': enum_to_choices(RedFlagType),
            'severity': enum_to_choices(Severity),
            'category_5m': enum_to_choices(Category5M),
            'status': enum_to_choices(Status),
            'containment_status': enum_to_choices(ContainmentStatus),
            'qa_custodian_status': enum_to_choices(QaCustodianStatus),
            'repetitive': enum_to_choices(Repetitive),
            'check_status': enum_to_choices(CheckStatus),
            'escalation_module': enum_to_choices(EscalationModule),
        }

        config_obj = RedFlagConfig.get_config()
        config_data = RedFlagConfigLookupSerializer(config_obj).data

        response_payload = {
            'plants': plants_data,
            'models': models_data,
            'departments': departments_data,
            'employees': employees_data,
            'enums': enums_data,
            'config': config_data,
        }
        return Response(response_payload)


# ===================== Phase 2 Views =====================

def _filter_redflags(query_params):
    """Shared query filtering for list and CSV export endpoints."""
    queryset = RedFlag.objects.filter(deleted_at__isnull=True).select_related(
        'plant', 'line', 'station', 'model',
        'raised_by', 'raised_by_department',
        'target_department', 'target_person',
        'qa_custodian', 'evidence_photo', 'closure_responsibility',
        'root_cause', 'closure'
    ).prefetch_related('stage_history', 'containment_attempts', 'sustenance_checks', 'escalation_links')

    q = query_params.get('q')
    if q:
        queryset = queryset.filter(
            Q(red_flag_no__icontains=q) |
            Q(description__icontains=q) |
            Q(raised_by_name__icontains=q) |
            Q(target_person_name__icontains=q) |
            Q(line_name__icontains=q) |
            Q(station_name__icontains=q)
        )

    status_val = query_params.get('status')
    if status_val and status_val.lower() != 'all':
        queryset = queryset.filter(status__iexact=status_val)

    target_dept = query_params.get('targetDepartment') or query_params.get('target_department')
    if target_dept and target_dept.lower() != 'all':
        queryset = queryset.filter(target_department_name__iexact=target_dept)

    raised_dept = query_params.get('raisedByDepartment') or query_params.get('raised_by_department')
    if raised_dept and raised_dept.lower() != 'all':
        queryset = queryset.filter(raised_by_department_name__iexact=raised_dept)

    severity = query_params.get('severity')
    if severity and severity.lower() != 'all':
        queryset = queryset.filter(severity__iexact=severity)

    category_5m = query_params.get('category5M') or query_params.get('category_5m')
    if category_5m and category_5m.lower() != 'all':
        queryset = queryset.filter(category_5m__iexact=category_5m)

    defect_type = (
        query_params.get('defectType') or query_params.get('defect_type') or
        query_params.get('redFlagType') or query_params.get('red_flag_type')
    )
    if defect_type and defect_type.lower() != 'all':
        queryset = queryset.filter(red_flag_type__iexact=defect_type)

    plant = (
        query_params.get('plant') or query_params.get('mfName') or query_params.get('mf_name')
    )
    if plant and plant.lower() != 'all':
        queryset = queryset.filter(plant_name__iexact=plant)

    date_from = query_params.get('dateFrom') or query_params.get('date_from')
    if date_from:
        queryset = queryset.filter(raised_at__date__gte=date_from)

    date_to = query_params.get('dateTo') or query_params.get('date_to')
    if date_to:
        queryset = queryset.filter(raised_at__date__lte=date_to)

    stage = query_params.get('stage')
    if stage == 'awaitingContainment':
        queryset = queryset.filter(status=Status.OPEN)
    elif stage == 'awaitingQuality':
        queryset = queryset.filter(status=Status.CONTAINED)

    ordering = query_params.get('ordering', '-raised_at')
    ordering_map = {
        '-raisedAt': '-raised_at',
        'raisedAt': 'raised_at',
        '-raisedDate': '-raised_at',
        'raisedDate': 'raised_at',
        'srNo': 'sr_no',
        '-srNo': '-sr_no',
        'redFlagNo': 'red_flag_no',
        '-redFlagNo': '-red_flag_no',
    }
    db_ordering = ordering_map.get(ordering, ordering)
    return queryset.order_by(db_ordering)


class AttachmentUploadView(APIView):
    """
    Multipart image upload to MinIO.
    POST /api/redflags/attachments
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle, UserRateThrottle]
    throttle_scope = 'attachment_upload'
    serializer_class = AttachmentSerializer

    @extend_schema(
        summary="Upload Attachment Photo",
        responses={201: AttachmentSerializer}
    )
    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            raise UnprocessableEntity({'file': 'No file was provided.'})

        kind = request.data.get('kind', AttachmentKind.T0_EVIDENCE)
        if kind not in AttachmentKind.values:
            kind = AttachmentKind.T0_EVIDENCE

        from .storage import validate_and_process_image, upload_to_minio, presign
        try:
            processed_bytes, content_type, width, height, sha256_hex = validate_and_process_image(uploaded_file)
        except Exception as e:
            raise UnprocessableEntity({'file': str(e)})

        bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'redflag-evidence')
        object_key = upload_to_minio(processed_bytes, content_type, kind)

        attachment = Attachment.objects.create(
            kind=kind,
            bucket=bucket,
            object_key=object_key,
            original_name=uploaded_file.name or 'upload.jpg',
            content_type=content_type,
            size_bytes=len(processed_bytes),
            width=width,
            height=height,
            sha256=sha256_hex,
            uploaded_by=request.user,
        )

        url = presign(attachment)
        return Response({
            'id': attachment.id,
            'url': url,
            'kind': attachment.kind,
        }, status=status.HTTP_201_CREATED)


class RedFlagListCreateView(APIView):
    """
    List / filter Red Flags and Raise a new Red Flag (Stage 1).
    GET /api/redflags
    POST /api/redflags
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RedFlagReadSerializer

    @extend_schema(
        summary="List and Filter Red Flags",
        responses={200: RedFlagReadSerializer(many=True)}
    )
    def get(self, request):
        queryset = _filter_redflags(request.query_params)
        serializer = RedFlagReadSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Raise a Red Flag (Stage 1 - Detection)",
        responses={201: RedFlagReadSerializer}
    )
    def post(self, request):
        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        flag = raise_red_flag(request.user, request.data, ip=ip, user_agent=user_agent)
        serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RedFlagDetailView(APIView):
    """
    Read, PATCH (limited edit), and DELETE (soft delete) a Red Flag.
    GET /api/redflags/:id
    PATCH /api/redflags/:id
    DELETE /api/redflags/:id
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RedFlagReadSerializer

    def _get_flag(self, pk):
        return get_object_or_404(
            RedFlag.objects.select_related(
                'plant', 'line', 'station', 'model',
                'raised_by', 'raised_by_department',
                'target_department', 'target_person',
                'qa_custodian', 'evidence_photo', 'closure_responsibility',
                'root_cause', 'closure'
            ).prefetch_related('stage_history', 'containment_attempts', 'sustenance_checks', 'escalation_links'),
            pk=pk,
            deleted_at__isnull=True
        )

    @extend_schema(
        summary="Get Red Flag Details",
        responses={200: RedFlagReadSerializer}
    )
    def get(self, request, pk):
        flag = self._get_flag(pk)
        serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Edit Red Flag Details (Stage 1 fields)",
        request=RedFlagPatchSerializer,
        responses={200: RedFlagReadSerializer}
    )
    def patch(self, request, pk):
        flag = self._get_flag(pk)
        user = request.user
        roles = user_roles(user)
        is_plant_head = ROLE_PLANT_HEAD in roles

        # 1. Concurrency check: rowVersion required
        client_version = request.data.get('rowVersion')
        if client_version is None:
            client_version = request.data.get('row_version')
        if client_version is None:
            raise UnprocessableEntity({'rowVersion': 'rowVersion is required for optimistic concurrency.'})

        try:
            if int(client_version) != flag.row_version:
                raise ConflictError(
                    f"Conflict: Stale rowVersion {client_version}. Current database version is {flag.row_version}."
                )
        except (ValueError, TypeError):
            raise ConflictError("Conflict: Invalid rowVersion provided.")

        # 2. Permission check: who can edit
        actions = allowed_actions(user, flag)
        if 'editDetails' not in actions:
            return Response(
                {'success': False, 'error': 'You do not have permission to edit this Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 3. Identity fields: Plant Head only
        identity_fields = ['raisedBy', 'raised_by', 'raisedByDepartment', 'raised_by_department', 'raisedByRole', 'raised_by_role']
        for id_field in identity_fields:
            if id_field in request.data and not is_plant_head:
                return Response(
                    {'success': False, 'error': f"Only Plant Head can edit identity field '{id_field}'."},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = RedFlagPatchSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            raise UnprocessableEntity(serializer.errors)

        validated = serializer.validated_data
        changes = {}

        with transaction.atomic():
            # Refresh lock
            flag = RedFlag.objects.select_for_update().get(pk=pk)

            # Simple text/choice fields
            field_mappings = [
                ('description', 'description'),
                ('red_flag_type', 'red_flag_type'),
                ('red_flag_sub_type', 'red_flag_sub_type'),
                ('severity', 'severity'),
                ('category_5m', 'category_5m'),
                ('repetitive_occurrence', 'repetitive_occurrence'),
                ('team_leader', 'team_leader'),
                ('target_date', 'target_date'),
                ('qa_custodian_notes', 'qa_custodian_notes'),
                ('raised_by_role', 'raised_by_role'),
            ]

            for req_field, model_field in field_mappings:
                if req_field in validated:
                    new_val = validated[req_field]
                    old_val = getattr(flag, model_field)
                    if str(old_val) != str(new_val):
                        changes[model_field] = [str(old_val), str(new_val)]
                        setattr(flag, model_field, new_val)

            # Target Department FK
            if 'target_department' in validated:
                dept_id = validated['target_department']
                try:
                    dept = Department.objects.get(id=dept_id, is_active=True)
                    if flag.target_department_id != dept.id:
                        changes['target_department'] = [flag.target_department_name, dept.name]
                        flag.target_department = dept
                        flag.target_department_name = dept.name
                except Department.DoesNotExist:
                    raise UnprocessableEntity({'target_department': 'Invalid department.'})

            # Target Person FK
            if 'target_person' in validated:
                person_id = validated['target_person']
                try:
                    emp = Employee.objects.get(id=person_id, is_active=True)
                    if flag.target_person_id != emp.id:
                        changes['target_person'] = [flag.target_person_name, emp.label]
                        flag.target_person = emp
                        flag.target_person_name = emp.label
                except Employee.DoesNotExist:
                    raise UnprocessableEntity({'target_person': 'Invalid target person.'})

            # Plant FK
            if 'plant' in validated:
                plant_id = validated['plant']
                try:
                    p = Plant.objects.get(id=plant_id, is_active=True)
                    if flag.plant_id != p.id:
                        changes['plant'] = [flag.plant_name, p.code]
                        flag.plant = p
                        flag.plant_name = p.code
                except Plant.DoesNotExist:
                    raise UnprocessableEntity({'plant': 'Invalid plant.'})

            # Line FK
            if 'line' in validated:
                line_id = validated['line']
                try:
                    l = Line.objects.get(id=line_id, is_active=True)
                    if flag.line_id != l.id:
                        changes['line'] = [flag.line_name, l.name]
                        flag.line = l
                        flag.line_name = l.name
                except Line.DoesNotExist:
                    raise UnprocessableEntity({'line': 'Invalid line.'})

            # Station FK
            if 'station' in validated:
                station_id = validated['station']
                try:
                    s = Station.objects.get(id=station_id, is_active=True)
                    if flag.station_id != s.id:
                        changes['station'] = [flag.station_name, s.name]
                        flag.station = s
                        flag.station_name = s.name
                except Station.DoesNotExist:
                    raise UnprocessableEntity({'station': 'Invalid station.'})

            # Model FK
            if 'model' in validated:
                model_id = validated['model']
                try:
                    m = ProductModel.objects.get(id=model_id, is_active=True)
                    if flag.model_id != m.id:
                        changes['model'] = [flag.model_name, m.name]
                        flag.model = m
                        flag.model_name = m.name
                except ProductModel.DoesNotExist:
                    raise UnprocessableEntity({'model': 'Invalid model.'})

            # QA Custodian FK
            if 'qa_custodian' in validated:
                qc_id = validated['qa_custodian']
                try:
                    qc = Employee.objects.get(id=qc_id, is_active=True)
                    if flag.qa_custodian_id != qc.id:
                        changes['qa_custodian'] = [flag.qa_custodian_name, qc.label]
                        flag.qa_custodian = qc
                        flag.qa_custodian_name = qc.label
                except Employee.DoesNotExist:
                    raise UnprocessableEntity({'qa_custodian': 'Invalid QA custodian.'})

            # Identity: Raised By (Plant Head only)
            if is_plant_head and 'raised_by' in validated:
                rb_id = validated['raised_by']
                try:
                    rb = Employee.objects.get(id=rb_id, is_active=True)
                    if flag.raised_by_id != rb.id:
                        changes['raised_by'] = [flag.raised_by_name, rb.label]
                        flag.raised_by = rb
                        flag.raised_by_name = rb.label
                except Employee.DoesNotExist:
                    raise UnprocessableEntity({'raised_by': 'Invalid raised-by employee.'})

            if is_plant_head and 'raised_by_department' in validated:
                rbd_id = validated['raised_by_department']
                try:
                    rbd = Department.objects.get(id=rbd_id, is_active=True)
                    if flag.raised_by_department_id != rbd.id:
                        changes['raised_by_department'] = [flag.raised_by_department_name, rbd.name]
                        flag.raised_by_department = rbd
                        flag.raised_by_department_name = rbd.name
                except Department.DoesNotExist:
                    raise UnprocessableEntity({'raised_by_department': 'Invalid raised-by department.'})

            if changes:
                flag.row_version += 1
                flag.save()

                ip = request.META.get('REMOTE_ADDR')
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                RedFlagAuditLog.objects.create(
                    red_flag=flag,
                    actor=user,
                    action='EDITED',
                    changes=changes,
                    ip=ip,
                    user_agent=user_agent,
                )

        read_serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(read_serializer.data)

    @extend_schema(
        summary="Soft Delete Red Flag (Plant Head only)",
        request=RedFlagDeleteSerializer,
        responses={200: dict}
    )
    def delete(self, request, pk):
        user = request.user
        roles = user_roles(user)
        if ROLE_PLANT_HEAD not in roles:
            return Response(
                {'success': False, 'error': 'Only Plant Head can delete a Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'success': False, 'error': 'Deletion reason is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        flag = get_object_or_404(RedFlag, pk=pk, deleted_at__isnull=True)
        flag.deleted_at = timezone.now()
        flag.deleted_by = user
        flag.save(update_fields=['deleted_at', 'deleted_by'])

        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        RedFlagAuditLog.objects.create(
            red_flag=flag,
            actor=user,
            action='DELETED',
            changes={'reason': ['', reason]},
            ip=ip,
            user_agent=user_agent,
        )

        return Response({'message': 'Red Flag deleted successfully.'}, status=status.HTTP_200_OK)


class RedFlagExportCSVView(APIView):
    """
    Export filtered Red Flags to CSV with UTF-8 BOM and formula injection protection.
    GET /api/redflags/export.csv
    """
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def _sanitize(self, val):
        if val is None:
            return ''
        s = str(val)
        if s and s[0] in ('=', '+', '-', '@'):
            return "'" + s
        return s

    @extend_schema(
        summary="Export Filtered Red Flags to CSV",
        responses={(200, 'text/csv'): bytes}
    )
    def get(self, request):
        queryset = _filter_redflags(request.query_params)

        headers = [
            "Sr No", "Red Flag No", "Raised Date", "Raised By", "Originating Dept",
            "Target Dept", "Target Person", "Plant Area", "Station", "Model",
            "Type", "5M Category", "Severity", "Description", "Quarantined WIP",
            "QA Custodian", "Status", "Sustenance Start", "M1 Audit", "M2 Audit", "M3 Audit", "Sustenance Achieved"
        ]

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)

        for flag in queryset:
            row = [
                self._sanitize(flag.sr_no),
                self._sanitize(flag.red_flag_no),
                self._sanitize(flag.raised_at.strftime('%Y-%m-%d') if flag.raised_at else ''),
                self._sanitize(flag.raised_by_name),
                self._sanitize(flag.raised_by_department_name),
                self._sanitize(flag.target_department_name),
                self._sanitize(flag.target_person_name),
                self._sanitize(flag.line_name),
                self._sanitize(flag.station_name),
                self._sanitize(flag.model_name),
                self._sanitize(flag.red_flag_type),
                self._sanitize(flag.category_5m),
                self._sanitize(flag.severity),
                self._sanitize(flag.description),
                self._sanitize(0),
                self._sanitize(flag.qa_custodian_name),
                self._sanitize(flag.status),
                self._sanitize(flag.sustenance_start_date.strftime('%Y-%m-%d') if flag.sustenance_start_date else ''),
                self._sanitize(''),
                self._sanitize(''),
                self._sanitize(''),
                self._sanitize('YES' if flag.sustenance_achieved else 'NO'),
            ]
            writer.writerow(row)

        csv_text = output.getvalue()
        # UTF-8 with BOM: \xef\xbb\xbf
        bom = b'\xef\xbb\xbf'
        content = bom + csv_text.encode('utf-8')

        filename = f"SFC_RedFlags_Master_{datetime.now().strftime('%Y-%m-%d')}.csv"
        response = HttpResponse(content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


# ===================== Phase 3 & 4 Views =====================

def _fetch_refreshed_flag(pk):
    """Helper to fetch a fresh flag instance with all relations prefetched."""
    return get_object_or_404(
        RedFlag.objects.select_related(
            'plant', 'line', 'station', 'model',
            'raised_by', 'raised_by_department',
            'target_department', 'target_person',
            'qa_custodian', 'evidence_photo', 'closure_responsibility',
            'root_cause', 'closure'
        ).prefetch_related('stage_history', 'containment_attempts', 'sustenance_checks', 'escalation_links'),
        pk=pk,
        deleted_at__isnull=True
    )


class ContainmentSubmitView(APIView):
    """
    Submit Stage 2 Immediate Containment & Physical Quarantine.
    POST /api/redflags/:id/containment
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ContainmentSubmitSerializer

    @extend_schema(
        summary="Submit Stage 2 Immediate Containment & Quarantine",
        request=ContainmentSubmitSerializer,
        responses={200: RedFlagReadSerializer}
    )
    def post(self, request, pk):
        flag = _fetch_refreshed_flag(pk)
        actions = allowed_actions(request.user, flag)
        if 'submitContainment' not in actions:
            return Response(
                {'success': False, 'error': 'You do not have permission to submit containment for this Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        submit_containment(
            flag_id=pk,
            user=request.user,
            data=serializer.validated_data,
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        read_serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)




class ContainmentApproveView(APIView):
    """
    Quality Custodian approves physical containment & quarantine.
    POST /api/redflags/:id/containment/approve
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ContainmentApproveSerializer

    @extend_schema(
        summary="Approve Stage 2 Containment",
        request=ContainmentApproveSerializer,
        responses={200: RedFlagReadSerializer}
    )
    def post(self, request, pk):
        flag = _fetch_refreshed_flag(pk)
        actions = allowed_actions(request.user, flag)
        if 'approveContainment' not in actions:
            return Response(
                {'success': False, 'error': 'You do not have permission to approve containment for this Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        approve_containment(
            flag_id=pk,
            user=request.user,
            notes=serializer.validated_data.get('notes', ''),
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        read_serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)


class ContainmentRejectView(APIView):
    """
    Quality Custodian rejects physical containment.
    Flag is reset to Open, requiring Target Person to redo Stage 2.
    POST /api/redflags/:id/containment/reject
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ContainmentRejectSerializer

    @extend_schema(
        summary="Reject Stage 2 Containment",
        request=ContainmentRejectSerializer,
        responses={200: RedFlagReadSerializer}
    )
    def post(self, request, pk):
        flag = _fetch_refreshed_flag(pk)
        actions = allowed_actions(request.user, flag)
        if 'rejectContainment' not in actions:
            return Response(
                {'success': False, 'error': 'You do not have permission to reject containment for this Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        reject_containment(
            flag_id=pk,
            user=request.user,
            reason=serializer.validated_data.get('reason'),
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        read_serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)


class RootCauseSubmitView(APIView):
    """
    Submit Stage 3 5-Why Root Cause Analysis and Systematic Permanent Action.
    POST /api/redflags/:id/root-cause
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RootCauseSubmitSerializer

    @extend_schema(
        summary="Submit Stage 3 Root Cause and CAPA",
        request=RootCauseSubmitSerializer,
        responses={200: RedFlagReadSerializer}
    )
    def post(self, request, pk):
        flag = _fetch_refreshed_flag(pk)
        actions = allowed_actions(request.user, flag)
        if 'saveRootCause' not in actions:
            return Response(
                {'success': False, 'error': 'You do not have permission to save root cause for this Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        save_root_cause(
            flag_id=pk,
            user=request.user,
            data=serializer.validated_data,
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        read_serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        return self.post(request, pk)




class SustenanceStartView(APIView):
    """
    Quality Custodian verifies CAPA and initiates the 3-month (30/60/90-day) sustenance watch.
    POST /api/redflags/:id/sustenance/start
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SustenanceStartSerializer

    @extend_schema(
        summary="Start Sustenance Tracking (Verify CAPA & Schedule 30/60/90 Audits)",
        request=SustenanceStartSerializer,
        responses={200: RedFlagReadSerializer}
    )
    def post(self, request, pk):
        flag = _fetch_refreshed_flag(pk)
        roles = user_roles(request.user)
        if not (ROLE_PLANT_HEAD in roles or ROLE_QUALITY_CUSTODIAN in roles):
            return Response(
                {'success': False, 'error': 'You do not have permission to start sustenance for this Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        start_sustenance(
            flag_id=pk,
            user=request.user,
            notes=serializer.validated_data.get('notes', ''),
            standardization_updates=serializer.validated_data.get('standardization_updates'),
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        read_serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)




class SustenanceCheckLogView(APIView):
    """
    Log 30/60/90-day sustenance audit results (Passed | Recurrence Detected).
    POST /api/redflags/:id/sustenance/checks/:month
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SustenanceCheckLogSerializer

    @extend_schema(
        summary="Log Sustenance Audit Check (Month 1, 2, or 3)",
        request=SustenanceCheckLogSerializer,
        responses={200: RedFlagReadSerializer}
    )
    def post(self, request, pk, month):
        flag = _fetch_refreshed_flag(pk)
        roles = user_roles(request.user)
        if not (ROLE_PLANT_HEAD in roles or ROLE_QUALITY_CUSTODIAN in roles):
            return Response(
                {'success': False, 'error': f'You do not have permission to log Month {month} audit for this Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        log_month_check(
            flag_id=pk,
            month=int(month),
            user=request.user,
            data=serializer.validated_data,
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        read_serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)




class SustenanceDueView(APIView):
    """
    List pending sustenance checks due within a lookahead window (feeds 'Other' tab).
    GET /api/redflags/sustenance/due?withinDays=7
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SustenanceDueCheckSerializer

    @extend_schema(
        summary="Get Pending Sustenance Checks Due or Overdue",
        parameters=[
            OpenApiParameter(name='withinDays', type=int, location=OpenApiParameter.QUERY, description='Lookahead window in days (default 7)')
        ],
        responses={200: SustenanceDueCheckSerializer(many=True)}
    )
    def get(self, request):
        try:
            within_days = int(request.query_params.get('withinDays') or request.query_params.get('within_days') or 7)
        except (ValueError, TypeError):
            within_days = 7

        today = timezone.localdate()
        cutoff_date = today + timedelta(days=within_days)

        checks = SustenanceCheck.objects.filter(
            status=CheckStatus.PENDING,
            scheduled_date__lte=cutoff_date,
            red_flag__deleted_at__isnull=True,
            red_flag__status=Status.UNDER_SUSTENANCE
        ).select_related('red_flag').order_by('scheduled_date')

        serializer = SustenanceDueCheckSerializer(checks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RedFlagCloseView(APIView):
    """
    Close a Red Flag with dual QA and Plant Head sign-offs.
    POST /api/redflags/:id/close
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RedFlagCloseSerializer

    @extend_schema(
        summary="Close Red Flag with Sign-offs and Evidence",
        request=RedFlagCloseSerializer,
        responses={200: RedFlagReadSerializer}
    )
    def post(self, request, pk):
        flag = _fetch_refreshed_flag(pk)
        roles = user_roles(request.user)
        if not (ROLE_PLANT_HEAD in roles or ROLE_QUALITY_CUSTODIAN in roles):
            return Response(
                {'success': False, 'error': 'You do not have permission to close this Red Flag.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        close_red_flag(
            flag_id=pk,
            user=request.user,
            data=serializer.validated_data,
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        read_serializer = RedFlagReadSerializer(flag, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)


# ===================== Phase 5 Views: Cross-Module Escalations =====================

class EscalatePpsrView(APIView):
    """
    Escalate Red Flag to 8D PPSR.
    POST /api/redflags/:id/escalate-ppsr
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Escalate Red Flag to 8D PPSR",
        request=None,
        responses={200: PpsrEscalationResponseSerializer}
    )
    def post(self, request, pk):
        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        flag, link, target_record, created = escalate_red_flag(
            flag_id=pk,
            module=EscalationModule.PPSR,
            user=request.user,
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        return Response({
            'red_flag': RedFlagReadSerializer(flag, context={'request': request}).data,
            'ppsr': target_record,
            'link': EscalationLinkSerializer(link).data
        }, status=status.HTTP_200_OK)


class ConvertKaizenView(APIView):
    """
    Convert Red Flag to Kaizen Poka-Yoke.
    POST /api/redflags/:id/convert-kaizen
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Convert Red Flag to Kaizen Poka-Yoke",
        request=None,
        responses={200: KaizenEscalationResponseSerializer}
    )
    def post(self, request, pk):
        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        flag, link, target_record, created = escalate_red_flag(
            flag_id=pk,
            module=EscalationModule.KAIZEN,
            user=request.user,
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        return Response({
            'red_flag': RedFlagReadSerializer(flag, context={'request': request}).data,
            'kaizen': target_record,
            'link': EscalationLinkSerializer(link).data
        }, status=status.HTTP_200_OK)


class LinkFiveSRedTagView(APIView):
    """
    Link Red Flag to 5S Red Tag Holding.
    POST /api/redflags/:id/link-fives
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Link Red Flag to 5S Red Tag Holding",
        request=None,
        responses={200: FiveSEscalationResponseSerializer}
    )
    def post(self, request, pk):
        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        flag, link, target_record, created = escalate_red_flag(
            flag_id=pk,
            module=EscalationModule.FIVES_RED_TAG,
            user=request.user,
            ip=ip,
            user_agent=user_agent
        )

        flag = _fetch_refreshed_flag(pk)
        return Response({
            'red_flag': RedFlagReadSerializer(flag, context={'request': request}).data,
            'red_tag': target_record,
            'link': EscalationLinkSerializer(link).data
        }, status=status.HTTP_200_OK)


# ===================== Phase 6: Analytics & Presentation Views =====================

class RedFlagDashboardAnalyticsView(APIView):
    """
    GET /api/redflags/analytics/dashboard
    Returns comprehensive analytics for the interactive Red Flag dashboard.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'analytics'

    @extend_schema(
        summary="Red Flag Dashboard Analytics",
        responses={200: DashboardAnalyticsResponseSerializer}
    )
    def get(self, request):
        qs = parse_analytics_filters(request.query_params)
        data = get_dashboard_analytics(qs)
        return Response(data, status=status.HTTP_200_OK)


class RedFlagExecutiveAnalyticsView(APIView):
    """
    GET /api/redflags/analytics/executive
    Returns executive deck analytics for presentation slides.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'analytics'

    @extend_schema(
        summary="Red Flag Executive Analytics Deck",
        responses={200: ExecutiveAnalyticsResponseSerializer}
    )
    def get(self, request):
        qs = parse_analytics_filters(request.query_params)
        data = get_executive_analytics(qs)
        return Response(data, status=status.HTTP_200_OK)


class RedFlagSummaryAnalyticsView(APIView):
    """
    GET /api/redflags/analytics/summary
    Returns summary analytics for Global Dashboard and sidebar badge.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'analytics'

    @extend_schema(
        summary="Red Flag Summary & Global Dashboard Analytics",
        responses={200: SummaryAnalyticsResponseSerializer}
    )
    def get(self, request):
        qs = parse_analytics_filters(request.query_params)
        data = get_summary_analytics(qs)
        return Response(data, status=status.HTTP_200_OK)


class RedFlagPresentationModeView(APIView):
    """
    GET /api/redflags/:id/presentation
    Returns 4-stage presentation data, queue, and allowed actions.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'analytics'

    @extend_schema(
        summary="Red Flag Presentation Mode Data",
        responses={200: PresentationDataResponseSerializer}
    )
    def get(self, request, pk):
        try:
            flag = RedFlag.objects.select_related(
                'plant', 'line', 'station', 'model', 'raised_by_department',
                'target_department', 'evidence_photo', 'closure_responsibility',
                'root_cause', 'closure'
            ).prefetch_related(
                'containment_attempts__photo',
                'containment_attempts__action_taken_by',
                'containment_attempts__verified_by',
                'sustenance_checks__auditor',
                'stage_history', 'attachments', 'escalation_links'
            ).get(id=pk, deleted_at__isnull=True)
        except RedFlag.DoesNotExist:
            raise NotFound("Red Flag not found.")

        data = get_presentation_data(flag, request.user, request.query_params)
        return Response(data, status=status.HTTP_200_OK)


class HealthCheckView(APIView):
    """
    GET /api/redflags/health
    Service health check verifying PostgreSQL database and MinIO storage connectivity.
    Returns 200 OK if healthy, 503 Service Unavailable if any component is degraded.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Service Health Check (Database + MinIO)",
        responses={
            200: HealthCheckResponseSerializer,
            503: HealthCheckResponseSerializer,
        }
    )
    def get(self, request):
        db_ok = False
        db_error = None
        minio_ok = False
        minio_error = None

        # 1. Database check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
            db_ok = True
        except Exception as e:
            db_error = str(e)
            logger.error("Health check: DB failure: %s", e)

        # 2. MinIO check
        try:
            from .storage import get_s3_client
            client = get_s3_client()
            client.list_buckets()
            minio_ok = True
        except Exception as e:
            minio_error = str(e)
            logger.error("Health check: MinIO failure: %s", e)

        is_healthy = db_ok and minio_ok
        status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

        payload = {
            'status': 'healthy' if is_healthy else 'unhealthy',
            'database': {
                'status': 'connected' if db_ok else 'disconnected',
                'error': db_error,
            },
            'minio': {
                'status': 'connected' if minio_ok else 'disconnected',
                'error': minio_error,
            },
            'timestamp': timezone.now().isoformat(),
        }
        return Response(payload, status=status_code)



