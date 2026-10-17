"""Fixed-origin, read-only Cloud API client with bounded retries and token rotation."""
import asyncio
import random
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx
from sqlalchemy import select
from core.config import settings
from core.security_utils import decrypt_token, encrypt_token
from models.jira import JiraConnection

TOKEN_URL = "https://auth.atlassian.com/oauth/token"
API_URL = "https://api.atlassian.com"


class JiraError(RuntimeError):
    def __init__(self, status: int, category: str, retry_after: float = 0):
        super().__init__(category)
        self.status, self.category, self.retry_after = status, category, retry_after


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def segment(value):
    return quote(str(value), safe="")


async def token_request(payload, transport=None):
    try:
        async with httpx.AsyncClient(timeout=25, transport=transport) as client:
            response = await client.post(TOKEN_URL, json=payload)
    except httpx.HTTPError:
        raise JiraError(503, "token_unavailable") from None
    if response.status_code != 200:
        raise JiraError(response.status_code, "needs_reconnect" if response.status_code in {400, 401, 403} else "token_unavailable")
    try:
        data = response.json()
    except ValueError:
        raise JiraError(502, "invalid_token_response") from None
    if not data.get("access_token") or not data.get("refresh_token") or not isinstance(data.get("expires_in"), int):
        raise JiraError(502, "invalid_token_response")
    return data


def apply_tokens(connection, data):
    connection.access_token = encrypt_token(data["access_token"])
    connection.refresh_token = encrypt_token(data["refresh_token"])
    connection.expires_at = (datetime.now(timezone.utc) + timedelta(seconds=data["expires_in"])).replace(tzinfo=None)
    connection.scope = data.get("scope", connection.scope)
    connection.status = "connected"


async def access_token(db, connection_id, transport=None, force=False, rejected_token=None):
    # Serialize the rotating grant across API and worker processes; refresh the ORM cache after locking.
    connection = await db.scalar(select(JiraConnection).where(JiraConnection.id == connection_id)
        .with_for_update().execution_options(populate_existing=True))
    if not connection or connection.status != "connected":
        await db.rollback()
        raise JiraError(401, "needs_reconnect")
    try:
        current = decrypt_token(connection.access_token)
        if utc(connection.expires_at) > datetime.now(timezone.utc) + timedelta(seconds=60) and (
            not force or (rejected_token and current != rejected_token)
        ):
            await db.commit()
            return current
        data = await token_request({"grant_type": "refresh_token", "client_id": settings.JIRA_CLIENT_ID,
            "client_secret": settings.JIRA_CLIENT_SECRET, "refresh_token": decrypt_token(connection.refresh_token)}, transport)
        apply_tokens(connection, data)
        await db.commit()
        return data["access_token"]
    except JiraError as exc:
        if exc.category == "needs_reconnect":
            connection.status = "needs_reconnect"
            await db.commit()
        else:
            await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise JiraError(503, "credentials_unavailable") from None


class JiraClient:
    def __init__(self, token, cloud_id=None, transport=None):
        if cloud_id and not re.fullmatch(r"[a-zA-Z0-9-]+", cloud_id):
            raise ValueError("Invalid cloud ID")
        self.token, self.cloud_id = token, cloud_id
        self.http = httpx.AsyncClient(timeout=25, transport=transport, follow_redirects=False)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.http.aclose()

    async def request(self, method, path, **kwargs):
        # POST is permitted only for read operations. No source issue writes.
        if method not in {"GET", "POST"} or (method == "POST" and path not in {
            "/rest/api/3/search/jql", "/rest/api/3/jql/match", "/rest/api/3/comment/list",
        }):
            raise ValueError("Jira connector is read-only")
        if self.cloud_id:
            if not path.startswith(("/rest/api/3/", "/rest/agile/1.0/")) or ".." in path or "?" in path:
                raise ValueError("Invalid Jira API path")
            url = f"{API_URL}/ex/jira/{self.cloud_id}{path}"
        elif path == "/oauth/token/accessible-resources":
            url = API_URL + path
        else:
            raise ValueError("Site required")
        return await self._send(method, url, **kwargs)

    async def manage_webhook(self, method, payload):
        """Explicit subscription management; issue writes remain forbidden."""
        if not self.cloud_id or method not in {"POST", "PUT", "DELETE"}:
            raise ValueError("Invalid webhook operation")
        return await self._send(method, f"{API_URL}/ex/jira/{self.cloud_id}/rest/api/3/webhook", json=payload)

    async def _send(self, method, url, **kwargs):
        for attempt in range(3):
            try:
                response = await self.http.request(method, url, headers={"Authorization": f"Bearer {self.token}",
                    "Accept": "application/json"}, **kwargs)
            except httpx.HTTPError:
                if attempt == 2:
                    raise JiraError(503, "provider_unavailable") from None
                await asyncio.sleep(2 ** attempt)
                continue
            if response.status_code in {429, 500, 502, 503, 504}:
                try:
                    delay = max(1, float(response.headers.get("Retry-After", 2 ** attempt)))
                except ValueError:
                    delay = 5
                if attempt == 2 or delay > 10:
                    raise JiraError(response.status_code, "rate_limited" if response.status_code == 429 else "provider_unavailable", min(delay, 3600))
                await asyncio.sleep(delay + random.random())
                continue
            if response.status_code >= 300:
                category = {401: "token_rejected", 403: "access_denied", 404: "unavailable", 400: "invalid_request"}.get(response.status_code, "provider_error")
                raise JiraError(response.status_code, category)
            if response.status_code == 204:
                return {}
            try:
                return response.json()
            except ValueError:
                raise JiraError(502, "invalid_provider_response") from None

    async def get(self, path, **kwargs):
        return await self.request("GET", path, **kwargs)

    async def post(self, path, **kwargs):
        return await self.request("POST", path, **kwargs)

    async def attachment_bytes(self, attachment_id):
        """Stream a bounded file from the fixed OAuth origin; never follow source URLs."""
        if not self.cloud_id or not str(attachment_id).isdigit():
            raise ValueError("Invalid attachment scope")
        url = f"{API_URL}/ex/jira/{self.cloud_id}/rest/api/3/attachment/content/{segment(attachment_id)}"
        try:
            async with self.http.stream("GET", url, params={"redirect": "false"},
                headers={"Authorization": f"Bearer {self.token}", "Accept": "*/*"}) as response:
                if response.status_code != 200:
                    raise JiraError(response.status_code, "attachment_unavailable",
                        60 if response.status_code == 429 else 0)
                value = bytearray()
                async for part in response.aiter_bytes(chunk_size=65536):
                    value.extend(part)
                    if len(value) > settings.JIRA_MAX_ATTACHMENT_BYTES:
                        raise JiraError(400, "attachment_too_large")
                return bytes(value)
        except httpx.HTTPError:
            raise JiraError(503, "provider_unavailable") from None

    async def pages(self, path, key="values", params=None):
        cursor, seen = 0, set()
        while True:
            data = await self.get(path, params={**(params or {}), "startAt": cursor, "maxResults": 100})
            if isinstance(data, list):
                yield data
                return
            values, next_cursor = offset_page(data, key, cursor)
            yield values
            if next_cursor is None:
                return
            if next_cursor in seen:
                raise JiraError(502, "pagination_did_not_advance")
            seen.add(next_cursor)
            cursor = next_cursor


def offset_page(data, key, start):
    values = data.get(key)
    if not isinstance(values, list):
        raise JiraError(502, "invalid_provider_response")
    if data.get("isLast") is True or (isinstance(data.get("total"), int) and start + len(values) >= data["total"]):
        return values, None
    if not values:
        if data.get("isLast") is False or data.get("total", 0) > start:
            raise JiraError(502, "pagination_did_not_advance")
        return values, None
    # An endpoint without a page envelope returned its complete list.
    if "total" not in data and "isLast" not in data and "maxResults" not in data:
        return values, None
    return values, start + len(values)


def source_jql(binding):
    if not str(binding.jira_project_id).isdigit():
        raise ValueError("Invalid source project ID")
    base = f"project = {binding.jira_project_id}"
    if binding.filter_id:
        base += f" AND filter = {int(binding.filter_id)}"
    return base
