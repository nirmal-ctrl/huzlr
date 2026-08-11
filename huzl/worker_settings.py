import os
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Optional
from urllib.parse import urlsplit

from dotenv import load_dotenv


ENV_FILE = Path(__file__).resolve().with_name(".env")


@dataclass(frozen=True)
class WorkerSettings:
    backend_url: str
    worker_key: str

    @classmethod
    def from_environment(cls, environ: Optional[Mapping[str, str]] = None) -> "WorkerSettings":
        values = environ if environ is not None else os.environ
        backend_url = values.get("HUZLR_BACKEND_URL", "http://host.docker.internal:8001").rstrip("/")
        worker_key = values.get("HUZL_WORKER_KEY", "").strip()

        parsed_url = urlsplit(backend_url)
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            raise RuntimeError("HUZLR_BACKEND_URL must be an absolute http(s) URL")
        if not worker_key:
            raise RuntimeError("HUZL_WORKER_KEY is required")

        require_profile = values.get("REQUIRE_BOT_PROFILE", "false").lower() == "true"
        profile_dir_value = values.get("BOT_PROFILE_DIR", "").strip()
        if require_profile and not profile_dir_value:
            raise RuntimeError("BOT_PROFILE_DIR is required when REQUIRE_BOT_PROFILE=true")
        if profile_dir_value:
            profile_dir = Path(profile_dir_value).expanduser()
            if not profile_dir.exists():
                raise RuntimeError(
                    f"BOT_PROFILE_DIR does not exist: {profile_dir}. "
                    "Run provision_bot_profile.py before starting the worker."
                )
            if not profile_dir.is_dir():
                raise RuntimeError(f"BOT_PROFILE_DIR is not a directory: {profile_dir}")

        return cls(backend_url=backend_url, worker_key=worker_key)


def load_worker_settings() -> WorkerSettings:
    load_dotenv(dotenv_path=ENV_FILE, override=False)
    return WorkerSettings.from_environment()
