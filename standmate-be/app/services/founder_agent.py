import os
import sys
import certifi
# Programmatic fix for macOS SSL certificate verification issues
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["WEBSOCKET_CLIENT_CA_BUNDLE"] = certifi.where()

# Ensure the parent app/ directory is in sys.path to resolve core/ and models/ imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import all SQLAlchemy models to guarantee they are fully registered before any queries run
try:
    from models.base import Base
    from models.user import User
    from models.workspace import Workspace
    from models.team import Team
    from models.team_membership import TeamMembership
    from models.project import Project
    from models.project_document import ProjectDocument
    from models.milestone import Milestone
    from models.issue import Issue, IssueDependency
    from models.risk import Risk, Assumption
    from models.conversation import ConversationLog
    from models.version import ProjectVersion
except Exception as e:
    pass

import logging
from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    JobRequest,
    WorkerOptions,
    cli,
    llm,
    Agent,
    AgentSession,
)
from livekit.plugins import google, silero, deepgram, cartesia
import asyncio

load_dotenv()

logger = logging.getLogger("founder-voice-agent")
logger.setLevel(logging.INFO)

def prewarm(proc: JobProcess):
    pass

class FounderAgent(Agent):
    def __init__(self, room, user_id: int | None = None, **kwargs) -> None:
        super().__init__(**kwargs)
        self.room = room
        self.user_id = user_id

    @llm.function_tool
    async def list_user_teams_and_workspaces(self) -> str:
        """Call this tool whenever the user asks what teams or workspaces they belong to."""
        if not self.user_id:
            return "I am sorry, but I am not authenticated or authorized to access your data at this point."
        try:
            from core.database import AsyncSessionLocal
            from models.team import Team
            from models.team_membership import TeamMembership
            from sqlalchemy import select
            
            async with AsyncSessionLocal() as db:
                query = (
                    select(Team)
                    .join(TeamMembership, TeamMembership.team_id == Team.id)
                    .where(TeamMembership.user_id == self.user_id)
                )
                result = await db.execute(query)
                teams = result.scalars().all()
                
                if not teams:
                    return "You aren't currently part of any teams."
                
                team_list = [f"- Team: {t.name} (ID: {t.id})" for t in teams]
                return "Here are the teams you belong to:\n" + "\n".join(team_list)
        except Exception as e:
            logger.error(f"Error querying teams: {e}")
            return "I am sorry, but I am not authenticated or authorized to access your data at this point."

    @llm.function_tool
    async def list_user_projects(self) -> str:
        """Call this tool whenever the user asks what projects exist or what projects they have. It will query the database and return a list of their projects."""
        if not self.user_id:
            return "I am sorry, but I am not authenticated or authorized to access your data at this point."
        
        try:
            from core.database import AsyncSessionLocal
            from models.project import Project
            from models.team_membership import TeamMembership
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload
            
            async with AsyncSessionLocal() as db:
                query = (
                    select(Project)
                    .options(selectinload(Project._property_record))
                    .join(TeamMembership, TeamMembership.team_id == Project.team_id)
                    .where(TeamMembership.user_id == self.user_id)
                )
                result = await db.execute(query)
                projects = result.scalars().all()
                
                if not projects:
                    return "You don't have any projects in your workspace currently."
                
                project_list = []
                for p in projects:
                    title = p.properties.get("project_title") or f"Project {p.project_id}"
                    project_list.append(f"- {title} (ID: {p.project_id}, Path: /projects/{p.project_id})")
                
                return "Here are the projects the user has access to:\n" + "\n".join(project_list)
        except Exception as e:
            logger.error(f"Error querying projects: {e}")
            return "I am sorry, but I am not authenticated or authorized to access your data at this point."

    @llm.function_tool
    async def list_project_milestones(self, project_id: int) -> str:
        """Call this tool to list all the planned milestones for a specific project based on its ID."""
        if not self.user_id:
            return "I am sorry, but I am not authenticated or authorized to access your data at this point."
        try:
            from core.database import AsyncSessionLocal
            from models.milestone import Milestone
            from models.project import Project
            from models.team_membership import TeamMembership
            from sqlalchemy import select
            
            async with AsyncSessionLocal() as db:
                # Authorization check: verify project belongs to user's team membership
                auth_query = (
                    select(Project)
                    .join(TeamMembership, TeamMembership.team_id == Project.team_id)
                    .where(TeamMembership.user_id == self.user_id)
                    .where(Project.project_id == project_id)
                )
                auth_result = await db.execute(auth_query)
                if not auth_result.scalars().first():
                    return "I am sorry, but I am not authenticated or authorized to access the data for that project."

                query = select(Milestone).where(Milestone.project_id == project_id)
                result = await db.execute(query)
                milestones = result.scalars().all()
                
                if not milestones:
                    return f"No milestones found for project ID {project_id}."
                
                milestone_list = [f"- {m.title} (Status: {m.status}, ID: {m.id})" for m in milestones]
                return f"Milestones for project ID {project_id}:\n" + "\n".join(milestone_list)
        except Exception as e:
            logger.error(f"Error querying milestones: {e}")
            return "I am sorry, but I am not authenticated or authorized to access the data for that project."

    @llm.function_tool
    async def list_project_issues(self, project_id: int) -> str:
        """Call this tool to list all the issues and items currently in progress or planned under a specific project ID."""
        if not self.user_id:
            return "I am sorry, but I am not authenticated or authorized to access your data at this point."
        try:
            from core.database import AsyncSessionLocal
            from models.issue import Issue
            from models.project import Project
            from models.team_membership import TeamMembership
            from sqlalchemy import select
            
            async with AsyncSessionLocal() as db:
                # Authorization check: verify project belongs to user's team membership
                auth_query = (
                    select(Project)
                    .join(TeamMembership, TeamMembership.team_id == Project.team_id)
                    .where(TeamMembership.user_id == self.user_id)
                    .where(Project.project_id == project_id)
                )
                auth_result = await db.execute(auth_query)
                if not auth_result.scalars().first():
                    return "I am sorry, but I am not authenticated or authorized to access the data for that project."

                query = select(Issue).where(Issue.project_id == project_id)
                result = await db.execute(query)
                issues_list = result.scalars().all()
                
                if not issues_list:
                    return f"No issues found for project ID {project_id}."
                
                issue_str_list = [f"- {t.title} (Status: {t.status}, ID: {t.id})" for t in issues_list]
                return f"Issues for project ID {project_id}:\n" + "\n".join(issue_str_list)
        except Exception as e:
            logger.error(f"Error querying issues: {e}")
            return "I am sorry, but I am not authenticated or authorized to access the data for that project."

    @llm.function_tool
    async def list_project_documents(self, project_id: int) -> str:
        """Call this tool to retrieve a list of all documentation briefs, documents, and records associated with a project ID."""
        if not self.user_id:
            return "I am sorry, but I am not authenticated or authorized to access your data at this point."
        try:
            from core.database import AsyncSessionLocal
            from models.project_document import ProjectDocument
            from models.project import Project
            from models.team_membership import TeamMembership
            from sqlalchemy import select
            
            async with AsyncSessionLocal() as db:
                # Authorization check: verify project belongs to user's team membership
                auth_query = (
                    select(Project)
                    .join(TeamMembership, TeamMembership.team_id == Project.team_id)
                    .where(TeamMembership.user_id == self.user_id)
                    .where(Project.project_id == project_id)
                )
                auth_result = await db.execute(auth_query)
                if not auth_result.scalars().first():
                    return "I am sorry, but I am not authenticated or authorized to access the data for that project."

                query = select(ProjectDocument).where(ProjectDocument.project_id == project_id)
                result = await db.execute(query)
                docs = result.scalars().all()
                
                if not docs:
                    return f"No documents found for project ID {project_id}."
                
                doc_list = [f"- {d.title} (ID: {d.document_id})" for d in docs]
                return f"Documents for project ID {project_id}:\n" + "\n".join(doc_list)
        except Exception as e:
            logger.error(f"Error querying documents: {e}")
            return "I am sorry, but I am not authenticated or authorized to access the data for that project."

    @llm.function_tool
    async def navigate_to_page(
        self,
        path: str,
    ) -> str:
        """Call this tool whenever you want to navigate the user to a different page or section of the application based on their request (e.g. '/dashboard', '/projects', '/teams', '/projects/123'). Only navigate to paths that exist in the system."""
        payload = {
            "type": "navigate",
            "path": path,
        }
        import json
        encoded_payload = json.dumps(payload).encode("utf-8")
        await self.room.local_participant.publish_data(
            payload=encoded_payload,
            reliable=True,
            topic="agent-navigate"
        )
        return f"Successfully triggered navigation to {path}."

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting Founder voice agent to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # Wait for the first user participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"User participant detected: {participant.identity}. Starting voice pipeline...")

    # Extract user ID from identity (e.g. "user_123")
    try:
        user_id = int(participant.identity.split("_")[1])
    except Exception:
        user_id = None
        logger.warning(f"Failed to parse user ID from identity: {participant.identity}")

    # Define Founder system prompt with complete knowledge of the application
    initial_prompt = (
        "You are 'Nirmal', the visionary Founder of huzlr (pronounced 'hustler' but spelled 'huzlr'), the autonomous AI-powered project management platform.\n"
        "Your tone is visionary, warm, helpful, friendly, and extremely encouraging. Do not talk about low-level backend technical code unless specifically asked. Focus entirely on explaining product value, platforms features, and guiding the user's workflow.\n\n"
        "Here is the complete guide and map of the application features:\n"
        "1. **Core Mission**: huzlr solves the pain of engineering team overhead and PM bottlenecks by offering real-time risk predictions, autonomous milestone/task planning, and rich document generation.\n"
        "2. **Workspaces & Teams**: Users can create Workspaces to isolate projects and teams. They can invite people via email using the team-switcher or create-team modal. The page is located at '/teams'.\n"
        "3. **Dashboard**: The main overview hub for tracking active metrics and high-level status, located at '/dashboard'.\n"
        "4. **Projects & Milestone Views**: Track team projects, gantt charts, and milestones. Located at '/projects'.\n"
        "5. **Dynamic Properties (Custom Fields)**: Just like Notion, huzlr allows users to dynamically add, edit, and organize custom fields (like Status, Priority, Tags) on projects and tasks in live tables.\n"
        "6. **Rich Notion-like Editors**: huzlr uses robust, gorgeous TipTap components for editing project titles, details, and briefs natively.\n"
        "7. **Autonomous Brainstorming Agent (Standmate)**: Users can start a real-time voice brainstorming session with 'Standmate', an AI product manager assistant that live-updates project forms and briefs.\n\n"
        "**DATA RECOGNITION & NAVIGATION CAPABILITIES**:\n"
        "- You have the ability to read the actual user data from the app. When asked 'what projects do we have?' or similar, call the `list_user_projects` tool to fetch their real list of active projects.\n"
        "- You can find their team memberships via `list_user_teams_and_workspaces`.\n"
        "- Once you know a project's ID from the list, you can fetch its milestones (`list_project_milestones`), tasks (`list_project_tasks`), or documentation records (`list_project_documents`) if asked about details.\n"
        "- When asked to 'take me to [Project Name]', find the matching project in the list and get its path (e.g., `/projects/123`), then call `navigate_to_page` with that path to shift their screen instantly.\n"
        "- If a user says 'Take me to the dashboard' or 'Show me my projects', call `navigate_to_page` with '/dashboard' or '/projects' respectively.\n"
        "- Verbally let the user know you are shifting their screen (e.g., 'Sure thing! Let me take you over to the dashboard page right now.').\n"
        "- If for some reason the authorization is missing or identity splits show none, return exactly: 'I am sorry, but I am not authenticated or authorized to access your data at this point.'\n\n"
        "Speak naturally, keeping your responses short, conversational, and energetic. Guide the user dynamically."
    )

    vad = silero.VAD.load()
    stt = deepgram.STT()
    llm_model = google.LLM(model="gemini-3.5-flash")
    tts = google.TTS()

    # Instantiate the AgentSession with the components
    session = AgentSession(
        vad=vad,
        stt=stt,
        llm=llm_model,
        tts=tts,
    )

    # Instantiate the Agent (the workflow unit in 1.x)
    assistant = FounderAgent(
        room=ctx.room,
        user_id=user_id,
        vad=vad,
        stt=stt,
        llm=llm_model,
        tts=tts,
        instructions=initial_prompt,
        chat_ctx=llm.ChatContext()
    )

    # Run the voice assistant in the room
    await session.start(room=ctx.room, agent=assistant)
    logger.info("Founder Voice Assistant started successfully!")

    # Initial greeting from the agent
    await session.say("Hey there! I'm Nirmal, the Founder of huzlr. Ask me anything about how our platform operates, or let me guide you through the app!", allow_interruptions=True)

    # Run until disconnected to keep the job/connection alive
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Founder Voice Assistant Agent session cancelled.")
    finally:
        logger.info("Leaving LiveKit room...")


async def request_fnc(req: JobRequest) -> None:
    logger.info(f"Received job request for room: {req.room.name}")
    if req.room.name == "founder-room":
        logger.info("Accepting founder job request")
        await req.accept()
    else:
        logger.info("Rejecting job request - room name mismatch")
        await req.reject()

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            request_fnc=request_fnc,
        )
    )
