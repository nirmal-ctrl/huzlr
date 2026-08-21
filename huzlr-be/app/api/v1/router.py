from fastapi import APIRouter
from api.v1.endpoints import agent_data, issues, projects, auth, health, jira, meta, milestones, workspaces, teams, invites, livekit, project_documents, scrum_master

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(invites.router, prefix="/invites", tags=["invites"])
api_router.include_router(issues.router, prefix="/issues", tags=["issues"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(jira.router, prefix="/jira", tags=["jira"])
api_router.include_router(meta.router, prefix="/meta", tags=["meta"])
api_router.include_router(milestones.router, tags=["milestones"])
api_router.include_router(project_documents.router, tags=["project_documents"])
api_router.include_router(livekit.router, prefix="/livekit", tags=["livekit"])
api_router.include_router(scrum_master.router, prefix="/scrum-master", tags=["scrum-master"])
api_router.include_router(agent_data.router, prefix="/internal/agents", tags=["internal-agents"])
