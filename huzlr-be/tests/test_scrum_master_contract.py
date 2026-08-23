import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from api.v1.endpoints.scrum_master import (
    _apply_worker_status,
    _fetch_calendar_events,
    _google_meet_url,
    _is_google_meet_url,
    _refresh_calendar_access_token,
)
from models.scrum_master import ScrumMeeting
from schemas.scrum_master import ScrumMasterSettingsUpdate, WorkerStatusUpdate


class ScrumMasterContractTests(unittest.TestCase):
    def test_legacy_hangout_link_without_conference_data_is_not_importable(self):
        event = {"hangoutLink": "https://meet.google.com/abc-defg-hij"}

        self.assertIsNone(_google_meet_url(event))

    def test_calendar_event_accepts_google_video_entry_point(self):
        event = {
            "conferenceData": {
                "conferenceSolution": {"key": {"type": "hangoutsMeet"}},
                "entryPoints": [
                    {"entryPointType": "phone", "uri": "tel:+10000000000"},
                    {"entryPointType": "video", "uri": "https://meet.google.com/abc-defg-hij"},
                ]
            }
        }

        self.assertEqual(_google_meet_url(event), "https://meet.google.com/abc-defg-hij")

    def test_calendar_event_without_google_meet_is_not_importable(self):
        self.assertIsNone(_google_meet_url({"summary": "Focus time"}))
        self.assertIsNone(
            _google_meet_url({
                "conferenceData": {
                    "conferenceSolution": {"key": {"type": "addOn"}},
                    "entryPoints": [{"entryPointType": "video", "uri": "https://zoom.us/j/123"}]
                }
            })
        )

    def test_non_google_conference_data_cannot_supply_meet_url(self):
        event = {
            "conferenceData": {
                "conferenceSolution": {"key": {"type": "addOn"}},
                "entryPoints": [
                    {"entryPointType": "video", "uri": "https://meet.google.com/abc-defg-hij"}
                ],
            }
        }

        self.assertIsNone(_google_meet_url(event))

    def test_google_meet_url_validation_rejects_lookalike_hosts(self):
        self.assertTrue(_is_google_meet_url("https://meet.google.com/abc-defg-hij"))
        self.assertFalse(_is_google_meet_url("https://meet.google.com/"))
        self.assertFalse(_is_google_meet_url("http://meet.google.com/abc-defg-hij"))
        self.assertFalse(_is_google_meet_url("https://meet.google.com.example.com/abc-defg-hij"))

    def test_safe_policy_defaults(self):
        policy = ScrumMasterSettingsUpdate(bot_name="Huzlr Scrum Master")
        self.assertFalse(policy.auto_join)
        self.assertTrue(policy.join_only_organized)
        self.assertIsNone(policy.bot_account_email)

    def test_policy_rejects_unbounded_duration(self):
        with self.assertRaises(ValidationError):
            ScrumMasterSettingsUpdate(bot_name="Huzlr", max_meeting_minutes=300)

    def test_policy_requires_non_blank_conversation_settings(self):
        with self.assertRaises(ValidationError):
            ScrumMasterSettingsUpdate(bot_name="Huzlr", agent_prompt="   ")
        with self.assertRaises(ValidationError):
            ScrumMasterSettingsUpdate(bot_name="Huzlr", introduction_message="\n")

    def test_policy_trims_conversation_settings(self):
        policy = ScrumMasterSettingsUpdate(
            bot_name="Huzlr",
            agent_prompt="  Keep updates concise.  ",
            introduction_message="  Hello team.  ",
        )

        self.assertEqual(policy.agent_prompt, "Keep updates concise.")
        self.assertEqual(policy.introduction_message, "Hello team.")

    def test_worker_error_message_is_bounded(self):
        with self.assertRaises(ValidationError):
            WorkerStatusUpdate(status="failed", error_message="x" * 1001)

    def test_first_join_is_kept_as_the_history_timestamp(self):
        meeting = ScrumMeeting(
            workspace_id=1,
            title="Daily standup",
            starts_at=datetime.now(timezone.utc),
            ends_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        first_join = datetime(2026, 8, 21, 9, 0, tzinfo=timezone.utc)
        later_heartbeat = first_join + timedelta(minutes=5)

        _apply_worker_status(meeting, WorkerStatusUpdate(status="joined"), first_join)
        _apply_worker_status(meeting, WorkerStatusUpdate(status="joined"), later_heartbeat)

        self.assertEqual(meeting.joined_at, first_join)
        self.assertEqual(meeting.heartbeat_at, later_heartbeat)

    def test_failure_after_join_does_not_remove_meeting_history(self):
        meeting = ScrumMeeting(
            workspace_id=1,
            title="Daily standup",
            starts_at=datetime.now(timezone.utc),
            ends_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            bot_enabled=True,
            force_join=True,
        )
        joined_at = datetime(2026, 8, 21, 9, 0, tzinfo=timezone.utc)

        _apply_worker_status(meeting, WorkerStatusUpdate(status="joined"), joined_at)
        _apply_worker_status(
            meeting,
            WorkerStatusUpdate(status="failed", error_code="AUDIO_SETUP_FAILED"),
            joined_at + timedelta(seconds=10),
        )

        self.assertEqual(meeting.joined_at, joined_at)
        self.assertFalse(meeting.bot_enabled)
        self.assertEqual(meeting.status, "failed")


class CalendarTokenTests(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def _http_client(response: MagicMock) -> MagicMock:
        client = AsyncMock()
        client.post.return_value = response
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=client)
        context.__aexit__ = AsyncMock(return_value=None)
        return context

    async def test_expired_google_access_token_is_refreshed(self):
        response = MagicMock(status_code=200)
        response.json.return_value = {"access_token": "new-access-token", "expires_in": 3600}
        connection = SimpleNamespace(id=10, refresh_token="encrypted-refresh", access_token="old", token_expires_at=None)
        db = SimpleNamespace(flush=AsyncMock())

        with (
            patch("api.v1.endpoints.scrum_master.httpx.AsyncClient", return_value=self._http_client(response)),
            patch("api.v1.endpoints.scrum_master.decrypt_token", return_value="refresh-token"),
            patch("api.v1.endpoints.scrum_master.encrypt_token", return_value="encrypted-new-access"),
        ):
            access_token = await _refresh_calendar_access_token(db, connection)

        self.assertEqual(access_token, "new-access-token")
        self.assertEqual(connection.access_token, "encrypted-new-access")
        self.assertGreater(connection.token_expires_at, datetime.now(timezone.utc))
        db.flush.assert_awaited_once()

    async def test_calendar_list_uses_google_default_event_type_filter(self):
        response = MagicMock(status_code=200)
        response.json.return_value = {"items": [], "nextSyncToken": "next-sync-token"}
        client = AsyncMock()
        client.get.return_value = response
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=client)
        context.__aexit__ = AsyncMock(return_value=None)
        connection = SimpleNamespace(sync_token=None, email="calendar@example.com")

        with (
            patch("api.v1.endpoints.scrum_master.httpx.AsyncClient", return_value=context),
            patch("api.v1.endpoints.scrum_master._valid_calendar_access_token", return_value="access-token"),
        ):
            events = await _fetch_calendar_events(SimpleNamespace(), connection)

        self.assertEqual(events, [])
        self.assertEqual(connection.sync_token, "next-sync-token")
        request_params = client.get.await_args.kwargs["params"]
        self.assertEqual(request_params["eventTypes"], "default")

    async def test_revoked_google_refresh_token_requires_reconnect(self):
        response = MagicMock(status_code=400)
        response.json.return_value = {"error": "invalid_grant"}
        connection = SimpleNamespace(id=10, refresh_token="encrypted-refresh")
        db = SimpleNamespace(flush=AsyncMock())

        with (
            patch("api.v1.endpoints.scrum_master.httpx.AsyncClient", return_value=self._http_client(response)),
            patch("api.v1.endpoints.scrum_master.decrypt_token", return_value="refresh-token"),
        ):
            with self.assertRaises(HTTPException) as error:
                await _refresh_calendar_access_token(db, connection)

        self.assertEqual(error.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
