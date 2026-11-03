import logging
from .base import EscalationTarget, TargetEscalationError
from .stub import StubEscalationAdapter

logger = logging.getLogger(__name__)


class NativeEscalationAdapter(EscalationTarget):
    """
    Adapter for modules implemented as native Django apps in the same project.
    Falls back to StubEscalationAdapter if native services are not available.
    """

    def __init__(self):
        self._stub_fallback = StubEscalationAdapter()

    def create_from_red_flag(self, module: str, flag, actor, payload: dict) -> tuple[str, str, dict]:
        # Currently, PPSR, Kaizen, and 5S are served via Express/Node.
        # When native Django apps are mounted in this project, their services will be imported here.
        logger.info("Native adapter routing to stub implementation for module %s", module)
        return self._stub_fallback.create_from_red_flag(module, flag, actor, payload)

