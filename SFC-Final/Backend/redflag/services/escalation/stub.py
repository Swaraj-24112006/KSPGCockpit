import time
import uuid
from datetime import datetime
from django.db import transaction

from .base import EscalationTarget
from redflag.models import RedFlagSequence
from redflag.enums import EscalationModule


def _get_next_escalation_sequence(seq_name: str, max_retries: int = 5) -> int:
    """Safely increments and returns sequence number for escalation modules."""
    for attempt in range(max_retries):
        try:
            with transaction.atomic():
                seq, _ = RedFlagSequence.objects.get_or_create(name=seq_name)
                seq = RedFlagSequence.objects.select_for_update().get(name=seq_name)
                seq.last_value += 1
                seq.save(update_fields=['last_value'])
                return seq.last_value
        except Exception as e:
            if 'locked' in str(e).lower() and attempt < max_retries - 1:
                time.sleep(0.05 * (attempt + 1))
                continue
            raise


class StubEscalationAdapter(EscalationTarget):
    """
    Offline/Stub adapter that generates simulated IDs and numbers using RedFlagSequence.
    State is marked as PENDING_TARGET.
    """

    def create_from_red_flag(self, module: str, flag, actor, payload: dict) -> tuple[str, str, dict]:
        current_year = datetime.now().year

        if module == EscalationModule.PPSR:
            seq_val = _get_next_escalation_sequence(f"ppsr_{current_year}")
            ref_no = f"PPSR-{current_year}-{seq_val:03d}"
            ref_id = f"ppsr-{uuid.uuid4().hex[:8]}"
            target_record = dict(payload)
            target_record['id'] = ref_id
            target_record['ppsrNo'] = ref_no

        elif module == EscalationModule.KAIZEN:
            seq_val = _get_next_escalation_sequence(f"kaizen_{current_year}")
            ref_no = f"KZ-{current_year}-{seq_val:03d}"
            ref_id = f"kz-{uuid.uuid4().hex[:8]}"
            target_record = dict(payload)
            target_record['id'] = ref_id
            target_record['srNo'] = ref_no

        elif module == EscalationModule.FIVES_RED_TAG:
            seq_val = _get_next_escalation_sequence(f"fives_{current_year}")
            ref_no = f"RT-{current_year}-{seq_val:03d}"
            ref_id = f"rt-{uuid.uuid4().hex[:8]}"
            target_record = dict(payload)
            target_record['id'] = ref_id
            target_record['tagNo'] = ref_no

        else:
            raise ValueError(f"Unknown escalation module: {module}")

        return ref_id, ref_no, target_record

