# Tech Context

## Technologies Used

### Frontend (`huzlr`)
- **Framework:** Next.js (App Router)
- **Language:** TypeScript (`.ts`, `.tsx`)
- **Styling:** Tailwind CSS (`tailwind.config.mjs`, `globals.css`)
- **State Management:** Redux Toolkit
- **Package Manager:** pnpm
- **AI Integration:** Google Gemini SDK integrations (`hooks/use-gemini-live.ts`, `lib/gemini-handlers.ts`)

### Backend (`huzlr-be`)
- **Framework:** FastAPI
- **Language:** Python
- **Database ORM:** SQLAlchemy (managed via Alembic)
- **Containerization:** Docker (`docker-compose.yml`)
- **Dependency Management:** `requirements.txt` / Python venv

### huzlr Bridge
- **Browser Automation:** Playwright with Stealth plugins.
- **Audio Stack:** 
    - **PulseAudio:** Manages virtual sinks (`huzlr_Virtual_Speaker`, `huzlr_Virtual_Microphone`).
    - **ALSA:** Custom `/etc/asound.conf` mapping for Python/PortAudio visibility.
    - **FFmpeg:** Real-time 16kHz PCM decoding for audio injection.
- **Python Libraries:** `sounddevice`, `numpy`, `playwright`.

## Development Setup
- Use `pnpm install` in the `huzlr` directory.
- Use `pip install -r requirements.txt` in the `huzlr-be` directory.
- `start-all.sh` root script used for launching full stack locally.
- Backend db uses Alembic for migrations: `alembic upgrade head`.

## Technical Constraints & Dependencies
- Both front and back systems must be synced for data model accuracy.
- Requires necessary API keys for Gemini, Atlassian/Jira integration.
- Relies on Next.js 14+ specific features (App Router).
