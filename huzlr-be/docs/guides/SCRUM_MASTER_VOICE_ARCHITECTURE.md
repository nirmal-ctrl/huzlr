# Scrum Master voice architecture

This document describes the current Huzlr Scrum Master meeting architecture. It
separates the job-control path from the real-time audio path because they run in
different processes and use different credentials.

## Current runtime architecture

```mermaid
flowchart LR
    Person[Meeting participant]

    subgraph Google[Google-hosted services]
        Meet[Google Meet]
        Calendar[Google Calendar API]
    end

    subgraph AppHost[Vercel application]
        Web[Next.js frontend]

        subgraph Backend[FastAPI backend process]
            API[Scrum Master API<br/>scheduling, job claims, tokens]
        end

        DB[(PostgreSQL<br/>meetings, settings, transcripts, outputs)]
    end

    subgraph WorkerHost[GCP worker VM]
        subgraph Docker[huzl-worker Docker container]
            Poller[Job poller]
            Playwright[Playwright + headless Chromium<br/>authenticated Google bot profile]
            Speaker[PulseAudio virtual speaker<br/>Meet playback capture]
            Bridge[Python LiveKit audio bridge<br/>16 kHz mono PCM]
            Microphone[PulseAudio virtual microphone<br/>agent speech injection]
        end
        subgraph AgentWorker[Scrum Master agent container]
            Agent[Scrum Master agent deployment]
            AgentSession[LiveKit AgentSession]
            VAD[Silero VAD]
        end
    end

    subgraph LiveKitCloud[LiveKit Cloud]
        LK[Per-meeting LiveKit room<br/>huzl-hdzkgm0u.livekit.cloud]
        Dispatch[Named agent dispatch<br/>huzlr-scrum-master]
    end

    subgraph AIProviders[Managed AI providers]
        STT[Deepgram STT<br/>speech to text]
        LLM[Google Gemini 2.5 Flash<br/>conversation reasoning]
        TTS[Deepgram Aura-2 Odysseus<br/>text to speech]
        Realtime[Gemini Live<br/>native audio input and output]
    end

    Person <-->|voice| Meet
    Web -->|schedule, join, settings| API
    API <--> DB
    API <-->|Calendar OAuth and sync| Calendar

    Poller -->|claim and report job status<br/>X-Huzl-Worker-Key| API
    API -->|room token and agent dispatch| LK
    Dispatch --- LK
    Poller --> Playwright
    Playwright <-->|join and control meeting| Meet

    Meet -->|participant playback| Playwright
    Playwright --> Speaker --> Bridge
    Bridge -->|microphone RTC track| LK
    LK --> AgentSession
    Agent --- AgentSession
    AgentSession --> VAD
    AgentSession --> STT --> LLM --> TTS
    AgentSession <-->|Gemini Live mode| Realtime
    AgentSession -->|native audio output| LK
    TTS -->|agent RTC audio track| LK
    LK --> Bridge --> Microphone --> Playwright
    Playwright -->|bot microphone audio| Meet

    Agent -->|protected transcript API| API
```

## Where each component runs

| Component | Current location | Responsibility |
| --- | --- | --- |
| Next.js frontend | Huzlr web application | Calendar connection, meeting list, manual join, scheduling, and status UI. |
| FastAPI Scrum Master API | `huzlr-be` application process | Stores meeting state, exposes the worker job API, creates LiveKit room tokens, and requests named-agent dispatch. |
| Scrum Master voice agent | `huzlr-agents` container on the GCP VM; optionally LiveKit Cloud | Connects to the LiveKit room, runs the selected conversation engine, and persists messages through the protected FastAPI agent API. |
| Playwright automation | `huzl-worker` Docker container | Launches authenticated headless Chromium and joins Google Meet as the dedicated bot account. |
| Audio bridge | Same `huzl-worker` container | Publishes Meet playback to LiveKit and writes returned agent audio into Chromium's virtual microphone. |
| LiveKit server | LiveKit Cloud at `wss://huzl-hdzkgm0u.livekit.cloud` | Hosts the per-meeting RTC room and dispatches the named Scrum Master agent. It transports audio; it does not run Gemini, STT, or TTS itself. |
| PostgreSQL | Database configured by `DATABASE_URL` | Persists meetings, policies, encrypted Calendar credentials, transcript segments, summaries, and proposed action items. |
| Google Meet and Calendar | Google-hosted services | Provides the actual meeting and optional event import/synchronization. |

## Voice model stack

The workspace `voice_mode` selects the conversation engine at meeting claim time.
`pipeline` is the existing default described below. `gemini_live` replaces VAD,
STT, the text LLM, and TTS with `google.realtime.RealtimeModel`, defaulting to
`gemini-3.8-live` with the `Puck` voice. It uses Gemini's built-in turn detection,
enables input and output transcription, and keeps the same scoped project tools,
transcript API, and post-meeting output generation. Both engines run within the
existing Scrum Master worker; the Meet bridge and LiveKit transport are shared.
The model and voice can be overridden with `GEMINI_LIVE_MODEL` and
`GEMINI_LIVE_VOICE` in the agent environment.

| Stage | Implementation | Execution location |
| --- | --- | --- |
| Voice activity detection | Silero VAD | Loaded locally inside the Scrum Master agent process. |
| Speech recognition | `deepgram.STT()` | Deepgram managed API; the current code does not pin a specific STT model name. |
| Conversation model | Gemini 2.5 Flash | Google managed API via `google.LLM(model="gemini-2.5-flash")`. |
| Speech synthesis | Deepgram Aura-2, Odysseus voice | Deepgram managed API via `deepgram/aura-2:odysseus`. |
| Post-meeting output generation | Gemini 2.5 Flash | Backend output service, after the meeting when configured. |

## End-to-end voice flow

1. The Docker worker claims a due or manually requested meeting job from FastAPI.
2. FastAPI creates a per-meeting LiveKit token and dispatches the named
   `huzlr-scrum-master` agent.
3. Playwright opens Google Meet using the mounted bot authentication state.
4. Participant audio plays through Chromium into the PulseAudio virtual speaker.
5. The worker captures that playback as 16 kHz mono PCM and publishes it to LiveKit
   as a microphone track.
6. The independently deployed agent applies Silero VAD, sends speech to Deepgram STT, sends the
   transcript to Gemini 2.5 Flash, and sends the response to Deepgram TTS.
7. LiveKit returns the synthesized audio track to the Docker bridge.
8. The bridge writes that audio into the virtual microphone used by Chromium, so
   Google Meet participants hear the response.
9. Final participant and agent conversation items are persisted to PostgreSQL.

## Production separation

FastAPI never starts agent subprocesses. The GCP configuration in `deploy/gcp`
runs the Scrum Master agent and Meet bridge in separate containers on a Compute
Engine VM, while LiveKit Cloud provides rooms and media transport. The agent can
also be deployed to LiveKit Cloud using `huzlr-agents`' deployment configurations.
Run exactly one Meet worker per mounted Google bot profile.
