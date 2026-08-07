import asyncio
import logging
import os

import certifi
from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, AutoSubscribe, JobContext, JobRequest, WorkerOptions, cli
from livekit.plugins import deepgram, google, silero

from core.database import AsyncSessionLocal
from core.config import settings
from models.scrum_master import MeetingTranscriptSegment


os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["WEBSOCKET_CLIENT_CA_BUNDLE"] = certifi.where()
load_dotenv()
logger = logging.getLogger("huzlr-scrum-master-agent")


INSTRUCTIONS = """
You are Huzlr Scrum Master, an explicitly identified AI participant in a team meeting.
Listen carefully and facilitate concise standups. Track completed work, planned work,
blockers, decisions, and proposed action items. Never claim to be a human. Do not create,
assign, or change project work without explicit participant confirmation. Keep spoken
responses short, avoid interrupting, and do not reveal information from other workspaces.
At the beginning, state that you are an AI meeting assistant and that transcription or
summarization may be enabled by the workspace administrator.
"""


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    logger.info("Meet bridge participant connected: %s", participant.identity)

    vad = silero.VAD.load()
    session = AgentSession(
        vad=vad,
        stt=deepgram.STT(),
        llm=google.LLM(model="gemini-2.5-flash", api_key=settings.GEMINI_API_KEY),
        tts="deepgram/aura-2:odysseus",
    )
    agent = Agent(instructions=INSTRUCTIONS)

    try:
        meeting_id = int(ctx.room.name.split("-")[2])
    except (IndexError, ValueError):
        raise RuntimeError(f"Invalid Scrum Master room name: {ctx.room.name}")

    async def persist_message(event):
        item = event.item
        if getattr(item, "type", None) != "message" or item.role not in {"user", "assistant"}:
            return
        text = item.text_content
        if not text:
            return
        async with AsyncSessionLocal() as db:
            db.add(MeetingTranscriptSegment(
                meeting_id=meeting_id,
                speaker_type="agent" if item.role == "assistant" else "participant",
                speaker_id="huzlr-scrum-master" if item.role == "assistant" else None,
                text=text,
                interrupted=item.interrupted,
            ))
            await db.commit()

    def on_conversation_item(event):
        asyncio.create_task(persist_message(event))

    session.on("conversation_item_added", on_conversation_item)
    await session.start(room=ctx.room, agent=agent)
    await session.say(
        "Hello, I am the Huzlr AI Scrum Master. I will help facilitate and may prepare meeting notes according to your workspace settings.",
        allow_interruptions=True,
    )
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Scrum Master agent session stopped")


async def request_fnc(request: JobRequest):
    if request.room.name.startswith("scrum-"):
        await request.accept()
    else:
        await request.reject()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, request_fnc=request_fnc))
