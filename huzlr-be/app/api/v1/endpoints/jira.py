"""Authenticated Jira connection, discovery and durable import lifecycle."""
import hashlib
import secrets
from datetime import timedelta
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, delete
from api import deps
from core.config import settings
from models.jira import JiraConnection, JiraOAuthState, JiraBinding, now
from models.project import Project
from models.team import Team
from schemas.jira import BindingCreate, SyncRequest
from services.context_access import authorize_projects
from services.jira.client import JiraClient, JiraError, access_token, apply_tokens, token_request, segment
from services.jira.sync import queue_run, run_status, enqueue_context

router = APIRouter()


def provider_error(exc):
    return HTTPException(401 if exc.category == "needs_reconnect" else 503 if exc.status >= 500 or exc.status == 429 else 400,
        f"Jira: {exc.category.replace('_', ' ')}")


def jira_sites(resources):
    return [s for s in resources if any("jira" in scope for scope in s.get("scopes", []))]


async def connection_for(db, user):
    connection = await db.scalar(select(JiraConnection).where(JiraConnection.user_id == user.id))
    if not connection or connection.status != "connected":
        raise HTTPException(409, "Connect Jira before importing")
    return connection


async def site_for(db, user, cloud_id):
    connection = await connection_for(db, user)
    try:
        token = await access_token(db, connection.id)
        async with JiraClient(token) as client:
            sites = jira_sites(await client.get("/oauth/token/accessible-resources"))
    except JiraError as exc:
        raise provider_error(exc)
    site = next((s for s in sites if s.get("id") == cloud_id), None)
    if not site:
        raise HTTPException(403, "Jira site is not authorized")
    parsed = urlparse(site.get("url", ""))
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".atlassian.net"):
        raise HTTPException(502, "Invalid Jira site URL")
    return connection, site, token


async def binding_for(db, user, binding_id):
    binding = await db.scalar(select(JiraBinding).where(JiraBinding.id == binding_id, JiraBinding.user_id == user.id))
    if not binding:
        raise HTTPException(404, "Jira binding not found")
    await authorize_projects(db, user.id, binding.workspace_id, [binding.project_id])
    return binding


@router.get("/authorize")
async def authorize_jira(current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    if not settings.JIRA_CLIENT_ID or not settings.JIRA_CLIENT_SECRET or not settings.JIRA_REDIRECT_URI:
        raise HTTPException(503, "Jira OAuth is not configured")
    state = secrets.token_urlsafe(32)
    await db.execute(delete(JiraOAuthState).where(JiraOAuthState.expires_at < now()))
    db.add(JiraOAuthState(digest=hashlib.sha256(state.encode()).hexdigest(), user_id=current_user.id,
        expires_at=now() + timedelta(minutes=10)))
    await db.commit()
    scope = settings.JIRA_SCOPES + (" manage:jira-webhook read:issue-details:jira" if settings.JIRA_WEBHOOKS_ENABLED else "")
    return {"authorization_url": "https://auth.atlassian.com/authorize?" + urlencode({
        "audience": "api.atlassian.com", "client_id": settings.JIRA_CLIENT_ID, "scope": scope,
        "redirect_uri": settings.JIRA_REDIRECT_URI, "state": state, "response_type": "code", "prompt": "consent"})}


@router.get("/callback")
async def jira_callback(code: str, state: str, current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    if len(state) > 200 or len(code) > 4000:
        raise HTTPException(400, "Invalid OAuth callback")
    consumed = await db.scalar(delete(JiraOAuthState).where(
        JiraOAuthState.digest == hashlib.sha256(state.encode()).hexdigest(),
        JiraOAuthState.user_id == current_user.id, JiraOAuthState.expires_at > now()).returning(JiraOAuthState.user_id))
    await db.commit()
    if consumed is None:
        raise HTTPException(400, "OAuth state expired or invalid; reconnect Jira")
    try:
        data = await token_request({"grant_type": "authorization_code", "client_id": settings.JIRA_CLIENT_ID,
            "client_secret": settings.JIRA_CLIENT_SECRET, "code": code, "redirect_uri": settings.JIRA_REDIRECT_URI})
        async with JiraClient(data["access_token"]) as client:
            sites = jira_sites(await client.get("/oauth/token/accessible-resources"))
        account_id = None
        for site in sites:
            try:
                async with JiraClient(data["access_token"], site["id"]) as client:
                    account_id = (await client.get("/rest/api/3/myself")).get("accountId")
                if account_id:
                    break
            except JiraError as exc:
                if exc.status not in {403, 404}:
                    raise
        if not account_id:
            raise JiraError(403, "jira_account_unavailable")
        connection = await db.scalar(select(JiraConnection).where(JiraConnection.user_id == current_user.id).with_for_update())
        if not connection:
            connection = JiraConnection(user_id=current_user.id)
            db.add(connection)
        elif connection.account_id and connection.account_id != account_id:
            from services.jira.lifecycle import purge_evidence
            for binding in (await db.scalars(select(JiraBinding).where(JiraBinding.connection_id == connection.id))).all():
                await purge_evidence(db, binding)
                await enqueue_context(db, binding, "jira.account_replaced")
                await db.delete(binding)
        apply_tokens(connection, data)
        connection.sites, connection.account_id = sites, account_id
        await db.commit()
    except JiraError as exc:
        await db.rollback()
        raise provider_error(exc)
    return {"message": "Jira connected successfully"}


@router.get("/sites")
async def sites(current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    connection = await connection_for(db, current_user)
    try:
        token = await access_token(db, connection.id)
        async with JiraClient(token) as client:
            result = jira_sites(await client.get("/oauth/token/accessible-resources"))
        return [{k: s.get(k) for k in ["id", "name", "url", "scopes"]} for s in result]
    except JiraError as exc:
        raise provider_error(exc)


@router.get("/sites/{cloud_id}/spaces")
async def spaces(cloud_id: str, current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    _, _, token = await site_for(db, current_user, cloud_id)
    try:
        async with JiraClient(token, cloud_id) as client:
            result = []
            async for values in client.pages("/rest/api/3/project/search"):
                result.extend({k: p.get(k) for k in ["id", "key", "name", "projectTypeKey", "description"]} for p in values)
            return result
    except JiraError as exc:
        raise provider_error(exc)


@router.post("/bindings", status_code=201)
async def create_binding(payload: BindingCreate, current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    wid = await db.scalar(select(Team.workspace_id).join(Project, Project.team_id == Team.id).where(Project.project_id == payload.project_id))
    if wid is None:
        raise HTTPException(404, "Destination project not found")
    await authorize_projects(db, current_user.id, wid, [payload.project_id])
    connection, site, token = await site_for(db, current_user, payload.cloud_id)
    try:
        async with JiraClient(token, payload.cloud_id) as client:
            source = await client.get(f"/rest/api/3/project/{segment(payload.jira_project_id)}")
            if payload.filter_id:
                await client.get(f"/rest/api/3/filter/{payload.filter_id}")
    except JiraError as exc:
        raise provider_error(exc)
    await db.scalar(select(Project).where(Project.project_id == payload.project_id).with_for_update())
    existing = await db.scalar(select(JiraBinding).where(JiraBinding.connection_id == connection.id,
        JiraBinding.project_id == payload.project_id, JiraBinding.cloud_id == payload.cloud_id,
        JiraBinding.jira_project_id == str(source["id"])))
    if existing:
        if existing.filter_id != payload.filter_id:
            raise HTTPException(409, "Source already attached with another scope; disconnect it first")
        return {"id": existing.id, "project_id": existing.project_id}
    binding = JiraBinding(connection_id=connection.id, user_id=current_user.id, project_id=payload.project_id,
        workspace_id=wid, cloud_id=payload.cloud_id, site_url=site["url"].rstrip("/"),
        jira_project_id=str(source["id"]), project_key=source["key"], name=source["name"], filter_id=payload.filter_id)
    db.add(binding)
    await db.flush()
    run = await queue_run(db, binding, full=True)
    await db.commit()
    return {"id": binding.id, "project_id": binding.project_id, "run_id": run.id}


@router.get("/bindings")
async def bindings(project_id: int, current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    rows = (await db.scalars(select(JiraBinding).where(JiraBinding.project_id == project_id, JiraBinding.user_id == current_user.id))).all()
    result = []
    for binding in rows:
        await authorize_projects(db, current_user.id, binding.workspace_id, [binding.project_id])
        result.append(await run_status(db, binding))
    return result


@router.get("/bindings/{binding_id}")
async def get_binding(binding_id: str, current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    return await run_status(db, await binding_for(db, current_user, binding_id))


@router.post("/bindings/{binding_id}/sync", status_code=202)
async def sync_binding(binding_id: str, payload: SyncRequest, current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    binding = await binding_for(db, current_user, binding_id)
    if binding.status != "active":
        raise HTTPException(409, "Source binding is disconnected")
    run = await queue_run(db, binding, full=payload.full)
    await db.commit()
    return {"run_id": run.id, "status": run.status}


@router.delete("/bindings/{binding_id}", status_code=204)
async def remove_binding(binding_id: str, current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    binding = await binding_for(db, current_user, binding_id)
    from services.jira.webhooks import unregister
    await unregister(db, binding)
    from services.jira.lifecycle import purge_evidence
    await purge_evidence(db, binding)
    await enqueue_context(db, binding, "jira.disconnected")
    await db.delete(binding)
    await db.commit()


@router.delete("/connection", status_code=204)
async def disconnect(current_user=Depends(deps.get_current_user), db=Depends(deps.get_db)):
    connection = await db.scalar(select(JiraConnection).where(JiraConnection.user_id == current_user.id).with_for_update())
    if connection:
        from services.jira.webhooks import unregister
        from services.jira.lifecycle import purge_evidence
        for binding in (await db.scalars(select(JiraBinding).where(JiraBinding.connection_id == connection.id))).all():
            await unregister(db, binding)
            await purge_evidence(db, binding)
            await enqueue_context(db, binding, "jira.disconnected")
        await db.delete(connection)
    await db.commit()


@router.post("/webhooks/{binding_id}", status_code=202)
async def jira_webhook(binding_id: str, request: Request, db=Depends(deps.get_db)):
    from services.jira.webhooks import verify_bearer, hint
    verify_bearer(request.headers.get("authorization"))
    # Stream with an explicit bound even when Content-Length is absent.
    body = bytearray()
    async for part in request.stream():
        body.extend(part)
        if len(body) > 512_000:
            raise HTTPException(413, "Webhook payload is too large")
    import json
    try:
        payload = json.loads(body)
        if not isinstance(payload, dict):
            raise ValueError()
        await hint(db, binding_id, payload)
        await db.commit()
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid webhook payload") from None
    return {"accepted": True}
