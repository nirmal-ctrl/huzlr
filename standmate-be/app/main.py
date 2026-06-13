import sys
import os
import asyncio
import logging
import subprocess
from contextlib import asynccontextmanager
from fastapi import FastAPI
# Trigger reload
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

# Add current directory to sys.path to resolve imports when running from root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.v1.router import api_router
from core.database import engine, AsyncSessionLocal
from core.config import settings

# Import all models to ensure they are registered with SQLAlchemy
from models.base import Base
from models.user import User
# Import leaf models first (to ensure they are in registry if parents reference them)
# But parents usually reference them by string, so order shouldn't matter...
# Unless specific circular dependency issues arise.
# Let's import everything.
from models.risk import Risk, Assumption
from models.milestone import Milestone
from models.task_dependency import TaskDependency
from models.conversation import ConversationLog
from models.version import ProjectVersion
from models.task import Task
from models.project import Project
# Add other models if needed


logger = logging.getLogger(__name__)

async def periodic_health_check():
    while True:
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            logger.info("Health check passed: Database connected")
        except Exception as e:
            logger.error(f"Health check failed: {e}")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background health check
    health_check_task = asyncio.create_task(periodic_health_check())
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start LiveKit Agent worker in a background subprocess so they run together
    agent_process = None
    try:
        agent_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "services", "livekit_agent.py")
        if os.path.exists(agent_path):
            logger.info("Starting LiveKit voice agent worker subprocess...")
            python_executable = sys.executable
            agent_process = subprocess.Popen(
                [python_executable, agent_path, "dev", "--no-reload"],
                stdout=None,
                stderr=None,
            )
            logger.info(f"LiveKit agent worker started successfully with PID {agent_process.pid}")
        else:
            logger.warning(f"LiveKit agent script not found at {agent_path}")
    except Exception as e:
        logger.error(f"Failed to start LiveKit voice agent subprocess: {e}")

    yield
    
    # Cancel background task on shutdown
    health_check_task.cancel()
    try:
        await health_check_task
    except asyncio.CancelledError:
        pass

    # Terminate LiveKit agent worker on shutdown
    if agent_process:
        logger.info("Terminating LiveKit voice agent worker subprocess...")
        agent_process.terminate()
        try:
            agent_process.wait(timeout=5)
            logger.info("LiveKit voice agent worker terminated successfully.")
        except Exception as e:
            logger.warning(f"Agent worker did not terminate cleanly: {e}. Killing it...")
            agent_process.kill()


app = FastAPI(lifespan=lifespan)

# CORS Configuration
origins = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    settings.FRONTEND_BASE_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
