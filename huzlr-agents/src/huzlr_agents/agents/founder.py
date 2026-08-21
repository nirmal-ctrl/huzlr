import asyncio
import json
import logging

from huzlr_agents.config import AgentSettings

from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    JobProcess,
    JobRequest,
    WorkerOptions,
    llm,
)
from livekit.plugins import deepgram, google, silero

from huzlr_agents.clients.huzlr_api import HuzlrApiClient, HuzlrApiError
from huzlr_agents.contracts import FOUNDER_AGENT_NAME, FOUNDER_ROOM_TYPE, is_room_type


logger = logging.getLogger("huzlr-founder-agent")
UNAUTHORIZED_MESSAGE = "I am sorry, but I am not authenticated or authorized to access your data at this point."

FOUNDER_INSTRUCTIONS = (
    "You are 'Nirmal', the visionary Founder of huzlr (pronounced 'hustler' but spelled 'huzlr'), "
    "an autonomous AI-powered project management platform. Your tone is visionary, warm, helpful, "
    "friendly, and encouraging. Focus on product value and user workflows unless specifically asked "
    "about technical implementation.\n\n"
    "Application map:\n"
    "1. Workspaces and Teams organize users and projects. The page is /teams.\n"
    "2. The dashboard overview is /dashboard.\n"
    "3. Projects, milestones, and planning are under /projects.\n"
    "4. Projects and tasks support dynamic properties and rich editors.\n"
    "5. The Brainstorming Agent helps define projects and update forms live.\n\n"
    "Use list_user_projects and list_user_teams_and_workspaces for real user data. Once you know a "
    "project ID, use the milestone, issue, or document tools for details. Use navigate_to_page when "
    "the user asks to move to an application page. Never expose another user's data. Keep responses "
    "short, conversational, and energetic."
)


def prewarm(_: JobProcess) -> None:
    pass


class FounderAgent(Agent):
    def __init__(self, room, api: HuzlrApiClient, user_id: int | None, **kwargs) -> None:
        super().__init__(**kwargs)
        self.room = room
        self.api = api
        self.user_id = user_id

    def _has_user(self) -> bool:
        return self.user_id is not None

    @llm.function_tool
    async def list_user_teams_and_workspaces(self) -> str:
        """List teams and workspaces available to the authenticated user."""
        if not self._has_user():
            return UNAUTHORIZED_MESSAGE
        try:
            teams = await self.api.list_user_teams(self.user_id)
            if not teams:
                return "You aren't currently part of any teams."
            lines = [
                f"- Team: {team['name']} (ID: {team['id']}), Workspace: {team['workspace_name']}"
                for team in teams
            ]
            return "Here are the teams and workspaces you belong to:\n" + "\n".join(lines)
        except HuzlrApiError as exc:
            logger.error("Failed to fetch teams: %s", exc)
            return UNAUTHORIZED_MESSAGE

    @llm.function_tool
    async def list_user_projects(self) -> str:
        """List projects available to the authenticated user."""
        if not self._has_user():
            return UNAUTHORIZED_MESSAGE
        try:
            projects = await self.api.list_user_projects(self.user_id)
            if not projects:
                return "You don't have any projects in your workspace currently."
            lines = [
                f"- {project['title']} (ID: {project['id']}, Path: {project['path']})"
                for project in projects
            ]
            return "Here are the projects you have access to:\n" + "\n".join(lines)
        except HuzlrApiError as exc:
            logger.error("Failed to fetch projects: %s", exc)
            return UNAUTHORIZED_MESSAGE

    @llm.function_tool
    async def list_project_milestones(self, project_id: int) -> str:
        """List milestones for a project the authenticated user can access."""
        if not self._has_user():
            return UNAUTHORIZED_MESSAGE
        try:
            milestones = await self.api.list_project_milestones(self.user_id, project_id)
            if not milestones:
                return f"No milestones found for project ID {project_id}."
            lines = [f"- {item['title']} (ID: {item['id']})" for item in milestones]
            return f"Milestones for project ID {project_id}:\n" + "\n".join(lines)
        except HuzlrApiError as exc:
            logger.error("Failed to fetch milestones: %s", exc)
            return UNAUTHORIZED_MESSAGE

    @llm.function_tool
    async def list_project_issues(self, project_id: int) -> str:
        """List issues for a project the authenticated user can access."""
        if not self._has_user():
            return UNAUTHORIZED_MESSAGE
        try:
            issues = await self.api.list_project_issues(self.user_id, project_id)
            if not issues:
                return f"No issues found for project ID {project_id}."
            lines = [
                f"- {item['title']} (Status: {item['status']}, ID: {item['id']})"
                for item in issues
            ]
            return f"Issues for project ID {project_id}:\n" + "\n".join(lines)
        except HuzlrApiError as exc:
            logger.error("Failed to fetch issues: %s", exc)
            return UNAUTHORIZED_MESSAGE

    @llm.function_tool
    async def list_project_documents(self, project_id: int) -> str:
        """List documents for a project the authenticated user can access."""
        if not self._has_user():
            return UNAUTHORIZED_MESSAGE
        try:
            documents = await self.api.list_project_documents(self.user_id, project_id)
            if not documents:
                return f"No documents found for project ID {project_id}."
            lines = [f"- {item['title']} (ID: {item['id']})" for item in documents]
            return f"Documents for project ID {project_id}:\n" + "\n".join(lines)
        except HuzlrApiError as exc:
            logger.error("Failed to fetch documents: %s", exc)
            return UNAUTHORIZED_MESSAGE

    @llm.function_tool
    async def navigate_to_page(self, path: str) -> str:
        """Navigate the user to an existing Huzlr page."""
        encoded_payload = json.dumps({"type": "navigate", "path": path}).encode("utf-8")
        await self.room.local_participant.publish_data(
            payload=encoded_payload,
            reliable=True,
            topic="agent-navigate",
        )
        return f"Successfully triggered navigation to {path}."


def _user_id_from_identity(identity: str) -> int | None:
    prefix, separator, raw_id = identity.partition("_")
    if prefix != "user" or not separator:
        return None
    try:
        return int(raw_id)
    except ValueError:
        return None


async def entrypoint(ctx: JobContext) -> None:
    logger.info("Connecting Founder agent to room: %s", ctx.room.name)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    user_id = _user_id_from_identity(participant.identity)
    if user_id is None:
        logger.warning("Could not parse user ID from participant identity: %s", participant.identity)

    settings = AgentSettings.from_environment()
    api = HuzlrApiClient.from_settings(settings)
    try:
        llm_kwargs = {"api_key": settings.gemini_api_key} if settings.gemini_api_key else {}
        vad = silero.VAD.load()
        stt = deepgram.STT()
        llm_model = google.LLM(model="gemini-3.5-flash", **llm_kwargs)
        tts = google.TTS()
        session = AgentSession(vad=vad, stt=stt, llm=llm_model, tts=tts)
        assistant = FounderAgent(
            room=ctx.room,
            api=api,
            user_id=user_id,
            instructions=FOUNDER_INSTRUCTIONS,
            chat_ctx=llm.ChatContext(),
        )
        await session.start(room=ctx.room, agent=assistant)
        logger.info("Founder voice assistant started")
        await session.say(
            "Hey there! I'm Nirmal, the Founder of huzlr. Ask me anything about the platform, or let me guide you through the app!",
            allow_interruptions=True,
        )
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Founder voice assistant stopped")
    finally:
        await api.aclose()


async def request_fnc(request: JobRequest) -> None:
    if is_room_type(request.room.name, FOUNDER_ROOM_TYPE):
        await request.accept()
    else:
        await request.reject()


def build_worker_options() -> WorkerOptions:
    return WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        request_fnc=request_fnc,
        agent_name=FOUNDER_AGENT_NAME,
        num_idle_processes=1,
    )
