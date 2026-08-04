# huzl Context

## Purpose
`huzl` is a Google Meet bridge and voice-agent prototype for Huzlr. It is intended to join a Google Meet as a bot, route meeting audio through virtual devices, capture participant audio, and inject synthesized or test audio back into the call.

The folder is separate from the main Next.js app (`huzlr`) and FastAPI backend (`huzlr-be`). It is closer to an integration/agent runtime experiment than a production service.

## High-Level Architecture
- **Browser control:** Playwright launches Chromium, opens a Google Meet URL, fills the bot name, toggles mic/camera, and attempts to join.
- **Virtual audio routing:** PulseAudio null sinks expose a virtual speaker and microphone. Chromium audio output is captured from the speaker path; generated audio is written to the microphone path.
- **Audio capture:** `sounddevice` reads 16 kHz mono PCM chunks from the virtual speaker device.
- **Audio injection:** `sounddevice` writes 16 kHz mono PCM chunks into the virtual microphone device.
- **Agent layer:** LiveKit/Gemini-related files sketch an AI meeting assistant that can listen, reason, speak, and handle interruptions.
- **Project tools:** A small mock project context provides tool-like functions for sprint status, blockers, and task summaries.

## Key Files
- `huzl/Dockerfile`: Builds from Microsoft Playwright Jammy image, installs Python, PulseAudio, ALSA, PortAudio dependencies, installs Python requirements, installs Chromium, and runs `start.sh`.
- `huzl/start.sh`: Starts PulseAudio, creates `huzlr_Speaker` and `huzlr_Mic` null sinks, sets defaults, writes `/etc/asound.conf`, then runs the passed command or a Python shell.
- `huzl/requirements.txt`: Python dependencies for Playwright, audio IO, Gemini, LiveKit agents/plugins, and PyAudio.
- `huzl/test_bridge.py`: End-to-end smoke test. It joins `TEST_MEET_URL`, starts capture, measures incoming audio level, unmutes, and injects either `arabic_ringtone.mp3` decoded through `ffmpeg` or a generated 440 Hz tone.
- `huzl/bridge/browser_manager.py`: Owns Playwright lifecycle and Chromium launch flags for media permissions, fake UI/device streams, autoplay, and headless behavior.
- `huzl/bridge/meet_worker.py`: Drives Google Meet UI: navigate, green-room mic/camera toggles, bot-name entry, join-button click, connected-state detection, unmute/mute, and leave.
- `huzl/bridge/audio_capture.py`: Captures float audio from an input device and converts it to 16-bit PCM bytes in 20 ms chunks.
- `huzl/bridge/audio_injection.py`: Accepts 16-bit PCM chunks and writes them to an output stream in 20 ms blocks, with buffer clearing for interruption handling.
- `huzl/bridge/virtual_devices.py`: Local helper for setting up PulseAudio virtual devices on Linux and documenting BlackHole setup for macOS.
- `huzl/agent/livekit_agent.py`: LiveKit voice assistant worker using Silero VAD, Deepgram STT, Gemini LLM, and ElevenLabs TTS.
- `huzl/agent/gemini_runtime.py`: Thin async wrapper around `google.generativeai`, configured as a concise project-manager meeting agent.
- `huzl/agent/conversation_manager.py`: Simple state machine for `IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, and `INTERRUPTED`.
- `huzl/agent/interruption_manager.py`: Basic RMS-threshold voice activity detector for interruption detection.
- `huzl/tools/project_tools.py`: Mock project-management tool registry with sprint status, blockers, summary, and task creation.
- `huzl/tools/livekit-mcp-bridge.js`: JSON-line bridge that forwards MCP-style requests to `https://docs.livekit.io/mcp/`.
- `huzl/*.html`, `huzl/*.png`: Debug artifacts saved from Google Meet page state after join attempts.
- `huzl/arabic_ringtone.mp3`: Test audio asset used by `test_bridge.py`.

## Runtime Flow
1. Container starts through `start.sh`.
2. PulseAudio is started and virtual sink devices are created.
3. `test_bridge.py` or another app command creates `BrowserManager`, `MeetWorker`, `AudioCapturePipeline`, and `AudioInjectionPipeline`.
4. Playwright opens Google Meet and `MeetWorker.join()` attempts to enter the meeting.
5. Capture reads speaker monitor audio as 16 kHz mono PCM chunks.
6. Injection writes generated/test PCM chunks into the virtual mic after Meet is unmuted.
7. Agent modules can be wired in later to replace test-tone injection with STT/LLM/TTS behavior.

## Required Environment
- `TEST_MEET_URL` for `test_bridge.py`; defaults to placeholder `https://meet.google.com/abc-defg-hij`.
- `GEMINI_API_KEY` for `agent/gemini_runtime.py`.
- LiveKit, Deepgram, and ElevenLabs credentials are implied by `agent/livekit_agent.py` and its plugins, but not documented in this folder.
- `HEADLESS` can override browser headless mode. Default is `true` in Docker and `false` outside Docker.

## Important Operational Notes
- `start.sh` writes `/etc/asound.conf`, so the Docker container needs permission to modify that path.
- `test_bridge.py` calls `ffmpeg` when the MP3 exists, but `ffmpeg` is not installed in the Dockerfile. Without it, the script falls back to a synthesized tone.
- Google Meet UI selectors are brittle by nature. `meet_worker.py` saves screenshots and HTML dumps to diagnose selector failures.
- Debug artifact paths in `meet_worker.py` are relative to the current working directory, not necessarily the `huzl` folder.
- `audio_injection.py` logs partial chunks but does not keep the unused remainder, so callers should prefer exact 20 ms chunks at 16 kHz mono PCM.
- The virtual device naming alternates between PulseAudio sink names (`huzlr_Speaker`, `huzlr_Mic`) and display/device names (`huzlr_Virtual_Speaker`, `huzlr_Virtual_Microphone`).

## Current Completion State
- Completed/scaffolded:
  - Dockerized Playwright/PulseAudio environment.
  - Browser automation for Meet join flow.
  - Virtual device creation for Linux/PulseAudio.
  - PCM audio capture and injection primitives.
  - Integration smoke test with signal-level logging and test audio injection.
  - LiveKit voice-agent worker skeleton.
  - Gemini text-generation wrapper.
  - Conversation and interruption state helpers.
  - Mock project-management tools.
- Not yet production-ready:
  - No stable orchestration tying Meet capture to STT, Gemini, TTS, and injection.
  - No credential/env documentation for LiveKit, Deepgram, ElevenLabs, or Google beyond `GEMINI_API_KEY`.
  - No automated tests for device discovery, Meet selectors, audio buffering, or agent state transitions.
  - `ffmpeg` dependency mismatch with Dockerfile.
  - Debug artifacts and `__pycache__` are present in the tracked folder and should likely be ignored/cleaned.
  - Meet connection status only checks for a visible leave-call button.

## How To Run Locally/Container
- Build from `huzl`:
  - `docker build -t huzl-bridge .`
- Run a shell in the prepared audio environment:
  - `docker run --rm -it huzl-bridge`
- Run bridge smoke test with a real Meet URL:
  - `docker run --rm -e TEST_MEET_URL="https://meet.google.com/..." huzl-bridge python3 test_bridge.py`

## Mental Model For Future Work
Treat `huzl` as the lower-level meeting transport layer:
- `bridge/*` should stay focused on browser/session control and raw audio IO.
- `agent/*` should own conversation behavior, AI model calls, interruption handling, and voice pipeline orchestration.
- `tools/*` should expose project-management actions/context to the agent and eventually call real Huzlr backend APIs instead of mock data.
