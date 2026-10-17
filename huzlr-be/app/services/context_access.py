"""The SQL authorization boundary is always evaluated before contacting Neo4j."""
from datetime import datetime, timezone
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import select

from core.config import settings
from models.context import ContextSession
from models.project import Project
from models.team import Team
from models.team_membership import TeamMembership
from models.workspace import Workspace
from models.workspace_membership import WorkspaceMembership
from models.user import User


def enabled(workspace_id: int) -> bool:
    # workspace_id remains part of the call contract to make tenant scoping explicit;
    # enablement itself is global so no workspace or project is omitted.
    return settings.CONTEXT_ENABLED


async def authorize_projects(db, user_id: int, workspace_id: int, project_ids: list[int]):
    if not enabled(workspace_id):
        raise HTTPException(404, "Project context is not enabled for this workspace")
    if not project_ids or len(project_ids) > 10:
        raise HTTPException(422, "Select between one and ten projects")
    query = (select(Project)
        .join(Team, Team.id == Project.team_id)
        .join(Workspace, Workspace.id == Team.workspace_id)
        .join(TeamMembership, TeamMembership.team_id == Team.id)
        .join(WorkspaceMembership, WorkspaceMembership.workspace_id == Workspace.id)
        .join(User, User.id == WorkspaceMembership.user_id)
        .where(Workspace.id == workspace_id, Workspace.deleted_at.is_(None), Team.deleted_at.is_(None),
               TeamMembership.user_id == user_id, WorkspaceMembership.user_id == user_id,
               Project.project_id.in_(project_ids), User.is_active.is_(True), User.has_access.is_(True)))
    projects = list((await db.scalars(query)).all())
    if {p.project_id for p in projects} != set(project_ids):
        raise HTTPException(403, "One or more selected projects are unavailable")
    return projects


async def session_for_user(db, session_id: str, user_id: int):
    session = await db.get(ContextSession, session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(404, "Context session not found")
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires <= datetime.now(timezone.utc):
        raise HTTPException(410, "Context session expired; select your projects again")
    await authorize_projects(db, user_id, session.workspace_id, session.project_ids)
    return session


def delegate(session: ContextSession, purpose="context-read", jira_private=False) -> str:
    if not settings.CONTEXT_DELEGATION_SECRET:
        raise HTTPException(503, "Context delegation is not configured")
    if purpose not in {"context-read", "context-evidence"}:
        raise ValueError("Invalid delegation purpose")
    return jwt.encode({"sid": session.id, "uid": session.user_id, "purpose": purpose, "jira_private": jira_private,
                       "aud": "huzlr-context", "exp": session.expires_at},
                      settings.CONTEXT_DELEGATION_SECRET, algorithm="HS256")


async def delegated_session(db, token: str, purpose="context-read"):
    if not settings.CONTEXT_DELEGATION_SECRET:
        raise HTTPException(401, "Invalid context delegation")
    try:
        payload = jwt.decode(token, settings.CONTEXT_DELEGATION_SECRET, algorithms=["HS256"], audience="huzlr-context")
        if payload.get("purpose") != purpose:
            raise ValueError("Wrong purpose")
        session = await session_for_user(db, payload["sid"], int(payload["uid"]))
        session.jira_private = payload.get("jira_private") is True
        return session
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(401, "Invalid context delegation") from exc
