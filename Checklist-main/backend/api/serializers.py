def serialize_station(station):
    return {
        'id': station.id,
        'number': station.number,
        'name': station.name,
        'minifactoryId': station.minifactory_id,
        'lineId': station.line.id if station.line else '',
        'lineName': station.line_name or (station.line.name if station.line else ''),
        'operatorName': station.operator_name,
        'operatorId': station.operator_id,
        'status': station.status,
        'shift': station.shift,
        'completionPercentage': station.completion_percentage,
        'machineCheckpoints': station.machine_checkpoints or [],
        'pokayokeCheckpoints': station.pokayoke_checkpoints or [],
        'deviations': station.deviations or [],
    }


def serialize_line(line):
    return {
        'id': line.id,
        'minifactoryId': line.minifactory.id if line.minifactory else '',
        'name': line.name,
        'stations': [serialize_station(s) for s in line.stations.all()],
    }


def serialize_minifactory(mf):
    return {
        'id': mf.id,
        'name': mf.name,
        'lines': [serialize_line(l) for l in mf.lines.all()],
    }


def serialize_station_state(state):
    return {
        'id': state.id,
        'stationId': state.station_id,
        'minifactoryId': state.minifactory_id,
        'lineId': state.line_id,
        'status': state.status,
        'lastSubmittedAt': state.last_submitted_at,
        'completionPercentage': state.completion_percentage,
        'currentOperatorId': state.current_operator_id,
        'lastVerificationHash': state.last_verification_hash,
    }


def serialize_submission(sub):
    return {
        'id': sub.id,
        'minifactoryId': sub.minifactory_id,
        'lineId': sub.line_id,
        'stationId': sub.station_id,
        'stationNumber': sub.station_number,
        'lineName': sub.line_name,
        'operatorName': sub.operator_name,
        'operatorId': sub.operator_id,
        'shift': sub.shift,
        'submittedAt': sub.submitted_at,
        'completedAt': sub.completed_at,
        'timeTakenSeconds': sub.time_taken_seconds,
        'location': sub.location or {'latitude': 0, 'longitude': 0, 'accuracy': 0, 'isWithinGeofence': False},
        'machineCheckpoints': sub.machine_checkpoints or [],
        'pokayokeCheckpoints': sub.pokayoke_checkpoints or [],
        'deviations': sub.deviations or [],
        'overallStatus': sub.overall_status,
        'verificationHash': sub.verification_hash,
        'isAuthentic': sub.is_authentic,
        'photoEvidenceKeys': sub.photo_evidence_keys or [],
    }


def serialize_deviation(dev):
    return {
        'id': dev.id,
        'sn': dev.sn,
        'date': dev.date,
        'timestamp': dev.timestamp,
        'minifactoryId': dev.minifactory_id,
        'lineId': dev.line_id,
        'stationId': dev.station_id,
        'location': dev.location,
        'problemDescription': dev.problem_description,
        'owner': dev.owner,
        'countermeasure': dev.countermeasure,
        'targetDate': dev.target_date,
        'status': dev.status,
        'checkpointName': dev.checkpoint_name,
        'photoEvidenceUrl': dev.photo_evidence_url,
        'assignedTo': dev.assigned_to,
        'resolvedAt': dev.resolved_at,
        'resolvedBy': dev.resolved_by,
    }
