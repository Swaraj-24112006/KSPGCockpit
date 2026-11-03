from django.conf import settings

from .base import EscalationTarget
from .stub import StubEscalationAdapter
from .bridge import BridgeEscalationAdapter
from .native import NativeEscalationAdapter


def get_escalation_adapter(module: str = None) -> EscalationTarget:
    """
    Returns the configured escalation adapter based on Django settings:
    'stub', 'native', or 'bridge'.
    Default: bridge where configured (EXPRESS_API_BASE_URL), otherwise stub.
    """
    configured = getattr(settings, 'REDFLAG_ESCALATION_ADAPTER', None)

    if configured == 'stub':
        return StubEscalationAdapter()
    if configured == 'native':
        return NativeEscalationAdapter()
    if configured == 'bridge':
        return BridgeEscalationAdapter()

    # Default rule: bridge where configured with a non-empty URL, otherwise stub
    express_url = getattr(settings, 'EXPRESS_API_BASE_URL', None)
    if express_url:
        return BridgeEscalationAdapter(base_url=express_url)

    return StubEscalationAdapter()

