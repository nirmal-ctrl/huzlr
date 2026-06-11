import os
from fastapi import APIRouter, Depends, HTTPException, status
from models.user import User
from api.deps import get_current_user
from livekit.api import AccessToken, VideoGrants
from core.config import settings

router = APIRouter()

@router.get("/token")
async def get_livekit_token(
    room_name: str = "brainstorm-room",
    current_user: User = Depends(get_current_user)
):
    api_key = settings.LIVEKIT_API_KEY
    api_secret = settings.LIVEKIT_API_SECRET
    
    if not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LiveKit credentials are not configured on the backend settings."
        )
        
    try:
        # Create an Access Token
        # ROOT CAUSE RESOLVED: replaced non-existent 'current_user.name' with 'current_user.username'
        token = (
            AccessToken(api_key, api_secret)
            .with_identity(f"user_{current_user.id}")
            .with_name(current_user.username or f"User {current_user.id}")
            .with_grants(
                VideoGrants(
                    room_join=True,
                    room=room_name,
                )
            )
        )
        return {
            "token": token.to_jwt(),
            "server_url": settings.LIVEKIT_URL or "wss://huzl-hdzkgm0u.livekit.cloud"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate LiveKit token: {str(e)}"
        )
