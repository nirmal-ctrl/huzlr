import os
from dataclasses import dataclass

import certifi
from dotenv import load_dotenv


load_dotenv()
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
os.environ.setdefault("WEBSOCKET_CLIENT_CA_BUNDLE", certifi.where())


@dataclass(frozen=True)
class AgentSettings:
    agent_type: str
    api_url: str
    service_key: str
    gemini_api_key: str

    @classmethod
    def from_environment(cls) -> "AgentSettings":
        return cls(
            agent_type=os.getenv("HUZLR_AGENT_TYPE", "").strip(),
            api_url=os.getenv("HUZLR_API_URL", "").rstrip("/"),
            service_key=os.getenv("HUZLR_AGENT_SERVICE_KEY", ""),
            gemini_api_key=os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", ""),
        )

    def require_backend_api(self) -> None:
        missing = []
        if not self.api_url:
            missing.append("HUZLR_API_URL")
        if not self.service_key:
            missing.append("HUZLR_AGENT_SERVICE_KEY")
        if missing:
            raise RuntimeError(f"Missing required agent settings: {', '.join(missing)}")
