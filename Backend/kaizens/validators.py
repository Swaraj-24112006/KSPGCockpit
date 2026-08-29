"""
Kaizen Validators — Server-side validation for Kaizen data
"""

from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date


def validate_suggestion_date(value):
    """Suggestion date cannot be in the future."""
    if value > date.today():
        raise ValidationError('Suggestion date cannot be in the future.')


def validate_implementation_date(value):
    """Implementation date cannot be in the future by more than 1 year."""
    max_future = date.today().replace(year=date.today().year + 1)
    if value > max_future:
        raise ValidationError('Implementation date seems unreasonable (more than 1 year in the future).')


def validate_cost_save(value):
    """Cost savings must be non-negative."""
    if value < 0:
        raise ValidationError('Cost savings cannot be negative.')


def validate_kaizen_for_submission(kaizen):
    """
    Validate all required fields before a Kaizen can be submitted.
    All fields are compulsory for final submission.
    Returns a dictionary of validation errors (empty if fully valid).
    """
    errors = {}

    if not kaizen.title or len(kaizen.title.strip()) < 5:
        errors['title'] = 'Title is compulsory and must be at least 5 characters.'

    if not kaizen.problem_before or len(kaizen.problem_before.strip()) < 10:
        errors['problem_before'] = 'Problem before description is compulsory (at least 10 characters).'

    if not kaizen.counter_measure_after or len(kaizen.counter_measure_after.strip()) < 10:
        errors['counter_measure_after'] = 'Countermeasure after description is compulsory (at least 10 characters).'

    if not kaizen.area or not str(kaizen.area).strip():
        errors['area'] = 'Shopfloor area is compulsory.'

    if not kaizen.mini_factory or not str(kaizen.mini_factory).strip():
        errors['mini_factory'] = 'Mini-factory unit is compulsory.'

    if not kaizen.location or not str(kaizen.location).strip():
        errors['location'] = 'Specific plant location is compulsory.'

    if not kaizen.suggestion_date:
        errors['suggestion_date'] = 'Suggestion date is compulsory.'

    if not kaizen.idea_by or not str(kaizen.idea_by).strip():
        errors['idea_by'] = 'Idea by (originator name) is compulsory.'

    # Check benefits exist and at least one is selected
    if hasattr(kaizen, 'benefits') and kaizen.benefits:
        benefits = kaizen.benefits
        if not any([
            getattr(benefits, 'productivity', False),
            getattr(benefits, 'quality', False),
            getattr(benefits, 'cost', False),
            getattr(benefits, 'delivery', False),
            getattr(benefits, 'safety', False),
            getattr(benefits, 'morale', False),
        ]):
            errors['benefits'] = 'At least one PQCDSM benefit category is compulsory.'
    else:
        errors['benefits'] = 'PQCDSM benefit categories must be defined.'

    # Check Photo evidence exists (either photo fields or evidence attachments)
    has_before = bool(kaizen.photo_before) or (
        hasattr(kaizen, 'evidence_files') and kaizen.evidence_files.filter(evidence_type='photo_before').exists()
    )
    has_after = bool(kaizen.photo_after) or (
        hasattr(kaizen, 'evidence_files') and kaizen.evidence_files.filter(evidence_type='photo_after').exists()
    )

    if not has_before:
        errors['photo_before'] = 'The BEFORE improvement photo is compulsory before final submission.'
    if not has_after:
        errors['photo_after'] = 'The AFTER improvement photo is compulsory before final submission.'

    return errors


VALID_STATUS_TRANSITIONS = {
    'draft': ['submitted'],
    'submitted': ['pending'],
    'pending': ['approved', 'good_point', 'rejected', 'rework'],
    'approved': ['closed'],
    'good_point': ['closed'],
    'rejected': [],
    'rework': ['submitted'],
    'closed': [],
}


def validate_status_transition(current_status, new_status):
    """
    Validate that a status transition is allowed.
    Raises ValidationError if the transition is invalid.
    """
    allowed = VALID_STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValidationError(
            f'Invalid status transition from "{current_status}" to "{new_status}". '
            f'Allowed transitions: {", ".join(allowed) if allowed else "none (terminal state)"}.'
        )
