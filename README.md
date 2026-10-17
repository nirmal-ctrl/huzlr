# huzlr
Project Manager Copilot

## Modules

- `huzlr`: Next.js frontend.
- `huzlr-be`: Vercel-compatible FastAPI control plane and application API.
- `huzlr-agents`: Persistent Brainstorm, Ask Nirmal, and Scrum Master LiveKit workers.
- `huzl`: Google Meet automation and audio bridge.

Voice agents are deployed independently from FastAPI. See `huzlr-agents/README.md`
for local and LiveKit Cloud commands.

For local development, run `./start-all.sh` to apply backend migrations and start
the frontend, backend, three LiveKit agents, and the Huzl Google Meet worker.
Docker with Compose must be running, and `huzl/.env` must have a matching worker
key and a provisioned bot profile as described in `huzl/README.md`. The script
builds the Meet worker container, follows its logs, and stops it along with the
local application processes when you press Ctrl+C.
