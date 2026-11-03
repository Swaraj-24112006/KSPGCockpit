import logging
import requests
from django.conf import settings

from .base import EscalationTarget, TargetEscalationError
from redflag.enums import EscalationModule

logger = logging.getLogger(__name__)


class BridgeEscalationAdapter(EscalationTarget):
    """
    Bridge adapter performing server-to-server HTTP POST to Express create endpoints.
    """

    def __init__(self, base_url: str = None, service_token: str = None, timeout: int = 10):
        self.base_url = (base_url or getattr(settings, 'EXPRESS_API_BASE_URL', 'http://localhost:3000')).rstrip('/')
        self.service_token = service_token or getattr(settings, 'EXPRESS_SERVICE_TOKEN', '')
        self.timeout = timeout

    def _get_headers(self) -> dict:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        if self.service_token:
            headers['Authorization'] = f"Bearer {self.service_token}"
            headers['X-Service-Token'] = self.service_token
        return headers

    def create_from_red_flag(self, module: str, flag, actor, payload: dict) -> tuple[str, str, dict]:
        if module == EscalationModule.PPSR:
            endpoint = f"{self.base_url}/api/ppsrreports"
            id_key = 'id'
            no_key = 'ppsrNo'
        elif module == EscalationModule.KAIZEN:
            endpoint = f"{self.base_url}/api/kaizens"
            id_key = 'id'
            no_key = 'srNo'
        elif module == EscalationModule.FIVES_RED_TAG:
            endpoint = f"{self.base_url}/api/fives/redtags"
            id_key = 'id'
            no_key = 'tagNo'
        else:
            raise TargetEscalationError(f"Unknown escalation module: {module}", status_code=400)

        logger.info("Escalating Red Flag %s to %s via bridge %s", flag.red_flag_no, module, endpoint)

        try:
            resp = requests.post(
                endpoint,
                json=payload,
                headers=self._get_headers(),
                timeout=self.timeout
            )
        except requests.exceptions.RequestException as e:
            logger.error("Bridge connection failed for %s -> %s: %s", flag.red_flag_no, module, e)
            raise TargetEscalationError(
                f"Failed to connect to {module} service: {str(e)}",
                status_code=502
            )

        if not (200 <= resp.status_code < 300):
            logger.error("Bridge target error %d: %s", resp.status_code, resp.text)
            raise TargetEscalationError(
                f"Upstream {module} service rejected request ({resp.status_code}): {resp.text}",
                status_code=502
            )

        try:
            res_json = resp.json()
        except Exception:
            raise TargetEscalationError(f"Invalid JSON response from {module} service", status_code=502)

        record_data = (
            res_json.get('data') or
            res_json.get('ppsr') or
            res_json.get('kaizen') or
            res_json.get('redTag') or
            res_json
        )

        ref_id = record_data.get(id_key) or record_data.get('id')
        ref_no = record_data.get(no_key) or record_data.get('srNo') or record_data.get('tagNo') or record_data.get('ppsrNo')

        if not ref_id or not ref_no:
            raise TargetEscalationError(
                f"Upstream {module} response missing required id or reference number: {record_data}",
                status_code=502
            )

        return str(ref_id), str(ref_no), record_data

