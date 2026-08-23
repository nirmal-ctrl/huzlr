import hmac
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal, Optional
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, status
from fastapi.responses import RedirectResponse, Response
from jose import JWTError, jwt
from livekit import api as livekit_api
from livekit.api import AccessToken, VideoGrants
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user, get_db
from core.access import assert_admin, assert_workspace_member
from core.config import settings
from core.security_utils import decrypt_token, encrypt_token
from core.voice_agents import SCRUM_MASTER_AGENT_NAME
from models.scrum_master import GoogleCalendarConnection, MeetingTranscriptSegment, ScrumMasterSettings, ScrumMeeting
from models.user import User
from models.workspace_membership import WorkspaceRoleEnum
from schemas.scrum_master import (
    CalendarConnectResponse,
    CalendarConnectionResponse,
    CalendarSyncResponse,
    CalendarStatusResponse,
    MeetingPageResponse,
    MeetingResponse,
    MeetingDetailResponse,
    ScrumMasterSettingsResponse,
    ScrumMasterSettingsUpdate,
    WorkerControlResponse,
    WorkerJobResponse,
    WorkerStatusUpdate,
)
from services.meeting_outputs import finalize_meeting_outputs


router = APIRouter()
logger = logging.getLogger(__name__)
GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URI = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_EVENTS_URI = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
CALENDAR_SCOPE = "openid email https://www.googleapis.com/auth/calendar.readonly"
WORKER_STATUSES = {
    "starting", "authenticating", "waiting_for_admission", "joined", "leaving",
    "completed", "failed", "cancelled",
}
ACTIVE_MEETING_STATUSES = {
    "queued", "starting", "authenticating", "waiting_for_admission", "joined", "leaving",
}


def _apply_worker_status(meeting: ScrumMeeting, payload: WorkerStatusUpdate, now: datetime) -> None:
    meeting.heartbeat_at = now
    meeting.status = payload.status
    if payload.status == "joined" and meeting.joined_at is None:
        meeting.joined_at = now
    meeting.error_code = payload.error_code
    meeting.error_message = payload.error_message
    if payload.status in {"completed", "failed", "cancelled"}:
        meeting.completed_at = now
        meeting.bot_enabled = False
        meeting.force_join = False


async def _get_or_create_settings(db: AsyncSession, workspace_id: int) -> ScrumMasterSettings:
    result = await db.execute(select(ScrumMasterSettings).where(ScrumMasterSettings.workspace_id == workspace_id))
    value = result.scalar_one_or_none()
    if value:
        return value
    value = ScrumMasterSettings(workspace_id=workspace_id)
    db.add(value)
    await db.flush()
    return value


def _worker_authorized(worker_key: Optional[str]):
    configured = settings.HUZL_WORKER_KEY
    if not worker_key or not configured or not hmac.compare_digest(worker_key, configured):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid worker key")


def _calendar_state(user_id: int, workspace_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    return jwt.encode(
        {"sub": str(user_id), "workspace_id": workspace_id, "purpose": "calendar_oauth", "exp": expires},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _calendar_reconnect_required() -> HTTPException:
    return HTTPException(
        status_code=409,
        detail="Google Calendar authorization has expired. Reconnect the calendar to continue.",
    )


def _is_google_meet_url(value: object) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value.strip())
    return (
        parsed.scheme == "https"
        and parsed.hostname == "meet.google.com"
        and bool(parsed.path.strip("/"))
    )


def _google_meet_url(event: dict) -> Optional[str]:
    conference_data = event.get("conferenceData") or {}
    conference_type = (
        conference_data.get("conferenceSolution", {})
        .get("key", {})
        .get("type")
    )
    if conference_type != "hangoutsMeet":
        return None

    for entry in conference_data.get("entryPoints", []):
        if entry.get("entryPointType") != "video":
            continue
        candidate = entry.get("uri")
        if not isinstance(candidate, str):
            continue
        candidate = candidate.strip()
        if _is_google_meet_url(candidate):
            return candidate
    return None


async def _refresh_calendar_access_token(db: AsyncSession, connection: GoogleCalendarConnection) -> str:
    if not connection.refresh_token:
        raise _calendar_reconnect_required()

    now = datetime.now(timezone.utc)
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                GOOGLE_TOKEN_URI,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": decrypt_token(connection.refresh_token),
                    "grant_type": "refresh_token",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Google Calendar token refresh is temporarily unavailable") from exc

    if response.status_code != 200:
        try:
            google_error = response.json().get("error", "unknown_error")
        except ValueError:
            google_error = "invalid_response"
        logger.warning(
            "Google Calendar refresh rejected for connection %s: %s",
            connection.id,
            google_error,
        )
        if google_error in {"invalid_grant", "invalid_token", "unauthorized_client"}:
            raise _calendar_reconnect_required()
        raise HTTPException(status_code=502, detail="Google Calendar rejected the token refresh request")
    payload = response.json()
    connection.access_token = encrypt_token(payload["access_token"])
    connection.token_expires_at = now + timedelta(seconds=int(payload.get("expires_in", 3600)))
    await db.flush()
    return payload["access_token"]


async def _valid_calendar_access_token(db: AsyncSession, connection: GoogleCalendarConnection) -> str:
    now = datetime.now(timezone.utc)
    expires_at = connection.token_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at > now + timedelta(minutes=1):
        return decrypt_token(connection.access_token)
    return await _refresh_calendar_access_token(db, connection)


@router.get("/settings", response_model=ScrumMasterSettingsResponse)
async def get_scrum_master_settings(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await assert_workspace_member(current_user.id, workspace_id, db)
    value = await _get_or_create_settings(db, workspace_id)
    await db.commit()
    return value


@router.put("/settings", response_model=ScrumMasterSettingsResponse)
async def update_scrum_master_settings(
    payload: ScrumMasterSettingsUpdate,
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await assert_admin(current_user.id, workspace_id, db)
    value = await _get_or_create_settings(db, workspace_id)
    for key, field_value in payload.model_dump().items():
        setattr(value, key, field_value)
    await db.commit()
    await db.refresh(value)
    return value


@router.get("/calendar/status", response_model=CalendarStatusResponse)
async def calendar_status(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = await assert_workspace_member(current_user.id, workspace_id, db)
    result = await db.execute(
        select(GoogleCalendarConnection)
        .where(GoogleCalendarConnection.workspace_id == workspace_id)
        .order_by(GoogleCalendarConnection.email.asc())
    )
    connections = list(result.scalars().all())
    connection_responses = []
    requires_reconnect = False
    for connection in connections:
        connection_requires_reconnect = False
        try:
            await _valid_calendar_access_token(db, connection)
        except HTTPException as exc:
            if exc.status_code == 409:
                connection_requires_reconnect = True
                requires_reconnect = True
            elif exc.status_code >= 500:
                logger.warning("Calendar credential check failed for connection %s: %s", connection.id, exc.detail)
            else:
                raise
        connection_responses.append(
            CalendarConnectionResponse(
                id=connection.id,
                email=connection.email,
                last_synced_at=connection.last_synced_at,
                requires_reconnect=connection_requires_reconnect,
            )
        )
    await db.commit()
    return CalendarStatusResponse(
        connected=bool(connections),
        can_manage=membership.role == WorkspaceRoleEnum.ADMIN,
        requires_reconnect=requires_reconnect,
        connections=connection_responses,
    )


@router.get("/calendar/google/connect", response_model=CalendarConnectResponse)
async def calendar_connect(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await assert_admin(current_user.id, workspace_id, db)
    if settings.GOOGLE_CLIENT_ID == "your-google-client-id":
        raise HTTPException(status_code=503, detail="Google Calendar OAuth is not configured")
    query = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_CALENDAR_REDIRECT_URI,
        "response_type": "code",
        "scope": CALENDAR_SCOPE,
        "access_type": "offline",
        "prompt": "select_account consent",
        "include_granted_scopes": "true",
        "state": _calendar_state(current_user.id, workspace_id),
    })
    return CalendarConnectResponse(authorization_url=f"{GOOGLE_AUTH_URI}?{query}")


@router.get("/calendar/google/callback")
async def calendar_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    try:
        claims = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if claims.get("purpose") != "calendar_oauth":
            raise JWTError("invalid purpose")
        user_id = int(claims["sub"])
        workspace_id = int(claims["workspace_id"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    await assert_admin(user_id, workspace_id, db)
    async with httpx.AsyncClient(timeout=20) as client:
        token_response = await client.post(GOOGLE_TOKEN_URI, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_CALENDAR_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Google token exchange failed")
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Google did not return an access token")
        user_response = await client.get(GOOGLE_USERINFO_URI, headers={"Authorization": f"Bearer {access_token}"})
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Could not read Google account identity")
        email = user_response.json().get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google account email is unavailable")

    result = await db.execute(
        select(GoogleCalendarConnection).where(
            GoogleCalendarConnection.workspace_id == workspace_id,
            GoogleCalendarConnection.email == email,
        )
    )
    connection = result.scalar_one_or_none()
    if not connection:
        connection = GoogleCalendarConnection(workspace_id=workspace_id, connected_by=user_id, email=email, access_token="")
        db.add(connection)
    connection.connected_by = user_id
    connection.email = email
    connection.access_token = encrypt_token(access_token)
    if tokens.get("refresh_token"):
        connection.refresh_token = encrypt_token(tokens["refresh_token"])
    connection.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(tokens.get("expires_in", 3600)))
    connection.sync_token = None
    await db.commit()
    return RedirectResponse(f"{settings.FRONTEND_BASE_URL}/scrum-master/meetings?calendar=connected")


@router.post("/calendar/google/disconnect", status_code=204)
async def calendar_disconnect(
    workspace_id: int,
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await assert_admin(current_user.id, workspace_id, db)
    result = await db.execute(
        select(GoogleCalendarConnection).where(
            GoogleCalendarConnection.id == connection_id,
            GoogleCalendarConnection.workspace_id == workspace_id,
        )
    )
    connection = result.scalar_one_or_none()
    if connection:
        await db.delete(connection)
        await db.commit()
    return Response(status_code=204)


async def _fetch_calendar_events(db: AsyncSession, connection: GoogleCalendarConnection) -> list[dict]:
    access_token = await _valid_calendar_access_token(db, connection)
    params = {
        "singleEvents": "true",
        "eventTypes": "default",
        "maxResults": "250",
    }
    if connection.sync_token:
        params["syncToken"] = connection.sync_token
    else:
        params["timeMin"] = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        params["timeMax"] = (datetime.now(timezone.utc) + timedelta(days=60)).isoformat()

    events = []
    next_page = None
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            if next_page:
                params["pageToken"] = next_page
            response = await client.get(GOOGLE_EVENTS_URI, params=params, headers={"Authorization": f"Bearer {access_token}"})
            if response.status_code == 401:
                access_token = await _refresh_calendar_access_token(db, connection)
                response = await client.get(
                    GOOGLE_EVENTS_URI,
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if response.status_code == 401:
                    raise _calendar_reconnect_required()
            if response.status_code == 410 and connection.sync_token:
                connection.sync_token = None
                await db.flush()
                return await _fetch_calendar_events(db, connection)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Google Calendar synchronization failed for {connection.email}")
            payload = response.json()
            events.extend(payload.get("items", []))
            next_page = payload.get("nextPageToken")
            if not next_page:
                connection.sync_token = payload.get("nextSyncToken")
                break
    return events


async def _sync_calendar_connection(
    db: AsyncSession,
    connection: GoogleCalendarConnection,
    policy: ScrumMasterSettings,
) -> list[ScrumMeeting]:
    workspace_id = connection.workspace_id
    events = await _fetch_calendar_events(db, connection)
    changed = []
    for event in events:
        event_id = event.get("id")
        if not event_id:
            continue
        existing_result = await db.execute(select(ScrumMeeting).where(and_(ScrumMeeting.workspace_id == workspace_id, ScrumMeeting.calendar_event_id == event_id)))
        meeting = existing_result.scalar_one_or_none()
        if event.get("status") == "cancelled":
            if meeting:
                meeting.status = "cancelled"
                meeting.cancel_requested = True
            continue
        start_value = event.get("start", {}).get("dateTime")
        end_value = event.get("end", {}).get("dateTime")
        if not start_value or not end_value:
            continue
        meet_url = _google_meet_url(event)
        if not meet_url:
            if meeting and meeting.joined_at is None:
                if meeting.status in ACTIVE_MEETING_STATUSES:
                    meeting.meet_url = None
                    meeting.bot_enabled = False
                    meeting.cancel_requested = True
                else:
                    await db.delete(meeting)
            continue
        organizer_email = event.get("organizer", {}).get("email")
        attendee_emails = {attendee.get("email") for attendee in event.get("attendees", [])}
        title = event.get("summary") or "Untitled meeting"
        eligible = bool(meet_url and policy.bot_account_email and policy.bot_account_email in attendee_emails)
        if policy.join_only_organized:
            eligible = eligible and organizer_email == connection.email
        if policy.require_scrum_tag:
            eligible = eligible and "[scrum]" in title.lower()
        if not meeting:
            meeting = ScrumMeeting(
                workspace_id=workspace_id,
                calendar_event_id=event_id,
                title=title,
                starts_at=datetime.now(timezone.utc),
                ends_at=datetime.now(timezone.utc),
                bot_enabled=False,
                status="not_scheduled",
            )
            db.add(meeting)
        meeting.title = title
        meeting.starts_at = datetime.fromisoformat(start_value.replace("Z", "+00:00"))
        meeting.ends_at = datetime.fromisoformat(end_value.replace("Z", "+00:00"))
        meeting.meet_url = meet_url
        meeting.organizer_email = organizer_email
        meeting.attendees_count = len(event.get("attendees", []))
        if policy.auto_join and eligible and meeting.status not in {"joined", "completed"}:
            meeting.bot_enabled = True
            meeting.status = "scheduled"
            meeting.job_id = meeting.job_id or str(uuid.uuid4())
        changed.append(meeting)

    stale_result = await db.execute(
        select(ScrumMeeting).where(
            ScrumMeeting.workspace_id == workspace_id,
            ScrumMeeting.joined_at.is_(None),
        )
    )
    for stale_meeting in stale_result.scalars().all():
        if _is_google_meet_url(stale_meeting.meet_url):
            continue
        if stale_meeting.status in ACTIVE_MEETING_STATUSES:
            stale_meeting.meet_url = None
            stale_meeting.bot_enabled = False
            stale_meeting.cancel_requested = True
        else:
            await db.delete(stale_meeting)

    connection.last_synced_at = datetime.now(timezone.utc)
    return changed


@router.post("/calendar/sync", response_model=CalendarSyncResponse)
async def sync_calendar(
    workspace_id: int,
    connection_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await assert_workspace_member(current_user.id, workspace_id, db)
    query = select(GoogleCalendarConnection).where(GoogleCalendarConnection.workspace_id == workspace_id)
    if connection_id is not None:
        query = query.where(GoogleCalendarConnection.id == connection_id)
    result = await db.execute(query.order_by(GoogleCalendarConnection.id.asc()))
    connections = list(result.scalars().all())
    if not connections:
        raise HTTPException(status_code=409, detail="Google Calendar is not connected")

    policy = await _get_or_create_settings(db, workspace_id)
    changed: list[ScrumMeeting] = []
    for connection in connections:
        changed.extend(await _sync_calendar_connection(db, connection, policy))

    await db.commit()
    changed = list({meeting.id: meeting for meeting in changed}.values())
    return CalendarSyncResponse(synced_count=len(changed), connection_count=len(connections))


@router.get("/meetings", response_model=MeetingPageResponse)
async def list_meetings(
    workspace_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    view: Literal["upcoming", "history"] = "upcoming",
    include_past: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await assert_workspace_member(current_user.id, workspace_id, db)
    filters = [ScrumMeeting.workspace_id == workspace_id]
    if view == "history":
        filters.append(ScrumMeeting.joined_at.is_not(None))
        ordering = ScrumMeeting.joined_at.desc()
    else:
        filters.append(ScrumMeeting.meet_url.like("https://meet.google.com/%"))
        if not include_past:
            filters.append(ScrumMeeting.ends_at >= datetime.now(timezone.utc))
            ordering = ScrumMeeting.starts_at.asc()
        else:
            ordering = ScrumMeeting.starts_at.desc()

    total = await db.scalar(select(func.count(ScrumMeeting.id)).where(*filters)) or 0
    bot_scheduled_total = await db.scalar(
        select(func.count(ScrumMeeting.id)).where(*filters, ScrumMeeting.bot_enabled.is_(True))
    ) or 0
    result = await db.execute(
        select(ScrumMeeting)
        .where(*filters)
        .order_by(ordering)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return MeetingPageResponse(
        items=list(result.scalars().all()),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
        bot_scheduled_total=bot_scheduled_total,
    )


@router.get("/meetings/{meeting_id}", response_model=MeetingDetailResponse)
async def get_meeting_detail(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await _meeting_for_user(meeting_id, current_user, db)
    transcript_result = await db.execute(
        select(MeetingTranscriptSegment)
        .where(MeetingTranscriptSegment.meeting_id == meeting.id)
        .order_by(MeetingTranscriptSegment.created_at.asc())
    )
    response = MeetingDetailResponse.model_validate(meeting)
    response.transcript = list(transcript_result.scalars().all())
    return response


async def _meeting_for_user(meeting_id: int, current_user: User, db: AsyncSession) -> ScrumMeeting:
    result = await db.execute(select(ScrumMeeting).where(ScrumMeeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    await assert_workspace_member(current_user.id, meeting.workspace_id, db)
    return meeting


@router.post("/meetings/{meeting_id}/schedule", response_model=MeetingResponse)
async def schedule_meeting(meeting_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = await _meeting_for_user(meeting_id, current_user, db)
    if not meeting.meet_url:
        raise HTTPException(status_code=409, detail="Meeting does not have a Google Meet link")
    meeting.bot_enabled = True
    meeting.force_join = False
    meeting.cancel_requested = False
    meeting.status = "scheduled"
    meeting.job_id = meeting.job_id or str(uuid.uuid4())
    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.post("/meetings/{meeting_id}/join", response_model=MeetingResponse)
async def join_meeting_now(meeting_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = await _meeting_for_user(meeting_id, current_user, db)
    if not meeting.meet_url:
        raise HTTPException(status_code=409, detail="Meeting does not have a Google Meet link")
    if meeting.status in {"queued", "starting", "authenticating", "waiting_for_admission", "joined", "leaving"}:
        return meeting
    meeting.bot_enabled = True
    meeting.force_join = True
    meeting.cancel_requested = False
    meeting.status = "queued"
    meeting.job_id = str(uuid.uuid4())
    meeting.error_code = None
    meeting.error_message = None
    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.post("/meetings/{meeting_id}/cancel", response_model=MeetingResponse)
async def cancel_meeting_bot(meeting_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = await _meeting_for_user(meeting_id, current_user, db)
    meeting.bot_enabled = False
    meeting.cancel_requested = True
    if meeting.status in {"scheduled", "queued"}:
        meeting.status = "cancelled"
    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.post("/worker/jobs/claim", response_model=WorkerJobResponse, responses={204: {"description": "No due job"}})
async def claim_worker_job(
    x_huzl_worker_key: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
):
    _worker_authorized(x_huzl_worker_key)
    now = datetime.now(timezone.utc)
    stale_result = await db.execute(
        select(ScrumMeeting).where(
            ScrumMeeting.status.in_(["starting", "authenticating", "waiting_for_admission", "joined", "leaving"]),
            ScrumMeeting.heartbeat_at < now - timedelta(minutes=2),
        ).with_for_update(skip_locked=True)
    )
    for stale in stale_result.scalars().all():
        if stale.attempt_count >= 3:
            stale.status = "failed"
            stale.error_code = "WORKER_HEARTBEAT_EXPIRED"
            stale.error_message = "The worker stopped reporting progress after three attempts."
            stale.bot_enabled = False
            stale.completed_at = now
        else:
            stale.status = "queued"
            stale.force_join = True
            stale.job_id = str(uuid.uuid4())
    result = await db.execute(
        select(ScrumMeeting)
        .where(
            ScrumMeeting.bot_enabled.is_(True),
            ScrumMeeting.cancel_requested.is_(False),
            ScrumMeeting.status.in_(["scheduled", "queued"]),
            ScrumMeeting.meet_url.is_not(None),
            ScrumMeeting.ends_at > now,
            or_(ScrumMeeting.force_join.is_(True), ScrumMeeting.starts_at <= now + timedelta(minutes=15)),
        )
        .order_by(ScrumMeeting.starts_at.asc())
        .with_for_update(skip_locked=True)
    )
    candidates = result.scalars().all()
    selected = None
    policy = None
    for candidate in candidates:
        candidate_policy = await _get_or_create_settings(db, candidate.workspace_id)
        if candidate.force_join or candidate.starts_at <= now + timedelta(minutes=candidate_policy.join_buffer_minutes):
            selected = candidate
            policy = candidate_policy
            break
    if not selected or not policy:
        await db.rollback()
        return Response(status_code=204)

    selected.status = "starting"
    selected.claimed_at = now
    selected.heartbeat_at = now
    selected.attempt_count += 1
    selected.job_id = selected.job_id or str(uuid.uuid4())
    selected.outputs = {
        "requested": {
            "transcript": policy.transcript_enabled,
            "summary": policy.summary_enabled,
            "action_items": policy.action_items_enabled,
        }
    }
    await db.commit()
    livekit_room = f"scrum-{selected.workspace_id}-{selected.id}-{selected.job_id[:8]}"
    livekit_token = None
    if settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET and settings.LIVEKIT_URL:
        livekit_token = (
            AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
            .with_identity(f"meet-bridge-{selected.id}")
            .with_name(policy.bot_name)
            .with_grants(VideoGrants(room_join=True, room=livekit_room))
            .to_jwt()
        )
        livekit = livekit_api.LiveKitAPI(
            url=settings.LIVEKIT_URL,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
        try:
            await livekit.agent_dispatch.create_dispatch(
                livekit_api.CreateAgentDispatchRequest(
                    agent_name=SCRUM_MASTER_AGENT_NAME,
                    room=livekit_room,
                    metadata=json.dumps(
                        {
                            "agent_prompt": policy.agent_prompt,
                            "introduction_message": policy.introduction_message,
                        }
                    ),
                )
            )
        except Exception as exc:
            selected.status = "queued"
            selected.claimed_at = None
            selected.heartbeat_at = None
            selected.attempt_count = max(0, selected.attempt_count - 1)
            await db.commit()
            raise HTTPException(status_code=503, detail="Scrum Master voice agent dispatch failed") from exc
        finally:
            await livekit.aclose()
    return WorkerJobResponse(
        job_id=selected.job_id,
        meeting_id=selected.id,
        workspace_id=selected.workspace_id,
        meet_url=selected.meet_url,
        starts_at=selected.starts_at,
        bot_name=policy.bot_name,
        max_duration_minutes=policy.max_meeting_minutes,
        outputs={
            "transcript": policy.transcript_enabled,
            "summary": policy.summary_enabled,
            "action_items": policy.action_items_enabled,
        },
        livekit_url=settings.LIVEKIT_URL if livekit_token else None,
        livekit_token=livekit_token,
        livekit_room=livekit_room if livekit_token else None,
    )


@router.post("/worker/jobs/{job_id}/status", response_model=WorkerControlResponse)
async def update_worker_job(
    job_id: str,
    payload: WorkerStatusUpdate,
    background_tasks: BackgroundTasks,
    x_huzl_worker_key: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
):
    _worker_authorized(x_huzl_worker_key)
    if payload.status not in WORKER_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported worker status")
    result = await db.execute(select(ScrumMeeting).where(ScrumMeeting.job_id == job_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Worker job not found")
    _apply_worker_status(meeting, payload, datetime.now(timezone.utc))
    cancel_requested = meeting.cancel_requested
    await db.commit()
    if payload.status == "completed":
        background_tasks.add_task(finalize_meeting_outputs, meeting.id)
    return WorkerControlResponse(cancel_requested=cancel_requested)
