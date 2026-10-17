from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import select
from models.context import MeetingProject, ContextSession
from services.context_access import enabled, authorize_projects, delegate


async def meeting_context_metadata(db, meeting):
    if not enabled(meeting.workspace_id):
        return {}
    links = (await db.scalars(select(MeetingProject).where(MeetingProject.meeting_id == meeting.id))).all()
    if not links:
        return {}
    actors = {link.configured_by for link in links}
    if len(actors) != 1:
        return {}
    user_id = actors.pop()
    project_ids = sorted({link.project_id for link in links})
    try:
        await authorize_projects(db, user_id, meeting.workspace_id, project_ids)
    except HTTPException:
        # The meeting may proceed, but revoked project access must not survive in metadata.
        return {}
    session = ContextSession(user_id=user_id, workspace_id=meeting.workspace_id, project_ids=project_ids,
                             expires_at=datetime.now(timezone.utc) + timedelta(hours=5))
    db.add(session)
    await db.flush()
    metadata = {"context_session_id": session.id, "context_token": delegate(session), "context_project_ids": session.project_ids}
    await db.commit()
    return metadata
