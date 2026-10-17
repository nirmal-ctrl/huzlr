"""Purge derived private evidence when its connection is explicitly removed."""
from sqlalchemy import select, delete
from models.context import ContextArtifact, ContextClaim, ContextTurn, ContextSession
from services.jira.projector import projection_id


async def purge_evidence(db, binding):
    prefix = projection_id(binding, "", "").rstrip(":") + ":"
    for model in [ContextArtifact, ContextClaim]:
        await db.execute(delete(model).where(model.source_id.startswith(prefix)))
    sessions = select(ContextSession.id).where(ContextSession.user_id == binding.user_id,
        ContextSession.workspace_id == binding.workspace_id)
    await db.execute(delete(ContextTurn).where(ContextTurn.session_id.in_(sessions),
        ContextTurn.answer["jira_context"].as_boolean().is_(True)))
