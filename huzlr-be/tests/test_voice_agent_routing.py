import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from api.v1.endpoints.livekit import get_livekit_token
from core.voice_agents import (
    BRAINSTORM_AGENT_NAME,
    BRAINSTORM_ROOM_TYPE,
    FOUNDER_AGENT_NAME,
    FOUNDER_ROOM_TYPE,
    is_voice_agent_room,
)


class _FakeAgentDispatch:
    def __init__(self):
        self.create_dispatch = AsyncMock()


class _FakeLiveKitAPI:
    instances = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.agent_dispatch = _FakeAgentDispatch()
        self.aclose = AsyncMock()
        self.instances.append(self)


class VoiceAgentRoutingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        _FakeLiveKitAPI.instances.clear()

    async def _request_session(self, room_type):
        with patch("api.v1.endpoints.livekit.livekit_api.LiveKitAPI", _FakeLiveKitAPI):
            return await get_livekit_token(
                room_name=room_type,
                current_user=SimpleNamespace(id=42, username="Nirmal"),
            )

    async def test_brainstorm_session_dispatches_named_worker_to_private_room(self):
        response = await self._request_session(BRAINSTORM_ROOM_TYPE)

        dispatch = _FakeLiveKitAPI.instances[0].agent_dispatch.create_dispatch.await_args.args[0]
        self.assertEqual(dispatch.agent_name, BRAINSTORM_AGENT_NAME)
        self.assertEqual(dispatch.room, response["room_name"])
        self.assertTrue(response["room_name"].startswith(f"{BRAINSTORM_ROOM_TYPE}-"))
        self.assertTrue(is_voice_agent_room(response["room_name"], BRAINSTORM_ROOM_TYPE))

    async def test_founder_session_dispatches_named_worker_to_private_room(self):
        response = await self._request_session(FOUNDER_ROOM_TYPE)

        dispatch = _FakeLiveKitAPI.instances[0].agent_dispatch.create_dispatch.await_args.args[0]
        self.assertEqual(dispatch.agent_name, FOUNDER_AGENT_NAME)
        self.assertEqual(dispatch.room, response["room_name"])
        self.assertTrue(response["room_name"].startswith(f"{FOUNDER_ROOM_TYPE}-"))
        self.assertTrue(is_voice_agent_room(response["room_name"], FOUNDER_ROOM_TYPE))

    async def test_unknown_room_type_is_rejected_before_dispatch(self):
        with self.assertRaises(HTTPException) as error:
            await self._request_session("unknown-room")

        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(_FakeLiveKitAPI.instances, [])


if __name__ == "__main__":
    unittest.main()
