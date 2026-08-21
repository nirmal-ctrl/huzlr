import unittest
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

from api.v1.endpoints.agent_data import require_agent_service_key
from schemas.agent_data import AgentTranscriptCreate


class AgentServiceContractTests(unittest.TestCase):
    def test_service_key_uses_constant_time_authenticated_header(self):
        with patch("api.v1.endpoints.agent_data.settings.AGENT_SERVICE_KEY", "agent-secret"):
            self.assertIsNone(require_agent_service_key("agent-secret"))

    def test_invalid_service_key_is_rejected(self):
        with patch("api.v1.endpoints.agent_data.settings.AGENT_SERVICE_KEY", "agent-secret"):
            with self.assertRaises(HTTPException) as error:
                require_agent_service_key("wrong")
        self.assertEqual(error.exception.status_code, 401)

    def test_transcript_contract_rejects_unknown_speaker_type(self):
        with self.assertRaises(ValidationError):
            AgentTranscriptCreate(speaker_type="system", text="hello")


if __name__ == "__main__":
    unittest.main()
