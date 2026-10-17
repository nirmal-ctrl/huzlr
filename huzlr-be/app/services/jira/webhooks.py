"""Optional dynamic subscriptions are hints; canonical reads remain authoritative."""
from datetime import timedelta
import asyncio
from urllib.parse import urlparse
from jose import jwt, JWTError
from fastapi import HTTPException
from sqlalchemy import select, func
from core.config import settings
from models.jira import JiraBinding, JiraConnection, now
from services.context_access import authorize_projects
from services.jira.client import JiraClient, JiraError, access_token
from core.security_utils import decrypt_token
from cryptography.fernet import InvalidToken

EVENTS = {"jira:issue_created", "jira:issue_updated", "jira:issue_deleted"}


def verify_bearer(value):
    if not settings.JIRA_WEBHOOKS_ENABLED or not settings.JIRA_CLIENT_SECRET:
        raise HTTPException(404, "Jira webhooks are not enabled")
    if not value or not value.startswith("Bearer ") or len(value) > 8000:
        raise HTTPException(401, "Invalid Jira webhook authentication")
    try:
        jwt.decode(value[7:], settings.JIRA_CLIENT_SECRET, algorithms=["HS256"],
            options={"require_exp": True, "verify_aud": False})
    except JWTError:
        raise HTTPException(401, "Invalid Jira webhook authentication") from None


async def hint(db, binding_id, payload):
    binding = await db.scalar(select(JiraBinding).join(JiraConnection).where(
        JiraBinding.id == binding_id, JiraBinding.status == "active", JiraConnection.status == "connected")
        .with_for_update(of=JiraBinding))
    if not binding or not binding.webhook_id:
        return
    if binding.webhook_id not in {str(v) for v in payload.get("matchedWebhookIds", [])}:
        raise HTTPException(400, "Webhook does not match this subscription")
    event = payload.get("webhookEvent")
    if event not in EVENTS:
        return
    # No untrusted issue fields enter storage or Neo4j. Duplicates coalesce to one due run.
    binding.next_sync_at = now()
    if event == "jira:issue_deleted":
        binding.reconciled_at = None


async def maintain(sessions):
    if not settings.JIRA_WEBHOOKS_ENABLED:
        return
    parsed = urlparse(settings.JIRA_WEBHOOK_BASE_URL)
    if parsed.scheme != "https" or not parsed.hostname:
        return
    async with sessions() as db:
        ids = list((await db.scalars(select(JiraBinding.id).join(JiraConnection).where(
            JiraBinding.status == "active", JiraConnection.status == "connected", JiraBinding.webhook_next_at <= now())
            .order_by(JiraBinding.webhook_next_at).limit(5))).all())
        await db.rollback()
        for bid in ids:
            binding = await db.get(JiraBinding, bid)
            if not binding:
                continue
            try:
                await authorize_projects(db, binding.user_id, binding.workspace_id, [binding.project_id])
                token = await access_token(db, binding.connection_id)
                # Token rotation commits; acquire the subscription lock afterwards.
                binding = await db.scalar(select(JiraBinding).where(JiraBinding.id == bid,
                    JiraBinding.webhook_next_at <= now()).with_for_update(skip_locked=True).execution_options(populate_existing=True))
                if not binding:
                    await db.rollback()
                    continue
                async with JiraClient(token, binding.cloud_id) as client:
                    if binding.webhook_id and binding.webhook_expires_at and binding.webhook_expires_at > now() - timedelta(days=80):
                        await client.manage_webhook("PUT", {"webhookIds": [int(binding.webhook_id)]})
                    else:
                        count = await db.scalar(select(func.count()).select_from(JiraBinding).where(
                            JiraBinding.connection_id == binding.connection_id, JiraBinding.cloud_id == binding.cloud_id,
                            JiraBinding.webhook_id.is_not(None)))
                        if count >= 5:
                            raise JiraError(400, "webhook_capacity_polling_only")
                        data = await client.manage_webhook("POST", {"url": f"{settings.JIRA_WEBHOOK_BASE_URL.rstrip('/')}/api/v1/jira/webhooks/{binding.id}",
                            "webhooks": [{"jqlFilter": f"project = {binding.jira_project_id}", "events": sorted(EVENTS)}]})
                        result = data.get("webhookRegistrationResult", data) if isinstance(data, dict) else data
                        if not isinstance(result, list) or not result or not str(result[0].get("createdWebhookId", "")).isdigit():
                            raise JiraError(400, "webhook_registration_unavailable")
                        binding.webhook_id = str(result[0]["createdWebhookId"])
                    binding.webhook_expires_at = now() + timedelta(days=30)
                    binding.webhook_next_at = now() + timedelta(days=20)
                    binding.webhook_error = None
                await db.commit()
            except (JiraError, HTTPException) as exc:
                await db.rollback()
                binding = await db.get(JiraBinding, bid)
                if binding:
                    binding.webhook_error = exc.category if isinstance(exc, JiraError) else "destination_access_revoked"
                    binding.webhook_next_at = now() + timedelta(hours=12)
                    await db.commit()


async def unregister(db, binding):
    if not binding.webhook_id:
        return
    try:
        connection = await db.get(JiraConnection, binding.connection_id)
        if not connection:
            return
        token = decrypt_token(connection.access_token)
        async with asyncio.timeout(3):
            async with JiraClient(token, binding.cloud_id) as client:
                await client.manage_webhook("DELETE", {"webhookIds": [int(binding.webhook_id)]})
    except (JiraError, TimeoutError, InvalidToken, ValueError):
        # Local deletion still revokes access immediately; unreachable subscriptions expire.
        pass
