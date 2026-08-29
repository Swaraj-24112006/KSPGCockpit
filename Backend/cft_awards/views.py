"""
CFT Awards — API Views
=======================
Thin view layer: validates input → calls service/selector → returns serialized response.
"""

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cft_awards import selectors, services
from cft_awards.permissions import IsCftCoordinatorOrAbove, IsAdminOrSuperAdmin, IsCftReadOnly
from cft_awards.serializers import (
    CftMemberSerializer,
    CFTMemberSerializer,
    AwardCycleSerializer,
    AwardCycleListSerializer,
    AttendanceRecordSerializer,
    MonthlyAwardSerializer,
    BulkAttendanceSerializer,
    CFTEvaluationSessionSerializer,
    GetOrCreateSessionRequestSerializer,
    CFTRatingSerializer,
    CFTSessionMemberSerializer,
    UpdateAttendanceRequestSerializer,
    AwardCategorySerializer,
    EligibleKaizenSerializer,
)
from cft_awards.models import (
    CftMember,
    CFTMember,
    AwardCycle,
    MonthlyAward,
    CFTEvaluationSession,
    CFTRating,
    CFTSessionMember,
    AwardCategory,
)




# ─── CFT Members ─────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def cft_member_list(request):
    """
    GET  /api/v1/cft/members/         — list all active members
    POST /api/v1/cft/members/         — create a new CFT member
    """
    if request.method == 'GET':
        mini_factory = request.query_params.get('mini_factory')
        members = selectors.get_all_active_members(mini_factory=mini_factory)
        serializer = CftMemberSerializer(members, many=True)
        return Response({
            'success': True,
            'count': len(serializer.data),
            'data': serializer.data,
        })

    # POST
    serializer = CftMemberSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    d = serializer.validated_data
    member = services.create_cft_member(
        name=d['name'],
        role=d.get('role', 'CFT Reviewer'),
        department=d.get('department', 'Operations'),
        mini_factory=d.get('mini_factory', 'MF1'),
        employee_id=d.get('employee_id'),
        notes=d.get('notes', ''),
        created_by=request.user,
    )
    return Response({
        'success': True,
        'data': CftMemberSerializer(member).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def cft_member_detail(request, pk):
    """
    GET    /api/v1/cft/members/<pk>/  — retrieve member
    PATCH  /api/v1/cft/members/<pk>/  — partial update
    DELETE /api/v1/cft/members/<pk>/  — soft-delete (deactivate)
    """
    try:
        member = selectors.get_member_by_id(pk)
    except CftMember.DoesNotExist:
        return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'success': True,
            'data': CftMemberSerializer(member).data
        })

    if request.method == 'PATCH':
        serializer = CftMemberSerializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = services.update_cft_member(
            member=member,
            actor=request.user,
            **serializer.validated_data,
        )
        return Response({
            'success': True,
            'data': CftMemberSerializer(updated).data
        })

    # DELETE -> soft deactivation
    services.deactivate_cft_member(member=member, actor=request.user)
    return Response({
        'success': True,
        'detail': f'Member {member.name} has been deactivated.'
    }, status=status.HTTP_200_OK)


# ─── Award Cycles ─────────────────────────────────────────────────────────────


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def award_cycle_list(request):
    """
    GET  /api/v1/cft/cycles/   — list all cycles
    POST /api/v1/cft/cycles/   — create a new cycle
    """
    if request.method == 'GET':
        mini_factory = request.query_params.get('mini_factory')
        cycles = selectors.get_all_cycles(mini_factory=mini_factory)
        serializer = AwardCycleListSerializer(cycles, many=True)
        return Response(serializer.data)

    serializer = AwardCycleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    d = serializer.validated_data
    try:
        cycle = services.create_award_cycle(
            title=d['title'],
            mini_factory=d['mini_factory'],
            month=d['month'],
            year=d['year'],
            session_date=d.get('session_date'),
            notes=d.get('notes', ''),
            auto_populate_members=True,
            created_by=request.user,
        )
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(AwardCycleSerializer(cycle).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def award_cycle_detail(request, pk):
    """
    GET   /api/v1/cft/cycles/<pk>/  — retrieve cycle with attendance + awards
    PATCH /api/v1/cft/cycles/<pk>/  — update title / session_date / notes
    """
    try:
        cycle = selectors.get_cycle_by_id(pk)
    except AwardCycle.DoesNotExist:
        return Response({'detail': 'Cycle not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AwardCycleSerializer(cycle).data)

    serializer = AwardCycleSerializer(cycle, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    for field, value in serializer.validated_data.items():
        setattr(cycle, field, value)
    cycle.save()
    return Response(AwardCycleSerializer(cycle).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrSuperAdmin])
def finalize_cycle(request, pk):
    """
    POST /api/v1/cft/cycles/<pk>/finalize/
    Lock a cycle. Admin / SuperAdmin only.
    """
    try:
        cycle = AwardCycle.objects.get(pk=pk)
    except AwardCycle.DoesNotExist:
        return Response({'detail': 'Cycle not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        services.finalize_award_cycle(cycle=cycle, actor=request.user)
    except ValidationError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'detail': 'Cycle finalized successfully.'})


# ─── Attendance ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def attendance_list(request, cycle_pk):
    """GET /api/v1/cft/cycles/<cycle_pk>/attendance/ — list attendance for a cycle."""
    records = selectors.get_attendance_for_cycle(cycle_pk)
    return Response(AttendanceRecordSerializer(records, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def bulk_attendance_update(request, cycle_pk):
    """
    POST /api/v1/cft/cycles/<cycle_pk>/attendance/bulk/
    Body: { "attendance": [{"member_id": 1, "is_present": true}, ...] }
    """
    try:
        cycle = AwardCycle.objects.get(pk=cycle_pk)
    except AwardCycle.DoesNotExist:
        return Response({'detail': 'Cycle not found.'}, status=status.HTTP_404_NOT_FOUND)

    attendance_data = request.data.get('attendance', [])
    if not isinstance(attendance_data, list):
        return Response(
            {'detail': '"attendance" must be a list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        records = services.bulk_update_attendance(
            cycle=cycle,
            attendance_data=attendance_data,
            marked_by=request.user,
        )
    except ValidationError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        AttendanceRecordSerializer(records, many=True).data,
        status=status.HTTP_200_OK,
    )


# ─── Awards ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def award_list(request, cycle_pk):
    """
    GET  /api/v1/cft/cycles/<cycle_pk>/awards/  — list awards in cycle
    POST /api/v1/cft/cycles/<cycle_pk>/awards/  — nominate an award
    """
    if request.method == 'GET':
        awards = selectors.get_awards_for_cycle(cycle_pk)
        return Response(MonthlyAwardSerializer(awards, many=True).data)

    try:
        cycle = AwardCycle.objects.get(pk=cycle_pk)
        member = CftMember.objects.get(pk=request.data.get('member'))
    except (AwardCycle.DoesNotExist, CftMember.DoesNotExist) as e:
        return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

    serializer = MonthlyAwardSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    d = serializer.validated_data

    try:
        award = services.nominate_award(
            cycle=cycle,
            member=member,
            award_type=d['award_type'],
            citation=d.get('citation', ''),
            custom_award_label=d.get('custom_award_label', ''),
            linked_kaizen=d.get('linked_kaizen'),
            points=d.get('points', 0),
            nominated_by=request.user,
        )
    except ValidationError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(MonthlyAwardSerializer(award).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def approve_award_view(request, pk):
    """POST /api/v1/cft/awards/<pk>/approve/"""
    try:
        award = MonthlyAward.objects.get(pk=pk)
    except MonthlyAward.DoesNotExist:
        return Response({'detail': 'Award not found.'}, status=status.HTTP_404_NOT_FOUND)

    award = services.approve_award(award=award, actor=request.user)
    return Response(MonthlyAwardSerializer(award).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def reject_award_view(request, pk):
    """POST /api/v1/cft/awards/<pk>/reject/"""
    try:
        award = MonthlyAward.objects.get(pk=pk)
    except MonthlyAward.DoesNotExist:
        return Response({'detail': 'Award not found.'}, status=status.HTTP_404_NOT_FOUND)

    award = services.reject_award(award=award, actor=request.user)
    return Response(MonthlyAwardSerializer(award).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminOrSuperAdmin])
def delete_award_view(request, pk):
    """DELETE /api/v1/cft/awards/<pk>/"""
    try:
        award = MonthlyAward.objects.get(pk=pk)
    except MonthlyAward.DoesNotExist:
        return Response({'detail': 'Award not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        services.delete_award(award=award, actor=request.user)
    except ValidationError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(status=status.HTTP_204_NO_CONTENT)


# ─── CFTEvaluationSession Endpoints ───────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def get_or_create_session_view(request):
    """
    POST /api/v1/cft/sessions/get-or-create/
    Body: { "month": "August", "year": 2026, "openedByName": "CFT Committee Lead" }
    Guarantees exactly one session per (month, year) and returns roster, attendance,
    overrides, and ratings.
    """
    serializer = GetOrCreateSessionRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    d = serializer.validated_data

    session, created = services.get_or_create_evaluation_session(
        month=d['month'],
        year=d['year'],
        opened_by=request.user,
    )

    resp_serializer = CFTEvaluationSessionSerializer(session)
    return Response({
        'success': True,
        'created': created,
        'data': resp_serializer.data,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def session_list_view(request):
    """
    GET /api/v1/cft/sessions/ — List all monthly evaluation sessions.
    """
    sessions = selectors.get_all_evaluation_sessions()
    serializer = CFTEvaluationSessionSerializer(sessions, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def session_detail_view(request, pk):
    """
    GET   /api/v1/cft/sessions/<pk>/ — Retrieve session details.
    PATCH /api/v1/cft/sessions/<pk>/ — Partial update of status / notes.
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'success': True,
            'data': CFTEvaluationSessionSerializer(session).data
        })

    # PATCH
    allowed_statuses = ('OPEN', 'FINALIZED', 'LOCKED')
    new_status = request.data.get('status')
    if new_status and new_status in allowed_statuses:
        session.status = new_status
        session.save(update_fields=['status', 'updated_at'])

    return Response({
        'success': True,
        'data': CFTEvaluationSessionSerializer(session).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def session_attendance_view(request, pk):
    """
    GET /api/v1/cft/sessions/<pk>/attendance/
    Retrieve attendance records and present member IDs for this monthly evaluation session.
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    attendance_records = selectors.get_session_attendance(session.id)
    serializer = CFTSessionMemberSerializer(attendance_records, many=True)
    present_ids = selectors.get_session_present_member_ids(session.id)
    if not present_ids and session.present_member_ids:
        present_ids = session.present_member_ids

    return Response({
        'success': True,
        'session_id': session.id,
        'present_member_ids': present_ids,
        'data': serializer.data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def update_session_attendance_view(request, pk):
    """
    POST /api/v1/cft/sessions/<pk>/update-attendance/
    Body: { "present_member_ids": [1, 2, 3, 4] }
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = UpdateAttendanceRequestSerializer(data=request.data)
    if not serializer.is_valid():
        err_msg = serializer.errors.get('present_member_ids', ['At least 1 CFT member must be present for evaluation.'])
        return Response({
            'success': False,
            'detail': err_msg[0] if isinstance(err_msg, list) else str(err_msg),
        }, status=status.HTTP_400_BAD_REQUEST)

    present_ids = serializer.validated_data['present_member_ids']

    try:
        session = services.update_session_attendance(
            session=session,
            present_member_ids=present_ids,
            actor=request.user,
        )
    except ValidationError as e:
        return Response({'success': False, 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    attendance_records = selectors.get_session_attendance(session.id)
    return Response({
        'success': True,
        'present_member_ids': session.present_member_ids,
        'attendance': CFTSessionMemberSerializer(attendance_records, many=True).data,
        'data': CFTEvaluationSessionSerializer(session).data
    })



@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def submit_session_ratings_view(request, pk):
    """
    POST /api/v1/cft/sessions/<pk>/submit-ratings/
    Body: { "member_id": 1, "ratings": { "101": 5, "102": 4 } }
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    member_id = request.data.get('member_id')
    ratings = request.data.get('ratings', {})

    if not member_id or not isinstance(ratings, dict):
        return Response(
            {'detail': 'Valid "member_id" and "ratings" dictionary required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        saved_ratings = services.submit_session_ratings(
            session=session,
            member_id=int(member_id),
            ratings_dict=ratings,
            actor=request.user,
        )
    except (ValidationError, CftMember.DoesNotExist) as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'success': True,
        'count': len(saved_ratings),
        'data': CFTEvaluationSessionSerializer(session).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def update_session_overrides_view(request, pk):
    """
    POST /api/v1/cft/sessions/<pk>/update-overrides/
    Body: { "category_overrides": { "101": "MF1", "102": "Quality" } }
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    category_overrides = request.data.get('category_overrides', {})
    if not isinstance(category_overrides, dict):
        return Response({'detail': '"category_overrides" must be a dictionary.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        session = services.update_session_overrides(
            session=session,
            category_overrides=category_overrides,
            actor=request.user,
        )
    except ValidationError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'success': True,
        'data': CFTEvaluationSessionSerializer(session).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrSuperAdmin])
def finalize_session_view(request, pk):
    """
    POST /api/v1/cft/sessions/<pk>/finalize/ — Lock session permanently.
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        session = services.finalize_evaluation_session(session=session, actor=request.user)
    except ValidationError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'success': True,
        'detail': 'Session finalized successfully.',
        'data': CFTEvaluationSessionSerializer(session).data
    })


# ─── Award Categories ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def award_category_list_view(request):
    """
    GET /api/v1/cft/categories/
    Returns active configurable award categories stored in the database.
    """
    categories = selectors.get_all_active_categories()
    serializer = AwardCategorySerializer(categories, many=True)
    return Response({
        'success': True,
        'count': len(serializer.data),
        'data': serializer.data,
    })


# ─── Eligible Kaizens for Session ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def session_eligible_kaizens_view(request, pk):
    """
    GET /api/v1/cft/sessions/<pk>/kaizens/
    Step 9: Return only Kaizens eligible for that session's month/year.
    Supports query parameters:
      - search: str (matches sr_no, title, idea_by, location, area, machine)
      - category: str (matches MF1, MF2, MF3, Machining, Quality, Maintenance)
      - benefit: str ('p', 'q', 'c', 'd', 's', 'm')
      - page: int (1-based index)
      - page_size: int (number of items per page)
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    search = request.query_params.get('search')
    category = request.query_params.get('category')
    benefit = request.query_params.get('benefit')

    kaizens = selectors.get_eligible_kaizens_for_session(
        session=session,
        search=search,
        category=category,
        benefit=benefit,
    )

    total_count = len(kaizens)

    # Optional pagination
    page_param = request.query_params.get('page')
    page_size_param = request.query_params.get('page_size')

    present_member_ids = selectors.get_session_present_member_ids(session.id)
    serializer_context = {
        'request': request,
        'session': session,
        'present_member_ids': present_member_ids,
    }

    if page_param or page_size_param:
        try:
            page = max(1, int(page_param or 1))
            page_size = max(1, int(page_size_param or 20))
        except (ValueError, TypeError):
            page = 1
            page_size = 20

        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = kaizens[start:end]
        total_pages = max(1, (total_count + page_size - 1) // page_size)

        serializer = EligibleKaizenSerializer(paginated_items, many=True, context=serializer_context)
        return Response({
            'success': True,
            'session_id': session.id,
            'month': session.month,
            'year': session.year,
            'total': total_count,
            'count': len(paginated_items),
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'data': serializer.data,
        })

    serializer = EligibleKaizenSerializer(kaizens, many=True, context=serializer_context)
    return Response({
        'success': True,
        'session_id': session.id,
        'month': session.month,
        'year': session.year,
        'total': total_count,
        'count': total_count,
        'data': serializer.data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCftCoordinatorOrAbove])
def calculate_session_winners_view(request, pk):
    """
    POST /api/v1/cft/sessions/<pk>/calculate-winners/
    Calculates the winners for the session, saves them as PREVIEW in MonthlyAward, 
    and returns the grouped data.
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        response_data = services.calculate_monthly_winners(session=session, actor=request.user)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    return Response({
        'success': True,
        'data': response_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCftReadOnly])
def session_winners_view(request, pk):
    """
    GET /api/v1/cft/sessions/<pk>/winners/
    Returns the official stored winners (PREVIEW or FINAL) from MonthlyAward.
    """
    try:
        session = selectors.get_evaluation_session_by_id(pk)
    except CFTEvaluationSession.DoesNotExist:
        return Response({'detail': 'Evaluation session not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        response_data = services.get_session_winners(session=session)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    return Response({
        'success': True,
        'data': response_data
    })

