from typing import Any

import httpx

from huzlr_agents.config import AgentSettings


class HuzlrApiError(RuntimeError):
    pass


class HuzlrApiClient:
    def __init__(
        self,
        base_url: str,
        service_key: str,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(
            base_url=base_url,
            timeout=15,
        )
        self._client.headers["X-Huzlr-Agent-Key"] = service_key

    @classmethod
    def from_settings(cls, settings: AgentSettings) -> "HuzlrApiClient":
        settings.require_backend_api()
        return cls(settings.api_url, settings.service_key)

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            response = await self._client.request(method, path, **kwargs)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise HuzlrApiError(f"Huzlr API request failed for {path}") from exc

    async def list_user_teams(self, user_id: int) -> list[dict[str, Any]]:
        return await self._request("GET", f"/api/v1/internal/agents/users/{user_id}/teams")

    async def list_user_projects(self, user_id: int) -> list[dict[str, Any]]:
        return await self._request("GET", f"/api/v1/internal/agents/users/{user_id}/projects")

    async def list_project_milestones(self, user_id: int, project_id: int) -> list[dict[str, Any]]:
        return await self._request(
            "GET",
            f"/api/v1/internal/agents/users/{user_id}/projects/{project_id}/milestones",
        )

    async def list_project_issues(self, user_id: int, project_id: int) -> list[dict[str, Any]]:
        return await self._request(
            "GET",
            f"/api/v1/internal/agents/users/{user_id}/projects/{project_id}/issues",
        )

    async def list_project_documents(self, user_id: int, project_id: int) -> list[dict[str, Any]]:
        return await self._request(
            "GET",
            f"/api/v1/internal/agents/users/{user_id}/projects/{project_id}/documents",
        )

    async def create_transcript_segment(
        self,
        meeting_id: int,
        *,
        speaker_type: str,
        speaker_id: str | None,
        text: str,
        interrupted: bool,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"/api/v1/internal/agents/meetings/{meeting_id}/transcripts",
            json={
                "speaker_type": speaker_type,
                "speaker_id": speaker_id,
                "text": text,
                "interrupted": interrupted,
            },
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()
