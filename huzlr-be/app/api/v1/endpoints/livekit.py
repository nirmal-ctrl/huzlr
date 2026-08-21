import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from livekit import api as livekit_api
from models.user import User
from api.deps import get_current_user
from livekit.api import AccessToken, VideoGrants
from core.config import settings
from core.voice_agents import VOICE_AGENT_ROUTES

router = APIRouter()

@router.get("/token")
async def get_livekit_token(
    room_name: str = "brainstorm-room",
    current_user: User = Depends(get_current_user)
):
    api_key = settings.LIVEKIT_API_KEY
    api_secret = settings.LIVEKIT_API_SECRET

    if not api_key or not api_secret or not settings.LIVEKIT_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LiveKit credentials are not configured on the backend settings."
        )

    agent_name = VOICE_AGENT_ROUTES.get(room_name)
    if not agent_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported voice agent room type.",
        )

    # A unique room keeps simultaneous users and their transcripts isolated.
    session_room_name = f"{room_name}-{uuid.uuid4().hex}"

    try:
        token = (
            AccessToken(api_key, api_secret)
            .with_identity(f"user_{current_user.id}")
            .with_name(current_user.username or f"User {current_user.id}")
            .with_grants(
                VideoGrants(
                    room_join=True,
                    room=session_room_name,
                )
            )
            .to_jwt()
        )

        livekit = livekit_api.LiveKitAPI(
            url=settings.LIVEKIT_URL,
            api_key=api_key,
            api_secret=api_secret,
        )
        try:
            # Named workers require explicit dispatch. Without this, multiple
            # unnamed workers compete for the same job and the wrong one can
            # receive and reject it.
            await livekit.agent_dispatch.create_dispatch(
                livekit_api.CreateAgentDispatchRequest(
                    agent_name=agent_name,
                    room=session_room_name,
                )
            )
        finally:
            await livekit.aclose()

        return {
            "token": token,
            "server_url": settings.LIVEKIT_URL,
            "room_name": session_room_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to start the LiveKit voice agent session.",
        ) from e
