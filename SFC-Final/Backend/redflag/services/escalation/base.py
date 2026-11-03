from abc import ABC, abstractmethod


class TargetEscalationError(Exception):
    """Raised when an escalation target creation fails."""
    def __init__(self, message, status_code=502, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class EscalationTarget(ABC):
    """
    Adapter interface for cross-module escalation:
    create_from_red_flag(module, flag, actor, payload) -> (ref_id, ref_no, target_record)
    """

    @abstractmethod
    def create_from_red_flag(self, module: str, flag, actor, payload: dict) -> tuple[str, str, dict]:
        """
        Creates the target record in PPSR, Kaizen, or 5S Red Tag.
        
        Args:
            module: 'PPSR', 'KAIZEN', or 'FIVES_RED_TAG'
            flag: RedFlag model instance
            actor: Django User executing the action
            payload: Dict of mapped payload attributes

        Returns:
            Tuple of (ref_id, ref_no, target_record_dict)
            e.g. ('ppsr-171829', 'PPSR-2026-001', {...})
        """
        pass

