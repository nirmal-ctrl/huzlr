# GCP worker operations runbook

This runbook covers routine deployment and monitoring for the Huzlr worker VM.
The frontend and FastAPI backend remain on Vercel. The VM runs:

- `brainstorm`: LiveKit worker named `huzlr-brainstorm`
- `founder`: LiveKit worker named `huzlr-founder` (Ask Nirmal)
- `scrum-master`: LiveKit worker named `huzlr-scrum-master`
- `meet-bridge`: Huzl Google Meet bridge

## Production coordinates

```text
GCP project: huzlr-478516
VM:          huzlr-workers-prod
Zone:        us-central1-a
VM code:     /opt/huzlr
State:       /opt/huzlr-data
Backend:     https://standmate-be-2eum.vercel.app
```

The VM does not expose SSH directly to the internet. The commands below use
Google Cloud IAP, so run them from a computer where `gcloud auth login` has
already been completed.

## Log in to the VM

Run this on your Mac:

```bash
gcloud compute ssh huzlr-workers-prod \
  --project=huzlr-478516 \
  --zone=us-central1-a \
  --tunnel-through-iap
```

After connecting:

```bash
cd /opt/huzlr
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml ps
```

Type `exit` to leave the VM.

## Monitor logs

All commands in this section run inside the VM from `/opt/huzlr`.

Follow all services live:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs --tail=200 --timestamps -f
```

Follow one service:

```bash
# Brainstorm
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs --tail=200 --timestamps -f brainstorm

# Ask Nirmal / founder
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs --tail=200 --timestamps -f founder

# Scrum Master
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs --tail=200 --timestamps -f scrum-master

# Huzl Google Meet bridge
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs --tail=200 --timestamps -f meet-bridge
```

Press `Ctrl+C` to stop following logs. This stops only the log viewer; it does
not stop the containers.

View a time window without following:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs --since=30m --timestamps
```

Confirm that the three LiveKit workers registered:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs brainstorm founder scrum-master \
  | grep "registered worker"
```

Search recent logs for failures:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs --since=30m 2>&1 \
  | grep -Ei "error|exception|unauthorized|forbidden|polling failed"
```

No output from the error search is a good result. The Huzl bridge logs
`Worker polling failed` every five seconds if it cannot authenticate with or
reach FastAPI.

## Check health and resource usage

```bash
# Container state and health
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml ps

# Live CPU and memory; press Ctrl+C to exit
docker stats

# One-time CPU and memory snapshot
docker stats --no-stream

# Host memory and swap
free -h

# Disk usage
df -h /

# Interactive host process monitor; press q to exit
htop
```

The three agent containers should show `healthy`. The Meet bridge currently has
no HTTP health check, so verify that it is `Up`, has zero restarts, and has no
polling errors.

Check exact restart counts:

```bash
docker inspect --format \
  '{{.Name}} status={{.State.Status}} restarts={{.RestartCount}}{{if .State.Health}} health={{.State.Health.Status}}{{end}}' \
  huzlr-workers-brainstorm-1 \
  huzlr-workers-founder-1 \
  huzlr-workers-scrum-master-1 \
  huzlr-workers-meet-bridge-1
```

## Deploy future code changes

Run the packaging and upload commands from the repository root on your Mac:

```bash
cd /Users/gnirmalkumar/Documents/work/huzlr-dev

COPYFILE_DISABLE=1 tar -czf /tmp/huzlr-workers-release.tgz \
  --exclude='huzlr-agents/.env' \
  --exclude='huzlr-agents/.venv' \
  --exclude='huzlr-agents/.pytest_cache' \
  --exclude='huzl/.env' \
  --exclude='huzl/.venv' \
  --exclude='huzl/.bot-profile' \
  --exclude='huzl/debug' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  huzlr-agents huzl deploy/gcp

gcloud compute scp /tmp/huzlr-workers-release.tgz \
  huzlr-workers-prod:~/huzlr-workers-release.tgz \
  --project=huzlr-478516 \
  --zone=us-central1-a \
  --tunnel-through-iap
```

The production `.env` files and Google authentication state are deliberately
excluded. A normal source deployment must not overwrite those files.

Log in to the VM and unpack the release:

```bash
gcloud compute ssh huzlr-workers-prod \
  --project=huzlr-478516 \
  --zone=us-central1-a \
  --tunnel-through-iap

tar -xzf ~/huzlr-workers-release.tgz -C /opt/huzlr
cd /opt/huzlr
```

If agent code or agent dependencies changed, rebuild all three agent services
because they share the same source module:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  up -d --build brainstorm founder scrum-master
```

If only Huzl changed:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  up -d --build meet-bridge
```

If both modules or the Compose file changed:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  up -d --build
```

After the deployment, remove the uploaded archive and verify the services:

```bash
rm -f ~/huzlr-workers-release.tgz

docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml ps
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  logs --since=5m --timestamps
```

Back on the Mac, remove the local temporary archive:

```bash
rm -f /tmp/huzlr-workers-release.tgz
```

This release method overlays modified files. If a change deletes or renames a
source file, remove that exact stale file from `/opt/huzlr` before rebuilding.
Do not delete `/opt/huzlr-data`; it contains persistent Google authentication
and debug data.

## Restart services without rebuilding

Run these inside the VM:

```bash
# Restart one service
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml restart brainstorm
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml restart founder
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml restart scrum-master
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml restart meet-bridge

# Restart everything
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml restart
```

The Compose policy is `restart: unless-stopped`, so Docker automatically starts
the services after a VM reboot.

## Update production environment variables

Production secrets are stored only on the VM in:

```text
/opt/huzlr/huzlr-agents/.env
/opt/huzlr/huzl/.env
```

Edit the appropriate file inside the VM:

```bash
nano /opt/huzlr/huzlr-agents/.env
nano /opt/huzlr/huzl/.env
```

Keep permissions restricted and recreate the affected containers so they load
the new values:

```bash
chmod 600 /opt/huzlr/huzlr-agents/.env /opt/huzlr/huzl/.env

cd /opt/huzlr
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml \
  up -d --force-recreate brainstorm founder scrum-master meet-bridge
```

Do not print secrets in logs or commit either `.env` file to Git.

## Stop or start the VM

Run these from your Mac. Stopping the VM saves compute cost, but all voice
agents and the Meet bridge will be unavailable while it is stopped.

```bash
# Stop
gcloud compute instances stop huzlr-workers-prod \
  --project=huzlr-478516 \
  --zone=us-central1-a

# Start
gcloud compute instances start huzlr-workers-prod \
  --project=huzlr-478516 \
  --zone=us-central1-a

# Check VM state
gcloud compute instances describe huzlr-workers-prod \
  --project=huzlr-478516 \
  --zone=us-central1-a \
  --format='get(status)'
```

The VM uses an ephemeral external IP. Its address may change after a stop/start,
but the workers only make outbound connections, and IAP SSH uses the VM name,
so no deployment setting needs the IP address.

## Quick post-deployment checklist

1. `openapi.json` returns HTTP 200 from the Vercel backend.
2. All four containers are `Up` and agent health checks are `healthy`.
3. Each agent log contains `registered worker` with its expected agent name.
4. Huzl logs contain no `Worker polling failed` messages.
5. Restart counts remain zero.
6. `docker stats` and `free -h` show adequate CPU and available memory.
7. Test Brainstorm, Ask Nirmal, and one Google Meet session end to end.
