# Scrum Master setup

## Backend configuration

Configure these values in `huzlr-be/.env`:

```dotenv
SECRET_KEY=<long-random-jwt-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8001/api/v1/scrum-master/calendar/google/callback
HUZL_WORKER_KEY=<long-random-service-secret>
AGENT_SERVICE_KEY=<separate-long-random-agent-service-secret>
ENCRYPTION_KEY=<fernet-key>
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<livekit-api-key>
LIVEKIT_API_SECRET=<livekit-api-secret>
GEMINI_API_KEY=<gemini-api-key>
```

Configure the separately deployed `huzlr-agents` worker with LiveKit and provider
credentials plus:

```dotenv
HUZLR_AGENT_TYPE=scrum_master
HUZLR_API_URL=https://<fastapi-project>.vercel.app
HUZLR_AGENT_SERVICE_KEY=<same-value-as-backend-AGENT_SERVICE_KEY>
DEEPGRAM_API_KEY=<deepgram-api-key>
GEMINI_API_KEY=<gemini-api-key>
```

Configure the frontend with the same JWT signing secret and the public service URLs:

```dotenv
JWT_SECRET=<same-value-as-backend-SECRET_KEY>
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud
```

Generate independent JWT and worker secrets with `openssl rand -hex 32`. Generate the
token encryption key with:

```bash
python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

The Google Cloud OAuth client must allow the exact redirect URI above. Enable the
Google Calendar API and request the read-only Calendar scope. OAuth refresh and
access tokens are encrypted before database storage.

Apply the database migration:

```bash
alembic upgrade head
```

## Runtime flow

1. A workspace administrator connects a Calendar account from the frontend.
2. Calendar sync imports upcoming timed events and Google Meet links.
3. Auto-join requires a Meet link, the configured organizer policy, and an invitation
   for the dedicated bot account email.
4. Manual join or a due scheduled meeting becomes claimable by `huzl`.
5. The worker authenticates with `X-Huzl-Worker-Key`, claims one job, and reports
   admission, heartbeat, completion, cancellation, or failure.
6. A stale heartbeat is retried up to three times before the meeting is failed.

The worker key is not a user token and must never be sent to the browser. Google
browser profiles and Calendar OAuth tokens are also separate credentials.

## Production gate

The Meet worker routes audio through a per-meeting LiveKit room and persists agent
conversation messages as transcript segments. The backend generates post-meeting
summaries and proposed action items. Do not enable unattended production facilitation
until the audio path, disclosure, account recovery, and retention flow pass controlled
live-meeting tests. Participant-level diarization and confirmed project writes remain
disabled.

Before production deployment:

1. Back up PostgreSQL and run `alembic upgrade head`.
2. Deploy the backend to Vercel and the Scrum Master from `huzlr-agents` to LiveKit Cloud.
3. Provision one persistent Chromium profile for the dedicated Google bot account.
4. Deploy exactly one Meet worker per mounted Chromium profile.
5. Verify Calendar OAuth, manual join, scheduled join, cancellation, transcript,
   summary, and action-item behavior in a controlled meeting.
6. Put all non-public values in the hosting platform's secret manager. Never expose
   `HUZL_WORKER_KEY`, OAuth client secrets, LiveKit secrets, or the bot profile to the
   browser.
