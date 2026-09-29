from .models import Minifactory, Line, Station, ChecklistTemplate, ChecklistSubmission, DeviationLog, StationState


CLEAN_STRUCTURE = [
    {
        'id': 'MF1',
        'name': 'MF1 - Machining & Pre-Assembly',
        'lines': [
            {'id': 'MF1-LINE1', 'name': 'Machining Line 1'},
            {'id': 'MF1-LINE2', 'name': 'Machining Line 2'},
        ],
    },
    {
        'id': 'MF2',
        'name': 'MF2 - Pump Assembly Minifactory',
        'lines': [
            {'id': 'MF2-LINE1', 'name': 'Pump Assembly Line - 1'},
            {'id': 'MF2-LINE2', 'name': 'Pump Assembly Line - 2'},
        ],
    },
    {
        'id': 'MF3',
        'name': 'MF3 - Motor & Drive Assembly',
        'lines': [
            {'id': 'MF3-LINE1', 'name': 'Motor Winding Line 1'},
        ],
    },
]


def seed_clean_hierarchy():
    for mf_data in CLEAN_STRUCTURE:
        mf, _ = Minifactory.objects.get_or_create(id=mf_data['id'], defaults={'name': mf_data['name']})
        if mf.name != mf_data['name']:
            mf.name = mf_data['name']
            mf.save()

        for line_data in mf_data['lines']:
            line, _ = Line.objects.get_or_create(
                id=line_data['id'],
                defaults={'name': line_data['name'], 'minifactory': mf}
            )
            if line.name != line_data['name'] or line.minifactory != mf:
                line.name = line_data['name']
                line.minifactory = mf
                line.save()


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
