import os
import certifi
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["WEBSOCKET_CLIENT_CA_BUNDLE"] = certifi.where()

from api.v1.router import api_router
from core.config import settings
from core.vercel_oidc import VercelOIDCTokenMiddleware

# Import all models to ensure they are registered with SQLAlchemy
from models.user import User
# Import leaf models first (to ensure they are in registry if parents reference them)
# But parents usually reference them by string, so order shouldn't matter...
# Unless specific circular dependency issues arise.
# Let's import everything.
from models.risk import Risk, Assumption
from models.milestone import Milestone
from models.issue import IssueDependency
from models.conversation import ConversationLog
from models.version import ProjectVersion
from models.issue import Issue
from models.project import Project
from models.scrum_master import ScrumMasterSettings, GoogleCalendarConnection, ScrumMeeting, MeetingTranscriptSegment


# Vercel owns the process lifecycle. Persistent LiveKit workers are deployed
# from the standalone huzlr-agents module instead of this request-driven app.
app = FastAPI()

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
app.add_middleware(VercelOIDCTokenMiddleware)

app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
