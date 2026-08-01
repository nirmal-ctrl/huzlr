import os
import asyncio
import logging
from typing import Optional
from livekit import agents, rtc
from livekit.agents import JobContext, JobProcess, WorkerOptions, cli
from livekit.agents.voice import Agent
from livekit.plugins import google, deepgram, elevenlabs, silero

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.livekit_agent")

async def entrypoint(ctx: JobContext):
    """Entry point for the LiveKit Voice Assistant Agent."""
    logger.info(f"Job context received. Joining room: {ctx.room.name}")
    
    # Standard setup: wait for participant to connect
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)
    
    # We set up our voice components (Silero VAD, Deepgram STT, Gemini LLM, and ElevenLabs TTS)
    # This aligns perfectly with low latency requirements.
    vad = silero.VAD.load()
    stt = deepgram.STT()
    
    # Use ElevenLabs (or Cartesia / Google TTS) as specified in Component 4
    tts = elevenlabs.TTS()
    
    # The LiveKit voice assistant automatically manages VAD, STT, LLM triggers, and TTS streaming.
    # It coordinates conversational turns and natural interruptions.
    assistant = Agent(
        vad=vad,
        stt=stt,
        llm=google.LLM(model="gemini-1.5-flash"),
        tts=tts,
        instructions=(
            "You are huzlr, an autonomous AI project manager agent on a Google Meet bridge. "
            "Be helpful, natural, concise, and focused on task tracking, blockers, and standup status."
        )
    )

    logger.info("Starting Voice Assistant Agent in LiveKit Room...")
    assistant.start(ctx.room)
    
    # Run until disconnected
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Voice Assistant Agent cancelled.")
    finally:
        logger.info("Leaving LiveKit room...")

def start_agent_worker():
    """Starts the LiveKit Agent worker in the background."""
    logger.info("Initializing LiveKit Agent Worker...")
    # This can be run using the standard LiveKit agents CLI
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

if __name__ == "__main__":
    start_agent_worker()
