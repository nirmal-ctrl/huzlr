# Active Context

## Current Work Focus
- **huzlr Google Meet Bridge Optimization**: Successfully optimized the bridge for production-ready performance, focusing on audio routing and bot stealth.
- **Audio Pipeline Integration**: Ensuring seamless communication between the browser (PulseAudio) and the AI agent (ALSA/PortAudio) via virtual devices.
- **Stealth Browser Automation**: Maintaining access to Google Meet by bypassing entry gates and bot detection.
- **High-Quality Audio Injection**: Providing smooth MP3 playback into meetings using FFmpeg-powered streaming and jitter-robust buffering.
- Implementing a generic and reusable view system for all entities (Projects, Tasks, etc.).

## Recent Changes
- **Fixed Audio Pipeline**: Configured `/etc/asound.conf` to map PulseAudio virtual sinks (`huzlr_Virtual_Speaker`, `huzlr_Virtual_Microphone`) to ALSA devices.
- **Bypassed Google Gates**: Implemented custom User-Agents, Stealth scripts, and transitioned to Personal Gmail Meet links to avoid "You can't join this call" blocks.
- **Optimized MP3 Playback**: Integrated FFmpeg for on-the-fly 16kHz PCM decoding with 100ms pre-load buffering in `audio_injection.py`.
- Consolidated Workspace and Team switching UI into a single integrated component.

## Next Steps
- **Production Testing**: Conduct full-cycle tests of the optimized bridge in various meeting scenarios.
- **Gemini Live Integration**: Connect the optimized audio capture directly to the Gemini Multimodal Live API for real-time analysis.
- Create a `ViewContainer` component to fetch data and property definitions for a given entity type.
- Create a `ViewSwitcher` component to render the correct view based on the selected `viewType` and `groupBy` property.
- Refactor the `KanbanBoard` and `DataTable` components to be more generic and configurable.
- Refactor the entity pages (`app/projects/page.tsx`, `app/boards/page.tsx`) to use the new `ViewContainer` component.
- Implement Team Management UI (Settings, Members, Invites) to leverage existing BE/DB structure.
- Deprecate/Remove `TeamSwitcher.tsx` if no longer needed as a standalone component.

## Active Decisions & Considerations
- Maintaining a strict boundary between frontend (`standmate`) and backend (`standmate-be`) services.
- Ensuring the Next.js app properly connects to FastAPI endpoints.
- Storing AI conversational state (e.g. Gemini) efficiently.

## Learnings & Insights
- Standmate connects multiple data streams (Jira, brainstorms, boards) into a unified view.
- Always use the reactive text editor (`TiptapEditor` / `InlineEditor`) for input fields that require formatted text or rich content, rather than basic inputs or textareas.
- **Team Architecture**: The system uses a hierarchical Workspace -> Team -> User structure. Every workspace must have a default 'General' team created on initialization.
