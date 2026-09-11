import asyncio
import logging

from huzlr_agents.config import AgentSettings
from huzlr_agents.context import context_tools, CONTEXT_INSTRUCTIONS

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    JobRequest,
    RoomInputOptions,
    WorkerOptions,
)
from livekit.plugins import deepgram, google, silero

from huzlr_agents.clients.huzlr_api import HuzlrApiClient, HuzlrApiError
from huzlr_agents.contracts import (
    SCRUM_MASTER_AGENT_NAME,
    SCRUM_MASTER_ROOM_PREFIX,
    ScrumMasterConversationConfig,
)


logger = logging.getLogger("huzlr-scrum-master-agent")


def _meeting_id_from_room(room_name: str) -> int:
    parts = room_name.split("-")
    if len(parts) < 4 or parts[0] != "scrum":
        raise RuntimeError(f"Invalid Scrum Master room name: {room_name}")
    try:
        return int(parts[2])
    except ValueError as exc:
        raise RuntimeError(f"Invalid Scrum Master room name: {room_name}") from exc


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    logger.info("Meet bridge participant connected: %s", participant.identity)

    settings = AgentSettings.from_environment()
    api = HuzlrApiClient.from_settings(settings)
    meeting_id = _meeting_id_from_room(ctx.room.name)
    conversation = ScrumMasterConversationConfig.from_metadata(getattr(ctx.job, "metadata", None))
    pending_writes: set[asyncio.Task] = set()

    llm_kwargs = {"api_key": settings.gemini_api_key} if settings.gemini_api_key else {}
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=google.LLM(model="gemini-2.5-flash", **llm_kwargs),
        tts="deepgram/aura-2:odysseus",
    )
    agent = Agent(instructions=conversation.agent_prompt + CONTEXT_INSTRUCTIONS,
                  tools=context_tools(getattr(ctx.job, "metadata", None), settings.api_url))

    async def persist_message(event) -> None:
        item = event.item
        if getattr(item, "type", None) != "message" or item.role not in {"user", "assistant"}:
            return
        text = item.text_content
        if not text:
            return
        try:
            await api.create_transcript_segment(
                meeting_id,
                speaker_type="agent" if item.role == "assistant" else "participant",
                speaker_id=SCRUM_MASTER_AGENT_NAME if item.role == "assistant" else None,
                text=text,
                interrupted=item.interrupted,
            )
        except HuzlrApiError as exc:
            logger.error("Failed to persist meeting transcript: %s", exc)

    def on_conversation_item(event) -> None:
        task = asyncio.create_task(persist_message(event))
        pending_writes.add(task)
        task.add_done_callback(pending_writes.discard)

    def on_user_state_changed(event) -> None:
        if event.new_state == "speaking":
            logger.info("Detected participant speech in Google Meet")

    def on_user_input_transcribed(event) -> None:
        if event.is_final:
            logger.info("Transcribed participant turn (%s characters)", len(event.transcript))

    session.on("conversation_item_added", on_conversation_item)
    session.on("user_state_changed", on_user_state_changed)
    session.on("user_input_transcribed", on_user_input_transcribed)

    try:
        await session.start(
            room=ctx.room,
            agent=agent,
            room_input_options=RoomInputOptions(
                audio_enabled=True,
                audio_sample_rate=16000,
                audio_num_channels=1,
                audio_frame_size_ms=20,
                participant_identity=participant.identity,
                participant_kinds=[rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD],
            ),
        )
        await session.say(conversation.introduction_message, allow_interruptions=True)
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Scrum Master agent stopped")
    finally:
        if pending_writes:
            await asyncio.gather(*pending_writes, return_exceptions=True)
        await api.aclose()


async def request_fnc(request: JobRequest) -> None:
    if request.room.name.startswith(SCRUM_MASTER_ROOM_PREFIX):
        await request.accept()
    else:
        await request.reject()


def build_worker_options() -> WorkerOptions:
    return WorkerOptions(
        entrypoint_fnc=entrypoint,
        request_fnc=request_fnc,
        agent_name=SCRUM_MASTER_AGENT_NAME,
        num_idle_processes=1,
    )
