# huzl Context

## Purpose

`huzl` is the isolated Google Meet transport worker for Huzlr Scrum Master. It
claims due jobs from `huzlr-be`, joins Meet through a dedicated persistent Google
account, bridges audio to a per-meeting LiveKit voice-agent room, and reports its
lifecycle to the backend.

## Current Architecture

- `huzlr`: Scrum Master Meetings, Settings, and Meeting Detail UI using RTK Query.
- `huzlr-be`: Multi-account Calendar OAuth/sync, workspace policy, durable meeting queue, worker
  authentication, status/heartbeat, transcript persistence, and LiveKit agent.
- `huzl`: Playwright Meet worker, persistent bot profile, virtual PulseAudio devices,
  LiveKit PCM bridge, cancellation, bounded retries, and cleanup.

## Key Files

- `huzl/worker.py`: Polling worker and meeting-job orchestration.
- `huzl/worker_contract.py`: Validated backend job and lifecycle contract.
- `huzl/provision_bot_profile.py`: Interactive dedicated-account profile setup.
- `huzl/bridge/browser_manager.py`: Persistent or ephemeral Chromium lifecycle.
- `huzl/bridge/meet_worker.py`: Media controls, join request, confirmed admission,
  connection checks, mute/unmute, and leave.
- `huzl/bridge/audio_capture.py`: Meet output to 16 kHz mono PCM.
- `huzl/bridge/audio_injection.py`: Buffered PCM to the Meet virtual microphone.
- `huzl/agent/livekit_bridge.py`: Bidirectional Meet-to-LiveKit PCM adapter.
- `huzlr-be/app/api/v1/endpoints/scrum_master.py`: User and worker APIs.
- `huzlr-be/app/services/scrum_master_agent.py`: VAD/STT/Gemini/TTS Scrum Master.
- `huzlr-be/app/models/scrum_master.py`: Policy, Calendar connection, meeting job,
  lifecycle, output, and transcript persistence.
- `huzlr-be/alembic/versions/8f1c2d3e4a5b_add_scrum_master_models.py`: Schema.
- `huzlr/services/scrumMasterApi.ts`: Typed frontend/backend mapping.

## Runtime Flow

1. Workspace administrator connects one or more Google Calendars through OAuth.
2. Backend encrypts each account's tokens and incrementally syncs timed events and Meet links.
3. Manual join or auto-join policy creates a durable meeting job.
4. `huzl` claims a due job using `X-Huzl-Worker-Key`.
5. Chromium starts with the mounted dedicated-bot profile and requests admission.
6. A visible in-call leave control confirms admission.
7. Meet audio is published to a job-specific LiveKit room.
8. Scrum Master agent performs VAD, Deepgram STT, Gemini reasoning, and TTS.
9. Agent audio is resampled to 16 kHz mono and injected into Meet.
10. Conversation messages are persisted as transcript segments.
11. Worker reports heartbeat, cancellation, failure, and completion.

## Safety Defaults

- Auto-join is off by default.
- Auto-join requires a Meet link and an invitation for the configured bot email.
- Organizer and `[scrum]` title restrictions are workspace policies.
- Calendar tokens are encrypted; the worker key never reaches the browser.
- Google passwords and 2FA secrets are never stored by Huzlr.
- A Chromium profile can be mounted by only one worker at a time.
- The voice agent identifies itself as AI and announces possible note-taking.

## Required Environment

Backend:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`
- `ENCRYPTION_KEY`
- `HUZL_WORKER_KEY`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Provider credentials used by Deepgram and Gemini

Worker:

- `HUZLR_BACKEND_URL`, `HUZL_WORKER_KEY`
- `BOT_PROFILE_DIR`, `REQUIRE_BOT_PROFILE=true`
- `HEADLESS=true` in deployment

## Remaining Validation and Gaps

- Validate multiple Calendar accounts with controlled OAuth and overlapping events.
- Run controlled live-meeting tests for account challenges, waiting-room denial,
  UI selector changes, audio feedback, interruption latency, and container cleanup.
- Mixed Meet audio has no reliable participant-level diarization; transcript speaker
  labels intentionally remain generic.
- Transcript, summary, decision, blocker, and proposed action-item persistence are
  implemented. Confirmed project-tool writes are not yet implemented.
- Existing `agent/livekit_agent.py`, `gemini_runtime.py`, and mock project tools are
  legacy prototype paths; production flow uses `agent/livekit_bridge.py` and the
  backend Scrum Master agent.

## Verification State

- Worker contract tests pass.
- Backend schema contract tests pass.
- Python compile/import checks pass.
- Alembic has one head and renders valid PostgreSQL DDL.
- All three Scrum Master frontend routes compile and return HTTP 200.
- Repository-wide frontend type checking still has four unrelated pre-existing errors.
