import asyncio
import json
import logging
from typing import Optional

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

from huzlr_agents.contracts import (
    BRAINSTORM_AGENT_NAME,
    BRAINSTORM_ROOM_TYPE,
    is_room_type,
)


logger = logging.getLogger("huzlr-brainstorm-agent")

BRAINSTORM_INSTRUCTIONS = (
    "You are 'Huzlr', an expert AI Product Manager assistant. "
    "Your mission is to help the user brainstorm and define a new software project. "
    "Collaboratively guide the user through filling out the project details form in a natural, conversational flow.\n\n"
    "Follow this structure:\n"
    "1. Brainstorm and refine a creative Project Name (project_title).\n"
    "2. Formulate a concise one-sentence Short Summary (short_summary).\n"
    "3. Discuss timeline, scope, and urgency to determine Status and Priority.\n"
    "4. Brainstorm features and requirements to build a comprehensive Description.\n\n"
    "CRITICAL UPDATE RULES:\n"
    "- Always ask for explicit permission before calling update_project_details.\n"
    "- After an update, say exactly what changed and confirm it is visible on screen.\n"
    "- Description updates are cumulative. Send only new additions rather than the entire document.\n"
    "- Keep spoken responses short, natural, and collaborative."
)


def prewarm(_: JobProcess) -> None:
    pass


class BrainstormAgent(Agent):
    def __init__(self, room, **kwargs) -> None:
        super().__init__(**kwargs)
        self.room = room

    @llm.function_tool
    async def update_project_details(
        self,
        project_title: Optional[str] = None,
        short_summary: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        description: Optional[str] = None,
    ) -> str:
        """Update confirmed project-form details based on the conversation."""
        payload = {
            "type": "update_project",
            "project_title": project_title,
            "short_summary": short_summary,
            "status": status,
            "priority": priority,
            "description": description,
        }
        encoded_payload = json.dumps(
            {key: value for key, value in payload.items() if value is not None}
        ).encode("utf-8")
        await self.room.local_participant.publish_data(
            payload=encoded_payload,
            reliable=True,
            topic="agent-update-project",
        )
        return "Project details updated successfully."


async def entrypoint(ctx: JobContext) -> None:
    logger.info("Connecting brainstorming agent to room: %s", ctx.room.name)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    logger.info("User participant detected: %s", participant.identity)

    settings = AgentSettings.from_environment()
    llm_kwargs = {"api_key": settings.gemini_api_key} if settings.gemini_api_key else {}
    vad = silero.VAD.load()
    stt = deepgram.STT()
    llm_model = google.LLM(model="gemini-3.5-flash", **llm_kwargs)
    tts = "deepgram/aura-2:odysseus"
    session = AgentSession(vad=vad, stt=stt, llm=llm_model, tts=tts)
    assistant = BrainstormAgent(
        room=ctx.room,
        instructions=BRAINSTORM_INSTRUCTIONS,
        chat_ctx=llm.ChatContext(),
    )

    await session.start(room=ctx.room, agent=assistant)
    logger.info("Brainstorming voice assistant started")
    await session.say(
        "Hi there! I am Huzlr, your PM brainstorming partner. What project are we planning today?",
        allow_interruptions=True,
    )
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Brainstorming voice assistant stopped")


async def request_fnc(request: JobRequest) -> None:
    if is_room_type(request.room.name, BRAINSTORM_ROOM_TYPE):
        await request.accept()
    else:
        await request.reject()


def build_worker_options() -> WorkerOptions:
    return WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        request_fnc=request_fnc,
        agent_name=BRAINSTORM_AGENT_NAME,
        num_idle_processes=1,
    )
