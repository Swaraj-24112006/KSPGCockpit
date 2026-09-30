import os
import json
from pathlib import Path
from django.conf import settings
from .models import Minifactory, Line, Station, ChecklistTemplate, ChecklistSubmission, DeviationLog, StationState


def seed_clean_hierarchy():
    """
    Seeds Minifactories, Lines (Line 1 & Line 2), Stations, and ChecklistTemplates
    from data/plant_structure.json and data/checklists.json.
    """
    # Locate data directory
    possible_data_dirs = [
        settings.BASE_DIR.parent / 'data',
        settings.BASE_DIR / 'data',
        Path(__file__).resolve().parent.parent.parent / 'data',
    ]

    plant_data = None
    checklists_data = None

    for d in possible_data_dirs:
        plant_file = d / 'plant_structure.json'
        chk_file = d / 'checklists.json'
        if plant_file.exists() and chk_file.exists():
            try:
                with open(plant_file, 'r', encoding='utf-8') as f:
                    plant_data = json.load(f)
                with open(chk_file, 'r', encoding='utf-8') as f:
                    checklists_data = json.load(f)
                break
            except Exception as e:
                print(f"Error loading seed JSONs from {d}: {e}")

    templates_map = {}
    if checklists_data and isinstance(checklists_data, list):
        for item in checklists_data:
            st_id = item.get('stationId')
            if st_id:
                templates_map[st_id] = item
                ChecklistTemplate.objects.update_or_create(
                    station_id=st_id,
                    defaults={
                        'machine_checkpoints': item.get('machineCheckpoints', []),
                        'pokayoke_checkpoints': item.get('pokayokeCheckpoints', []),
                    }
                )

    if plant_data and isinstance(plant_data, list):
        for mf_data in plant_data:
            mf, _ = Minifactory.objects.get_or_create(
                id=mf_data['id'],
                defaults={'name': mf_data['name']}
            )
            if mf.name != mf_data['name']:
                mf.name = mf_data['name']
                mf.save()

            for line_data in mf_data.get('lines', []):
                line, _ = Line.objects.get_or_create(
                    id=line_data['id'],
                    defaults={'name': line_data['name'], 'minifactory': mf}
                )
                if line.name != line_data['name'] or line.minifactory != mf:
                    line.name = line_data['name']
                    line.minifactory = mf
                    line.save()

                default_tpl = templates_map.get('st-130', {})
                for st_data in line_data.get('stations', []):
                    st_id = st_data['id']
                    tpl = templates_map.get(st_id, {})
                    m_checkpoints = tpl.get('machineCheckpoints') or st_data.get('machineCheckpoints') or default_tpl.get('machineCheckpoints', [])
                    p_checkpoints = tpl.get('pokayokeCheckpoints') or st_data.get('pokayokeCheckpoints') or default_tpl.get('pokayokeCheckpoints', [])

                    Station.objects.update_or_create(
                        id=st_id,
                        defaults={
                            'number': st_data.get('number', ''),
                            'name': st_data.get('name', ''),
                            'minifactory_id': mf.id,
                            'line': line,
                            'line_name': line.name,
                            'operator_name': st_data.get('operatorName', ''),
                            'operator_id': st_data.get('operatorId', ''),
                            'status': st_data.get('status', 'PENDING'),
                            'shift': st_data.get('shift', 'Shift 1 (06:00 - 14:00)'),
                            'completion_percentage': st_data.get('completionPercentage', 0),
                            'machine_checkpoints': m_checkpoints,
                            'pokayoke_checkpoints': p_checkpoints,
                            'deviations': st_data.get('deviations', []),
                        }
                    )
                    ChecklistTemplate.objects.update_or_create(
                        station_id=st_id,
                        defaults={
                            'machine_checkpoints': m_checkpoints,
                            'pokayoke_checkpoints': p_checkpoints,
                        }
                    )


def clear_complete_database(keep_clean_hierarchy=True):
    ChecklistSubmission.objects.all().delete()
    DeviationLog.objects.all().delete()
    StationState.objects.all().delete()
    ChecklistTemplate.objects.all().delete()
    Station.objects.all().delete()

    if not keep_clean_hierarchy:
        Line.objects.all().delete()
        Minifactory.objects.all().delete()
    else:
        seed_clean_hierarchy()

    return {
        'success': True,
        'message': 'Database completely cleared. Submissions, deviations, states, checklists and machines are zeroed out.',
    }

