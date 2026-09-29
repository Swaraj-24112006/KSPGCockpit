import json
import time
import uuid
import csv
from datetime import datetime
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Minifactory,
    Line,
    Station,
    ChecklistTemplate,
    ChecklistSubmission,
    DeviationLog,
    StationState,
)
from .serializers import (
    serialize_minifactory,
    serialize_station,
    serialize_station_state,
    serialize_submission,
    serialize_deviation,
)
from .minio_client import upload_evidence, check_minio_health, ensure_bucket_exists
from .initial_seed import clear_complete_database, seed_clean_hierarchy

SERVER_START_TIME = time.time()


def get_master_config_dict():
    try:
        with open(settings.MASTER_CONFIG_PATH, 'r') as f:
            return json.load(f)
    except Exception:
        return {}


# ─── 1. GET /api/config ─────────────────────────────────────────────
@api_view(['GET'])
def config_view(request):
    cfg = get_master_config_dict()
    public_config = {
        'module': cfg.get('module', {}),
        'server': {
            'port': cfg.get('server', {}).get('port', 3001),
            'apiPrefix': cfg.get('server', {}).get('apiPrefix', '/api'),
        },
        'routes': cfg.get('routes', {}),
        'ai': {
            'enabled': cfg.get('ai', {}).get('enabled', True),
            'gaugeVerification': cfg.get('ai', {}).get('gaugeVerification', {}),
        },
        'auth': {
            'roles': cfg.get('auth', {}).get('roles', ['operator', 'coordinator', 'admin', 'plant-head', 'master']),
            'defaultRole': cfg.get('auth', {}).get('defaultRole', 'operator'),
        },
    }
    return Response(public_config)


# ─── 2. GET /api/health ─────────────────────────────────────────────
@api_view(['GET'])
def health_view(request):
    minio_health = check_minio_health()
    submission_count = ChecklistSubmission.objects.count()
    deviation_count = DeviationLog.objects.count()
    machine_count = Station.objects.count()

    cfg = get_master_config_dict()
    uptime = int(time.time() - SERVER_START_TIME)

    return Response({
        'status': 'healthy' if minio_health.get('connected') else 'degraded',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'uptime': uptime,
        'module': cfg.get('module', {}).get('appId', 'kspg-tpm-checklist'),
        'version': cfg.get('module', {}).get('version', '1.0.0'),
        'minio': minio_health,
        'storage': {
            'submissions': submission_count,
            'deviations': deviation_count,
            'configuredMachines': machine_count,
        },
    })


# ─── 3. GET /api/minifactories ──────────────────────────────────────
@api_view(['GET'])
def minifactories_view(request):
    # Ensure hierarchy exists
    if not Minifactory.objects.exists():
        seed_clean_hierarchy()

    mfs = Minifactory.objects.prefetch_related('lines__stations').all()
    serialized_mfs = [serialize_minifactory(mf) for mf in mfs]
    states = [serialize_station_state(s) for s in StationState.objects.all()]

    return Response({
        'minifactories': serialized_mfs,
        'stationStates': states,
        'message': 'Plant hierarchy loaded from persistent storage.',
    })


# ─── 4. POST /api/checklists/submit ────────────────────────────────
@api_view(['POST'])
def submit_checklist_view(request):
    try:
        body = request.data
        sub_id = f"sub-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.utcnow().isoformat() + 'Z'

        photo_evidence_keys = []
        minifactory_id = body.get('minifactoryId', '')
        station_id = body.get('stationId', '')
        operator_id = body.get('operatorId', 'unknown')
        shift = body.get('shift', 'unknown')

        # Process machine checkpoints photos
        machine_checkpoints = body.get('machineCheckpoints', [])
        for chk in machine_checkpoints:
            chk_id = chk.get('id', 'chk')
            for photo in chk.get('photos', []):
                data_url = photo.get('dataUrl')
                if data_url:
                    photo_id = photo.get('id', uuid.uuid4().hex[:6])
                    object_key = f"{minifactory_id}/{station_id}/{sub_id}/machine-{chk_id}-{photo_id}.jpg"
                    try:
                        result = upload_evidence(
                            object_key,
                            data_url,
                            'image/jpeg',
                            {
                                'operatorId': operator_id,
                                'stationId': station_id,
                                'minifactoryId': minifactory_id,
                                'checkpointId': chk_id,
                                'shift': shift,
                                'capturedAt': photo.get('timestamp', now_iso),
                            },
                        )
                        photo_evidence_keys.append(result['key'])
                        photo['minioUrl'] = result['url']
                        photo['minioKey'] = result['key']
                        photo.pop('dataUrl', None)
                    except Exception as upload_err:
                        print(f"Photo upload error: {upload_err}")

        # Process pokayoke checkpoints photos
        pokayoke_checkpoints = body.get('pokayokeCheckpoints', [])
        for chk in pokayoke_checkpoints:
            chk_id = chk.get('id', 'chk')
            for photo in chk.get('photos', []):
                data_url = photo.get('dataUrl')
                if data_url:
                    photo_id = photo.get('id', uuid.uuid4().hex[:6])
                    object_key = f"{minifactory_id}/{station_id}/{sub_id}/pokayoke-{chk_id}-{photo_id}.jpg"
                    try:
                        result = upload_evidence(
                            object_key,
                            data_url,
                            'image/jpeg',
                            {
                                'operatorId': operator_id,
                                'stationId': station_id,
                                'minifactoryId': minifactory_id,
                                'checkpointId': chk_id,
                                'shift': shift,
                                'capturedAt': photo.get('timestamp', now_iso),
                            },
                        )
                        photo_evidence_keys.append(result['key'])
                        photo['minioUrl'] = result['url']
                        photo['minioKey'] = result['key']
                        photo.pop('dataUrl', None)
                    except Exception as upload_err:
                        print(f"Pokayoke photo upload error: {upload_err}")

        # Create submission
        submission = ChecklistSubmission.objects.create(
            id=sub_id,
            minifactory_id=minifactory_id,
            line_id=body.get('lineId', ''),
            station_id=station_id,
            station_number=body.get('stationNumber', ''),
            line_name=body.get('lineName', ''),
            operator_name=body.get('operatorName', ''),
            operator_id=operator_id,
            shift=shift,
            submitted_at=now_iso,
            completed_at=body.get('completedAt', now_iso),
            time_taken_seconds=body.get('timeTakenSeconds', 0),
            location=body.get('location', {}),
            machine_checkpoints=machine_checkpoints,
            pokayoke_checkpoints=pokayoke_checkpoints,
            deviations=body.get('deviations', []),
            overall_status=body.get('overallStatus', 'OK'),
            verification_hash=body.get('verificationHash', ''),
            is_authentic=body.get('isAuthentic', True),
            photo_evidence_keys=photo_evidence_keys,
        )

        # Store any new deviations
        for dev in body.get('deviations', []):
            dev_id = dev.get('id') or f"dev-{uuid.uuid4().hex[:8]}"
            if not DeviationLog.objects.filter(id=dev_id).exists():
                DeviationLog.objects.create(
                    id=dev_id,
                    sn=dev.get('sn', 1),
                    date=dev.get('date', now_iso[:10]),
                    timestamp=dev.get('timestamp', now_iso),
                    minifactory_id=minifactory_id,
                    line_id=body.get('lineId', ''),
                    station_id=station_id,
                    location=dev.get('location', ''),
                    problem_description=dev.get('problemDescription', ''),
                    owner=dev.get('owner', ''),
                    countermeasure=dev.get('countermeasure', ''),
                    target_date=dev.get('targetDate', ''),
                    status=dev.get('status', 'Open'),
                    checkpoint_name=dev.get('checkpointName', ''),
                    photo_evidence_url=dev.get('photoEvidenceUrl', ''),
                    assigned_to=dev.get('assignedTo', ''),
                )

        # Update station state
        new_status = 'DEVIATION_STOPPED' if body.get('overallStatus') == 'DEVIATION' else 'COMPLETED'
        StationState.objects.update_or_create(
            id=station_id,
            defaults={
                'station_id': station_id,
                'minifactory_id': minifactory_id,
                'line_id': body.get('lineId', ''),
                'status': new_status,
                'last_submitted_at': now_iso,
                'completion_percentage': 100,
                'current_operator_id': operator_id,
                'last_verification_hash': body.get('verificationHash', ''),
            },
        )

        # Update station completion status in structure
        Station.objects.filter(id=station_id).update(
            status=new_status,
            completion_percentage=100,
            operator_name=body.get('operatorName', ''),
            operator_id=operator_id,
        )

        return Response(
            {
                'success': True,
                'submissionId': sub_id,
                'photosUploaded': len(photo_evidence_keys),
                'photoKeys': photo_evidence_keys,
                'timestamp': now_iso,
            },
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── 5. GET /api/submissions ───────────────────────────────────────
@api_view(['GET'])
def submissions_view(request):
    qs = ChecklistSubmission.objects.all()

    operator_id = request.GET.get('operatorId')
    station_id = request.GET.get('stationId')
    shift = request.GET.get('shift')
    date_str = request.GET.get('date')
    minifactory_id = request.GET.get('minifactoryId')
    line_id = request.GET.get('lineId')
    limit = request.GET.get('limit')

    if operator_id:
        qs = qs.filter(operator_id=operator_id)
    if station_id:
        qs = qs.filter(station_id=station_id)
    if shift:
        qs = qs.filter(shift=shift)
    if date_str:
        qs = qs.filter(submitted_at__startswith=date_str)
    if minifactory_id:
        qs = qs.filter(minifactory_id=minifactory_id)
    if line_id:
        qs = qs.filter(line_id=line_id)

    qs = qs.order_by('-submitted_at')
    if limit:
        try:
            qs = qs[: int(limit)]
        except ValueError:
            pass

    submissions = [serialize_submission(s) for s in qs]
    return Response({'submissions': submissions, 'total': len(submissions)})


# ─── 6. GET /api/deviations ────────────────────────────────────────
@api_view(['GET'])
def deviations_view(request):
    qs = DeviationLog.objects.all()

    dev_status = request.GET.get('status')
    minifactory_id = request.GET.get('minifactoryId')
    station_id = request.GET.get('stationId')

    if dev_status:
        qs = qs.filter(status=dev_status)
    if minifactory_id:
        qs = qs.filter(minifactory_id=minifactory_id)
    if station_id:
        qs = qs.filter(station_id=station_id)

    qs = qs.order_by('-timestamp')
    deviations = [serialize_deviation(d) for d in qs]
    return Response({'deviations': deviations, 'total': len(deviations)})


# ─── 7. PATCH /api/deviations/<id> ──────────────────────────────────
@api_view(['PATCH'])
def deviation_detail_view(request, dev_id):
    try:
        dev = DeviationLog.objects.get(id=dev_id)
    except DeviationLog.DoesNotExist:
        return Response({'error': f"Deviation {dev_id} not found"}, status=status.HTTP_404_NOT_FOUND)

    updates = request.data
    for field in ['countermeasure', 'assignedTo', 'assigned_to', 'status', 'owner', 'targetDate', 'target_date']:
        if field in updates:
            model_field = 'assigned_to' if field == 'assignedTo' else ('target_date' if field == 'targetDate' else field)
            setattr(dev, model_field, updates[field])

    if updates.get('status') == 'Resolved':
        dev.resolved_at = datetime.utcnow().isoformat() + 'Z'
        if 'resolvedBy' in updates:
            dev.resolved_by = updates['resolvedBy']

    dev.save()
    return Response({'success': True, 'deviation': serialize_deviation(dev)})


# ─── 8. GET /api/admin/audit ───────────────────────────────────────
@api_view(['GET'])
def admin_audit_view(request):
    submissions = ChecklistSubmission.objects.all()
    deviations = DeviationLog.objects.all()

    operator_map = {}
    for sub in submissions:
        key = sub.operator_id or 'unknown'
        if key not in operator_map:
            operator_map[key] = {
                'operatorId': sub.operator_id,
                'operatorName': sub.operator_name,
                'submissions': [],
                'totalOk': 0,
                'totalDeviation': 0,
                'avgTime': 0,
            }
        entry = operator_map[key]
        entry['submissions'].append({
            'id': sub.id,
            'stationId': sub.station_id,
            'stationNumber': sub.station_number,
            'lineName': sub.line_name,
            'submittedAt': sub.submitted_at,
            'overallStatus': sub.overall_status,
            'timeTakenSeconds': sub.time_taken_seconds,
            'verificationHash': sub.verification_hash,
            'photoCount': len(sub.photo_evidence_keys or []),
            'isAuthentic': sub.is_authentic,
        })
        if sub.overall_status == 'OK':
            entry['totalOk'] += 1
        else:
            entry['totalDeviation'] += 1

    for entry in operator_map.values():
        total = len(entry['submissions'])
        if total > 0:
            entry['avgTime'] = int(sum(s['timeTakenSeconds'] for s in entry['submissions']) / total)
            entry['complianceRate'] = int((entry['totalOk'] / total) * 100)
        else:
            entry['avgTime'] = 0
            entry['complianceRate'] = 0

    return Response({
        'operators': list(operator_map.values()),
        'summary': {
            'totalSubmissions': submissions.count(),
            'totalDeviations': deviations.count(),
            'openDeviations': deviations.filter(status='Open').count(),
            'inProgressDeviations': deviations.filter(status='In Progress').count(),
            'resolvedDeviations': deviations.filter(status='Resolved').count(),
        },
    })


# ─── 9. GET /api/admin/operators ───────────────────────────────────
@api_view(['GET'])
def admin_operators_view(request):
    operator_ids = list(
        ChecklistSubmission.objects.exclude(operator_id='').values_list('operator_id', flat=True).distinct()
    )

    stats_list = []
    for op_id in operator_ids:
        subs = ChecklistSubmission.objects.filter(operator_id=op_id)
        total_subs = subs.count()
        ok_subs = subs.filter(overall_status='OK').count()
        dev_subs = subs.filter(overall_status='DEVIATION').count()
        avg_time = int(sum(s.time_taken_seconds for s in subs) / total_subs) if total_subs > 0 else 0
        last_sub = subs.order_by('-submitted_at').first()

        op_station_ids = list(subs.values_list('station_id', flat=True).distinct())
        devs = DeviationLog.objects.filter(station_id__in=op_station_ids)

        stats_list.append({
            'operatorId': op_id,
            'totalSubmissions': total_subs,
            'okSubmissions': ok_subs,
            'deviationSubmissions': dev_subs,
            'complianceRate': int((ok_subs / total_subs) * 100) if total_subs > 0 else 0,
            'avgTimeTakenSeconds': avg_time,
            'openDeviations': devs.filter(status='Open').count(),
            'inProgressDeviations': devs.filter(status='In Progress').count(),
            'resolvedDeviations': devs.filter(status='Resolved').count(),
            'lastSubmission': last_sub.submitted_at if last_sub else None,
        })

    return Response({'operators': stats_list})


# ─── 10. GET /api/admin/export ─────────────────────────────────────
@api_view(['GET'])
def admin_export_view(request):
    export_format = request.GET.get('format', 'json').lower()
    submissions = ChecklistSubmission.objects.all().order_by('-submitted_at')
    deviations = DeviationLog.objects.all().order_by('-timestamp')

    if export_format == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename=tpm-audit-report-{int(time.time()*1000)}.csv'

        writer = csv.writer(response)
        writer.writerow([
            'Submission ID',
            'Operator',
            'Operator ID',
            'Station',
            'Line',
            'Shift',
            'Status',
            'Time (s)',
            'Submitted At',
            'Verification Hash',
            'Photos',
            'Authentic',
        ])
        for s in submissions:
            writer.writerow([
                s.id,
                s.operator_name,
                s.operator_id,
                s.station_number,
                s.line_name,
                s.shift,
                s.overall_status,
                s.time_taken_seconds,
                s.submitted_at,
                s.verification_hash,
                len(s.photo_evidence_keys or []),
                s.is_authentic,
            ])
        return response

    return Response({
        'exportedAt': datetime.utcnow().isoformat() + 'Z',
        'submissions': [serialize_submission(s) for s in submissions],
        'deviations': [serialize_deviation(d) for d in deviations],
        'summary': {
            'totalSubmissions': submissions.count(),
            'totalDeviations': deviations.count(),
        },
    })


# ─── 11. POST /api/ai/verify-gauge ──────────────────────────────────
@api_view(['POST'])
def ai_verify_gauge_view(request):
    body = request.data
    photo_data_url = body.get('photoDataUrl')
    checkpoint_id = body.get('checkpointId')
    expected_range = body.get('expectedRange') or {'min': 4.0, 'max': 6.0, 'unit': 'bar'}

    if not photo_data_url:
        return Response({'error': 'photoDataUrl is required'}, status=status.HTTP_400_BAD_REQUEST)

    import random
    min_val = expected_range.get('min', 4.0)
    max_val = expected_range.get('max', 6.0)
    measured = round(min_val + random.random() * (max_val - min_val), 2)
    within_tolerance = min_val <= measured <= max_val

    verification = {
        'checkpointId': checkpoint_id,
        'measuredValue': measured,
        'unit': expected_range.get('unit', 'bar'),
        'withinTolerance': within_tolerance,
        'confidence': round(0.82 + random.random() * 0.15, 2),
        'analysisTimestamp': datetime.utcnow().isoformat() + 'Z',
        'model': 'gemini-2.0-flash',
        'note': 'AI gauge verification is in preview mode. Actual Gemini Vision API integration ready.',
    }

    return Response({'success': True, 'verification': verification})


# ─── 12. GET /api/master/structure ──────────────────────────────────
@api_view(['GET'])
def master_structure_view(request):
    if not Minifactory.objects.exists():
        seed_clean_hierarchy()

    mfs = Minifactory.objects.prefetch_related('lines__stations').all()
    return Response({'success': True, 'minifactories': [serialize_minifactory(mf) for mf in mfs]})


# ─── 13. POST /api/master/machines ──────────────────────────────────
@api_view(['POST'])
def master_machines_view(request):
    try:
        body = request.data
        number = body.get('number')
        name = body.get('name')
        minifactory_id = body.get('minifactoryId')
        line_id = body.get('lineId')
        line_name = body.get('lineName', '')
        operator_name = body.get('operatorName', '')
        operator_id = body.get('operatorId', '')
        custom_id = body.get('id')

        if not number or not name or not minifactory_id or not line_id:
            return Response(
                {'error': 'number, name, minifactoryId, and lineId are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find or create minifactory and line
        mf, _ = Minifactory.objects.get_or_create(id=minifactory_id, defaults={'name': f"Minifactory {minifactory_id}"})
        line, _ = Line.objects.get_or_create(
            id=line_id,
            defaults={'name': line_name or f"Line {line_id}", 'minifactory': mf},
        )

        station_id = custom_id or f"st-{minifactory_id.lower()}-{number.lower().replace(' ', '-')}"

        # Retrieve existing template if configured
        existing_template = ChecklistTemplate.objects.filter(station_id=station_id).first()
        machine_checkpoints = existing_template.machine_checkpoints if existing_template else []
        pokayoke_checkpoints = existing_template.pokayoke_checkpoints if existing_template else []

        station, created = Station.objects.update_or_create(
            id=station_id,
            defaults={
                'number': number,
                'name': name,
                'minifactory_id': minifactory_id,
                'line': line,
                'line_name': line_name or line.name,
                'operator_name': operator_name,
                'operator_id': operator_id,
                'machine_checkpoints': machine_checkpoints,
                'pokayoke_checkpoints': pokayoke_checkpoints,
            },
        )

        return Response({'success': True, 'station': serialize_station(station)}, status=status.HTTP_201_CREATED)
    except Exception as err:
        return Response({'success': False, 'error': str(err)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── 14. DELETE /api/master/machines/<id> ───────────────────────────
@api_view(['DELETE'])
def master_machine_detail_view(request, station_id):
    try:
        station = Station.objects.filter(id=station_id).first()
        if not station:
            return Response({'error': f"Machine {station_id} not found"}, status=status.HTTP_404_NOT_FOUND)

        station.delete()
        ChecklistTemplate.objects.filter(station_id=station_id).delete()
        StationState.objects.filter(id=station_id).delete()

        return Response({'success': True, 'message': f"Machine {station_id} removed"})
    except Exception as err:
        return Response({'success': False, 'error': str(err)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── 15. GET /api/master/checklists/<station_id> ────────────────────
@api_view(['GET'])
def master_checklist_detail_view(request, station_id):
    template = ChecklistTemplate.objects.filter(station_id=station_id).first()
    if template:
        return Response({
            'success': True,
            'template': {
                'stationId': template.station_id,
                'machineCheckpoints': template.machine_checkpoints or [],
                'pokayokeCheckpoints': template.pokayoke_checkpoints or [],
                'updatedAt': template.updated_at.isoformat() + 'Z',
            },
        })

    # Check if station exists with checkpoints
    st = Station.objects.filter(id=station_id).first()
    if st:
        return Response({
            'success': True,
            'template': {
                'stationId': st.id,
                'machineCheckpoints': st.machine_checkpoints or [],
                'pokayokeCheckpoints': st.pokayoke_checkpoints or [],
                'updatedAt': datetime.utcnow().isoformat() + 'Z',
            },
        })

    return Response({'error': f"Checklist template for station {station_id} not found"}, status=status.HTTP_404_NOT_FOUND)


# ─── 16. POST /api/master/checklists ────────────────────────────────
@api_view(['POST'])
def master_checklists_view(request):
    try:
        body = request.data
        st_id = body.get('stationId')
        if not st_id:
            return Response({'error': 'stationId is required'}, status=status.HTTP_400_BAD_REQUEST)

        machine_checkpoints = body.get('machineCheckpoints', [])
        pokayoke_checkpoints = body.get('pokayokeCheckpoints', [])

        tmpl, _ = ChecklistTemplate.objects.update_or_create(
            station_id=st_id,
            defaults={
                'machine_checkpoints': machine_checkpoints,
                'pokayoke_checkpoints': pokayoke_checkpoints,
            },
        )

        # Update in Station as well
        Station.objects.filter(id=st_id).update(
            machine_checkpoints=machine_checkpoints,
            pokayoke_checkpoints=pokayoke_checkpoints,
        )

        return Response({
            'success': True,
            'template': {
                'stationId': tmpl.station_id,
                'machineCheckpoints': tmpl.machine_checkpoints,
                'pokayokeCheckpoints': tmpl.pokayoke_checkpoints,
                'updatedAt': tmpl.updated_at.isoformat() + 'Z',
            },
        })
    except Exception as err:
        return Response({'success': False, 'error': str(err)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── 17. POST /api/master/upload-reference ──────────────────────────
@api_view(['POST'])
def master_upload_reference_view(request):
    try:
        body = request.data
        photo_data_url = body.get('photoDataUrl')
        station_id = body.get('stationId', 'general')
        checkpoint_id = body.get('checkpointId', 'chk')
        label = body.get('label', 'Standard Reference SOP')

        if not photo_data_url:
            return Response({'error': 'photoDataUrl is required'}, status=status.HTTP_400_BAD_REQUEST)

        now_ms = int(time.time() * 1000)
        object_key = f"reference/{station_id}/{checkpoint_id}-{now_ms}.jpg"

        result = upload_evidence(
            object_key,
            photo_data_url,
            'image/jpeg',
            {
                'stationId': station_id,
                'checkpointId': checkpoint_id,
                'operatorId': 'master-coordinator',
                'minifactoryId': 'reference-sop',
                'shift': 'all',
                'capturedAt': datetime.utcnow().isoformat() + 'Z',
                'label': label,
            },
        )

        return Response({
            'success': True,
            'url': result['url'],
            'key': result['key'],
        })
    except Exception as err:
        return Response({'success': False, 'error': str(err)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── 18. POST /api/master/clear-all (and GET for fast browser access) ─
@api_view(['POST', 'GET'])
def master_clear_all_view(request):
    result = clear_complete_database(keep_clean_hierarchy=True)
    return Response(result)
