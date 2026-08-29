"""
Voting Views — Legacy VotingSession + New CFT Star Rating System
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count, Avg, F, Case, When, IntegerField

from kaizens.models import Kaizen
from .models import VotingSession, CftVote, CftMember, CftSession, CftStarRating
from .serializers import (
    VotingSessionSerializer,
    VotingSessionListSerializer,
    CftVoteSerializer,
    CastVoteSerializer,
    CftMemberSerializer,
    CftSessionSerializer,
    CftStarRatingSerializer,
    SubmitRatingsSerializer,
    UpdateAttendanceSerializer,
    UpdateCategoryOverridesSerializer,
)
from core.exceptions import KaizenAPIException, DuplicateResourceError


# ─── Legacy Auth-based Voting ViewSet ────────────────────────────

class VotingSessionViewSet(viewsets.ModelViewSet):
    """
    GET    /api/v1/voting/sessions/                — List voting sessions
    POST   /api/v1/voting/sessions/                — Create session (leads only)
    GET    /api/v1/voting/sessions/<id>/            — Session detail with votes
    POST   /api/v1/voting/sessions/<id>/close/      — Close voting
    POST   /api/v1/voting/sessions/<id>/vote/       — Cast vote
    GET    /api/v1/voting/sessions/<id>/results/    — Get ranking results
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return VotingSession.objects.prefetch_related(
            'votes', 'votes__voter', 'votes__kaizen', 'eligible_kaizens'
        ).all()

    def get_serializer_class(self):
        if self.action == 'list':
            return VotingSessionListSerializer
        return VotingSessionSerializer

    def create(self, request, *args, **kwargs):
        if not request.user.role or request.user.role.name not in ('kaizen_lead', 'admin'):
            raise KaizenAPIException(
                message='Only Kaizen leads or administrators can create voting sessions.',
                code='PERMISSION_DENIED',
                status_code=403,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = serializer.save(opened_by=request.user)

        return Response({
            'success': True,
            'message': f'Voting session for {session.month} {session.year} created.',
            'data': VotingSessionSerializer(session).data,
        }, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = VotingSessionSerializer(instance)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """POST /api/v1/voting/sessions/<id>/close/ — Close voting session."""
        session = self.get_object()

        if not session.is_open:
            raise KaizenAPIException(
                message='Voting session is already closed.',
                code='ALREADY_CLOSED',
                status_code=409,
            )

        session.is_open = False
        session.closed_at = timezone.now()
        session.save(update_fields=['is_open', 'closed_at'])

        return Response({
            'success': True,
            'message': f'Voting session for {session.month} {session.year} has been closed.',
        })

    @action(detail=True, methods=['post'])
    def vote(self, request, pk=None):
        """POST /api/v1/voting/sessions/<id>/vote/ — Cast a vote."""
        session = self.get_object()

        if not session.is_open:
            raise KaizenAPIException(
                message='Voting session is closed. No more votes can be cast.',
                code='VOTING_CLOSED',
                status_code=422,
            )

        serializer = CastVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        kaizen_id = serializer.validated_data['kaizen']
        rank = serializer.validated_data['rank']

        kaizen = get_object_or_404(Kaizen, pk=kaizen_id)
        if not session.eligible_kaizens.filter(pk=kaizen_id).exists():
            raise KaizenAPIException(
                message='This Kaizen is not eligible for this voting session.',
                code='NOT_ELIGIBLE',
                status_code=422,
            )

        if CftVote.objects.filter(session=session, voter=request.user, kaizen=kaizen).exists():
            raise DuplicateResourceError(
                message='You have already voted for this Kaizen in this session.',
                details={'kaizen_id': kaizen_id},
            )

        if CftVote.objects.filter(session=session, voter=request.user, rank=rank).exists():
            raise KaizenAPIException(
                message=f'You have already assigned rank {rank} to another Kaizen in this session.',
                code='RANK_ALREADY_USED',
                status_code=422,
            )

        vote = CftVote.objects.create(
            session=session,
            voter=request.user,
            kaizen=kaizen,
            rank=rank,
        )

        return Response({
            'success': True,
            'message': f'Vote cast: {kaizen.sr_no} ranked #{rank}.',
            'data': CftVoteSerializer(vote).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """
        GET /api/v1/voting/sessions/<id>/results/
        Calculate rankings based on weighted scoring.
        Rank 1 = 3 pts, Rank 2 = 2 pts, Rank 3 = 1 pt.
        """
        session = self.get_object()

        rankings = (
            CftVote.objects.filter(session=session)
            .values('kaizen__id', 'kaizen__sr_no', 'kaizen__title')
            .annotate(
                total_score=Sum(
                    Case(
                        When(rank=1, then=3),
                        When(rank=2, then=2),
                        When(rank=3, then=1),
                        output_field=IntegerField(),
                    )
                ),
                vote_count=Count('id'),
                rank_1_count=Count(Case(When(rank=1, then=1))),
                rank_2_count=Count(Case(When(rank=2, then=1))),
                rank_3_count=Count(Case(When(rank=3, then=1))),
            )
            .order_by('-total_score', '-rank_1_count')
        )

        votes = CftVoteSerializer(
            session.votes.select_related('voter', 'kaizen').all(),
            many=True
        ).data

        return Response({
            'success': True,
            'data': {
                'session': {
                    'id': session.id,
                    'month': session.month,
                    'year': session.year,
                    'is_open': session.is_open,
                },
                'rankings': list(rankings),
                'votes': votes,
                'total_voters': session.votes.values('voter').distinct().count(),
            }
        })


# ─── New CFT Star Rating ViewSets (unauthenticated) ───────────────

class CftMemberViewSet(viewsets.ModelViewSet):
    """
    GET    /api/v1/cft/members/        — List all active CFT members
    POST   /api/v1/cft/members/        — Add a new CFT member
    PATCH  /api/v1/cft/members/<id>/   — Update a CFT member
    DELETE /api/v1/cft/members/<id>/   — Soft-delete (set is_active=False)
    """
    permission_classes = [AllowAny]
    serializer_class = CftMemberSerializer
    pagination_class = None

    def get_queryset(self):
        return CftMember.objects.filter(is_active=True).order_by('name')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        return Response({
            'success': True,
            'message': f'{member.name} added to CFT committee.',
            'data': CftMemberSerializer(member).data,
        }, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """Soft delete — just mark as inactive."""
        member = self.get_object()
        member.is_active = False
        member.save(update_fields=['is_active'])
        return Response({
            'success': True,
            'message': f'{member.name} removed from active CFT roster.',
        })


class CftSessionViewSet(viewsets.ViewSet):
    """
    POST   /api/v1/cft/sessions/get-or-create/            — Get or create a session for month/year
    GET    /api/v1/cft/sessions/<id>/                     — Session detail
    POST   /api/v1/cft/sessions/<id>/update-attendance/   — Update present member IDs
    POST   /api/v1/cft/sessions/<id>/submit-ratings/      — Bulk submit ratings for one member
    POST   /api/v1/cft/sessions/<id>/update-overrides/    — Update category overrides
    GET    /api/v1/cft/sessions/<id>/scores/              — All kaizen cumulative scores
    GET    /api/v1/cft/sessions/<id>/winners/             — Winner(s) per category
    GET    /api/v1/cft/sessions/<id>/minutes/             — Full printable minutes data
    POST   /api/v1/cft/sessions/<id>/close/               — Close the session
    """
    permission_classes = [AllowAny]

    def retrieve(self, request, pk=None):
        session = get_object_or_404(CftSession, pk=pk)
        members = CftMember.objects.filter(is_active=True)
        ratings = CftStarRatingSerializer(
            session.star_ratings.select_related('member', 'kaizen').all(),
            many=True
        ).data

        return Response({
            'success': True,
            'data': {
                **CftSessionSerializer(session).data,
                'members': CftMemberSerializer(members, many=True).data,
                'all_ratings': ratings,
            }
        })

    @action(detail=False, methods=['post'], url_path='get-or-create')
    def get_or_create(self, request):
        """
        POST /api/v1/cft/sessions/get-or-create/
        Body: {month, year, opened_by_name?}
        Returns existing or newly created session with all members and ratings.
        """
        month = request.data.get('month', '').strip()
        year = request.data.get('year')
        opened_by_name = request.data.get('opened_by_name', 'Committee Lead')

        if not month or not year:
            return Response({
                'success': False,
                'error': {'message': 'month and year are required.'}
            }, status=400)

        session, created = CftSession.objects.get_or_create(
            month=month,
            year=int(year),
            defaults={'opened_by_name': opened_by_name},
        )

        # If new session, auto-mark all active members as present
        if created:
            all_member_ids = list(CftMember.objects.filter(is_active=True).values_list('id', flat=True))
            session.set_present_ids(all_member_ids)
            session.save(update_fields=['present_member_ids'])

        members = CftMember.objects.filter(is_active=True)
        ratings = CftStarRatingSerializer(
            session.star_ratings.select_related('member', 'kaizen').all(),
            many=True
        ).data

        return Response({
            'success': True,
            'created': created,
            'data': {
                **CftSessionSerializer(session).data,
                'members': CftMemberSerializer(members, many=True).data,
                'all_ratings': ratings,
            }
        })

    @action(detail=True, methods=['post'], url_path='update-attendance')
    def update_attendance(self, request, pk=None):
        """POST /api/v1/cft/sessions/<id>/update-attendance/"""
        session = get_object_or_404(CftSession, pk=pk)
        serializer = UpdateAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session.set_present_ids(serializer.validated_data['present_member_ids'])
        session.save(update_fields=['present_member_ids'])

        return Response({
            'success': True,
            'message': 'Attendance updated.',
            'present_ids': session.get_present_ids(),
        })

    @action(detail=True, methods=['post'], url_path='submit-ratings')
    def submit_ratings(self, request, pk=None):
        """
        POST /api/v1/cft/sessions/<id>/submit-ratings/
        Body: {member_id: int, ratings: {kaizen_id: stars, ...}}
        Upserts ratings (create or update) for one member across multiple kaizens.
        """
        session = get_object_or_404(CftSession, pk=pk)
        serializer = SubmitRatingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member_id = serializer.validated_data['member_id']
        ratings_dict = serializer.validated_data['ratings']

        member = get_object_or_404(CftMember, pk=member_id)
        saved = []
        errors = []

        for kaizen_id_str, stars in ratings_dict.items():
            try:
                kaizen = Kaizen.objects.get(pk=int(kaizen_id_str))
                rating, _ = CftStarRating.objects.update_or_create(
                    session=session,
                    member=member,
                    kaizen=kaizen,
                    defaults={'stars': stars},
                )
                saved.append({'kaizen_id': kaizen.id, 'kaizen_sr_no': kaizen.sr_no, 'stars': stars})
            except Kaizen.DoesNotExist:
                errors.append(f'Kaizen {kaizen_id_str} not found.')
            except Exception as e:
                errors.append(f'Error rating kaizen {kaizen_id_str}: {str(e)}')

        return Response({
            'success': True,
            'message': f'{len(saved)} ratings saved for {member.name}.',
            'saved': saved,
            'errors': errors,
        })

    @action(detail=True, methods=['post'], url_path='update-overrides')
    def update_overrides(self, request, pk=None):
        """POST /api/v1/cft/sessions/<id>/update-overrides/"""
        session = get_object_or_404(CftSession, pk=pk)
        serializer = UpdateCategoryOverridesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session.category_overrides = serializer.validated_data['category_overrides']
        session.save(update_fields=['category_overrides'])

        return Response({
            'success': True,
            'message': 'Category overrides updated.',
            'category_overrides': session.category_overrides,
        })

    @action(detail=True, methods=['get'], url_path='scores')
    def scores(self, request, pk=None):
        """
        GET /api/v1/cft/sessions/<id>/scores/
        Returns cumulative star scores for every Kaizen in this session.
        """
        session = get_object_or_404(CftSession, pk=pk)
        present_ids = session.get_present_ids()

        # Aggregate ratings from present members only
        agg = (
            CftStarRating.objects
            .filter(session=session, member_id__in=present_ids)
            .values('kaizen_id', 'kaizen__sr_no', 'kaizen__title',
                    'kaizen__mini_factory', 'kaizen__area',
                    'kaizen__cost_save', 'kaizen__idea_by')
            .annotate(
                total_score=Sum('stars'),
                vote_count=Count('id'),
                avg_score=Avg('stars'),
            )
            .order_by('-total_score')
        )

        scores_data = []
        for row in agg:
            # Include per-member ratings for this kaizen
            member_ratings = list(
                CftStarRating.objects
                .filter(session=session, kaizen_id=row['kaizen_id'], member_id__in=present_ids)
                .values('member_id', 'member__name', 'stars')
            )
            scores_data.append({
                'kaizen_id': str(row['kaizen_id']),
                'kaizen_sr_no': row['kaizen__sr_no'],
                'kaizen_title': row['kaizen__title'],
                'mini_factory': row['kaizen__mini_factory'],
                'area': row['kaizen__area'],
                'cost_save': float(row['kaizen__cost_save'] or 0),
                'idea_by': row['kaizen__idea_by'],
                'total_score': row['total_score'] or 0,
                'vote_count': row['vote_count'],
                'avg_score': round(float(row['avg_score'] or 0), 2),
                'member_ratings': member_ratings,
            })

        return Response({
            'success': True,
            'data': scores_data,
        })

    @action(detail=True, methods=['get'], url_path='winners')
    def winners(self, request, pk=None):
        """
        GET /api/v1/cft/sessions/<id>/winners/
        Returns top-ranked Kaizen(s) per category/minifactory.
        Categories: MF1, MF2 (top 2), MF3, Machining, Quality, Maintenance
        """
        session = get_object_or_404(CftSession, pk=pk)
        present_ids = session.get_present_ids()
        overrides = session.category_overrides or {}

        CATEGORY_CONFIGS = {
            'MF1':        {'winner_count': 1, 'mf_keys': ['MF1', 'mf1', '1']},
            'MF2':        {'winner_count': 2, 'mf_keys': ['MF2', 'mf2', '2']},
            'MF3':        {'winner_count': 1, 'mf_keys': ['MF3', 'mf3', '3']},
            'Machining':  {'winner_count': 1, 'mf_keys': ['Machining', 'machining', 'MACHIN']},
            'Quality':    {'winner_count': 1, 'mf_keys': ['Quality', 'quality', 'QUAL']},
            'Maintenance':{'winner_count': 1, 'mf_keys': ['Maintenance', 'maintenance', 'MAINT']},
        }

        def resolve_category(kaizen):
            kid = str(kaizen.id)
            if kid in overrides:
                return overrides[kid]
            mf = (kaizen.mini_factory or '').upper()
            area = (kaizen.area or '').lower()
            machine = (kaizen.machine or '').lower()
            if 'MF1' in mf or ('1' in mf and 'MF' in mf): return 'MF1'
            if 'MF2' in mf or ('2' in mf and 'MF' in mf): return 'MF2'
            if 'MF3' in mf or ('3' in mf and 'MF' in mf): return 'MF3'
            if 'MACHIN' in mf or 'machin' in area or 'cnc' in machine: return 'Machining'
            if 'QUAL' in mf or 'qual' in area: return 'Quality'
            if 'MAINT' in mf or 'maint' in area: return 'Maintenance'
            return 'MF1'

        # Get all rated kaizens with their scores
        rated = (
            CftStarRating.objects
            .filter(session=session, member_id__in=present_ids)
            .values('kaizen_id')
            .annotate(total_score=Sum('stars'), vote_count=Count('id'))
            .order_by('-total_score')
        )

        kaizen_scores = {str(r['kaizen_id']): r for r in rated}
        kaizen_ids = [r['kaizen_id'] for r in rated]
        kaizens_qs = {str(k.id): k for k in Kaizen.objects.filter(id__in=kaizen_ids)}

        # Group by category
        category_winners = {}
        for cat, config in CATEGORY_CONFIGS.items():
            # Sort kaizens in this category by score desc
            cat_kaizens = [
                (kid, score_data)
                for kid, score_data in sorted(kaizen_scores.items(), key=lambda x: -x[1]['total_score'])
                if kid in kaizens_qs and resolve_category(kaizens_qs[kid]) == cat
            ]

            winners = []
            for i, (kid, score_data) in enumerate(cat_kaizens[:config['winner_count']]):
                k = kaizens_qs[kid]
                winners.append({
                    'rank': i + 1,
                    'kaizen_id': kid,
                    'kaizen_sr_no': k.sr_no,
                    'kaizen_title': k.title,
                    'idea_by': k.idea_by,
                    'mini_factory': k.mini_factory,
                    'area': k.area,
                    'cost_save': float(k.cost_save or 0),
                    'total_score': score_data['total_score'],
                    'vote_count': score_data['vote_count'],
                })

            category_winners[cat] = winners

        return Response({
            'success': True,
            'data': category_winners,
        })

    @action(detail=True, methods=['get'], url_path='minutes')
    def minutes(self, request, pk=None):
        """
        GET /api/v1/cft/sessions/<id>/minutes/
        Returns full printable evaluation minutes data.
        """
        session = get_object_or_404(CftSession, pk=pk)
        present_ids = session.get_present_ids()
        present_members = CftMember.objects.filter(id__in=present_ids)
        absent_members = CftMember.objects.filter(is_active=True).exclude(id__in=present_ids)

        # Get all scores (reuse scores logic)
        all_ratings = (
            CftStarRating.objects
            .filter(session=session, member_id__in=present_ids)
            .values('kaizen_id', 'kaizen__sr_no', 'kaizen__title',
                    'kaizen__mini_factory', 'kaizen__idea_by', 'kaizen__cost_save')
            .annotate(total_score=Sum('stars'), vote_count=Count('id'))
            .order_by('-total_score')
        )

        return Response({
            'success': True,
            'data': {
                'session': CftSessionSerializer(session).data,
                'present_members': CftMemberSerializer(present_members, many=True).data,
                'absent_members': CftMemberSerializer(absent_members, many=True).data,
                'quorum': len(present_ids),
                'evaluated_kaizens': list(all_ratings),
                'generated_at': timezone.now().isoformat(),
            }
        })

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        """POST /api/v1/cft/sessions/<id>/close/ — Close session."""
        session = get_object_or_404(CftSession, pk=pk)
        if not session.is_open:
            return Response({'success': False, 'error': {'message': 'Session already closed.'}}, status=409)
        session.is_open = False
        session.closed_at = timezone.now()
        session.save(update_fields=['is_open', 'closed_at'])
        return Response({
            'success': True,
            'message': f'CFT Session for {session.month} {session.year} closed.',
        })
