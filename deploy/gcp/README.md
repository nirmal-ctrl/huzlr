# GCP worker deployment

This deployment runs the three self-hosted LiveKit agent servers and the Google
Meet bridge on one Compute Engine VM. FastAPI and the frontend remain on Vercel,
while LiveKit Cloud continues to provide rooms and realtime media transport.

For future deployments, SSH access, logs, health checks, restarts, and VM
operations, see [OPERATIONS.md](./OPERATIONS.md).

## VM layout

The repository is installed at `/opt/huzlr`, with persistent credentials and
debug artifacts outside the checkout:

```text
/opt/huzlr
/opt/huzlr-data/google-bot-profile/auth-state.json
/opt/huzlr-data/debug
```

The production environment files must set:

```dotenv
# huzlr-agents/.env
HUZLR_API_URL=https://your-backend.example.com
HUZLR_AGENT_SERVICE_KEY=match-vercel-agent-service-key

# huzl/.env
HUZLR_BACKEND_URL=https://your-backend.example.com
HUZL_WORKER_KEY=match-vercel-worker-key
BOT_PROFILE_HOST_DIR=/opt/huzlr-data/google-bot-profile
HUZL_DEBUG_HOST_DIR=/opt/huzlr-data/debug
```

Provider and LiveKit credentials remain in `huzlr-agents/.env`. LiveKit project
credentials are shared by all three workers; `HUZLR_AGENT_TYPE` is assigned per
service by Compose.

## Start and operate

Run from `/opt/huzlr`:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml up --build -d
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml ps
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml logs -f
```

To deploy a later source update:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml up --build -d
```

Jira ingestion and context projection are separate persistent services in the opt-in `context` profile. Configure `huzlr-be/.env`, apply the database migrations first, and follow the [Jira connector runbook](../../huzlr-be/docs/jira-context-connector.md) before starting `jira-worker` and `context-worker`.
