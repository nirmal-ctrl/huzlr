from fastapi import APIRouter
from api.v1.endpoints import tasks, projects, auth, health, jira, meta, milestones, workspaces, teams, invites

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(invites.router, prefix="/invites", tags=["invites"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(jira.router, prefix="/jira", tags=["jira"])
api_router.include_router(meta.router, prefix="/meta", tags=["meta"])
api_router.include_router(milestones.router, tags=["milestones"])
