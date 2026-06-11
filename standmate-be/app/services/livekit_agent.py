import os
import certifi
# Programmatic fix for macOS SSL certificate verification issues
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["WEBSOCKET_CLIENT_CA_BUNDLE"] = certifi.where()

import logging
from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
    Agent,
    AgentSession,
)
from livekit.plugins import google, silero, deepgram, cartesia
import asyncio

load_dotenv()

logger = logging.getLogger("standmate-voice-agent")
logger.setLevel(logging.INFO)

def prewarm(proc: JobProcess):
    # ROOT CAUSE RESOLVED: removed 'proc.warm_cache' call because 'JobProcess' does not publish this method in livekit-agents 1.5+
    pass

class StandmateAgent(Agent):
    def __init__(self, room, **kwargs) -> None:
        super().__init__(**kwargs)
        self.room = room

    @llm.function_tool
    async def update_project_details(
        self,
        project_title: str = None,
        short_summary: str = None,
        status: str = None,
        priority: str = None,
        description: str = None,
    ) -> str:
        """Call this tool whenever you want to fill in or update details like project name, short summary, status, priority, or description based on the conversation."""
        payload = {
            "type": "update_project",
            "project_title": project_title,
            "short_summary": short_summary,
            "status": status,
            "priority": priority,
            "description": description,
        }
        # Filter out None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        # Publish data message to all participants in the room
        import json
        encoded_payload = json.dumps(payload).encode("utf-8")
        await self.room.local_participant.publish_data(
            payload=encoded_payload,
            reliable=True,
            topic="agent-update-project"
        )
        return "Project details updated successfully."

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting voice agent to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # Wait for the first user participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"User participant detected: {participant.identity}. Starting voice pipeline...")

    # Define standard AI system prompt (Product Manager Assistant)
    initial_prompt = (
        "You are 'Standmate', an expert AI Product Manager assistant. "
        "Your mission is to help the user brainstorm and define a new software project. "
        "To do this, you will collaboratively guide the user through filling out the project details form in a natural, conversational flow.\n"
        "\n"
        "Here is the structured flow you should follow:\n"
        "1. **Brainstorm Project Name**: Help them define or refine a creative and descriptive 'Project Name' (project_title).\n"
        "2. **Draft Tagline**: Formulate a concise, high-impact 1-sentence tagline as the 'Short Summary' (short_summary).\n"
        "3. **Establish Priority/Status**: Discuss the timeline, scope, and urgency to determine 'Status' (status) and 'Priority' (priority).\n"
        "4. **Flesh out Description**: Interactively brainstorm the user's features, functional requirements, and ideas to build a comprehensive 'Description' (description).\n"
        "\n"
        "**CRITICAL BEHAVIOR FOR UPDATING THE FORM**:\n"
        "- **ASK BEFORE UPDATING**: You MUST always explicitly ask the user for permission *before* calling the `update_project_details` tool to update any form fields on their screen (e.g. 'Should I update the project title to Standmate on your form?', 'Would you like me to add these features to your project description now?'). Only invoke the tool once they give you confirmation.\n"
        "- **ACKNOWLEDGE THE UPDATE**: Immediately after calling the `update_project_details` tool, verbally acknowledge to the user exactly what you updated and confirm that they can see it live on their screen (e.g., 'Perfect, I\\'ve added those brainstormed requirements to your description! You should see it typed out on your screen now.').\n"
        "- Since the description block is cumulative, your new description updates will automatically be prepended on top of what's already there in the rich-text editor on the screen. Therefore, ONLY send your *new* brainstormed additions, notes, or answers in the `description` parameter, rather than re-sending the entire document, so that you build up the project brief incrementally.\n"
        "- Speak naturally, keep your vocal responses short and conversational, and guide the user dynamically. Never sound like a form-filler; guide them like a collaborative partner."
    )

    vad = silero.VAD.load()
    stt = deepgram.STT()
    llm_model = google.LLM(model="gemini-3.5-flash")
    tts = cartesia.TTS()

    # Instantiate the AgentSession with the components
    session = AgentSession(
        vad=vad,
        stt=stt,
        llm=llm_model,
        tts=tts,
    )

    # Instantiate the Agent (the workflow unit in 1.x)
    assistant = StandmateAgent(
        room=ctx.room,
        vad=vad,
        stt=stt,
        llm=llm_model,
        tts=tts,
        instructions=initial_prompt,
        chat_ctx=llm.ChatContext()
    )

    # Run the voice assistant in the room
    await session.start(room=ctx.room, agent=assistant)
    logger.info("Voice Assistant started successfully!")

    # Initial greeting from the agent
    await session.say("Hi there! I am Standmate, your PM brainstorming partner. What project are we planning today?", allow_interruptions=True)

    # Run until disconnected to keep the job/connection alive
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Voice Assistant Agent session cancelled.")
    finally:
        logger.info("Leaving LiveKit room...")

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )
