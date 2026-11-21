# Managed AI Worker sandboxes

Huzlr runs the model and permission checks in its trusted queue consumer. A worker
with `sandbox_mode=docker` gets a disposable container for its workspace tools.
Task-only workers can keep `sandbox_mode=off`. There is no customer enrollment API.

On the **Huzlr-managed worker host**, build the image and apply migrations:

```sh
docker build -t huzlr-sandbox:local huzlr-be/sandbox
cd huzlr-be
.venv/bin/alembic upgrade head
```

Set these in the backend and consumer environment:

```dotenv
AI_WORKER_SANDBOX_ENABLED=true
AI_WORKER_SANDBOX_IMAGE=huzlr-sandbox:local
AI_WORKER_SANDBOX_HOST_ID=worker-host-1
AI_WORKER_SANDBOX_MEMORY_MB=512
AI_WORKER_SANDBOX_CPUS=1.0
```

For production, build a reviewed image and set its immutable digest. Images are
prepared by Huzlr administrators; workers cannot select images, bind mounts, Docker
flags, or credentials. Image pulls never happen during an agent run.

From the repo root, start the managed consumer:

```sh
docker compose -f deploy/gcp/compose.yaml --profile ai-workers up -d --build ai-worker
```

The consumer is a trusted Docker controller and receives the host Docker socket.
Use a dedicated Huzlr worker host/daemon, isolated from the web server and other
production workloads. Sandbox containers never receive the socket, host mounts,
model keys, database credentials, or published ports. Containers share their host
kernel; this backend does not provision a VM. Docker's default seccomp policy,
non-root UID, dropped capabilities, no-new-privileges, read-only root, disabled
network, PID/CPU/memory limits, and bounded tmpfs workspaces constrain execution.

Create a worker, enable **Deployment & workspace → Isolated Docker workspace**,
then enable the desired files/command tools under **Tools & permissions**. Deploy
the worker and queue a task. Writes and shell commands always request human
approval; read/list operations need only their explicit tool permission.

The model loop has an active runtime limit (30–1800 seconds), a step limit, and an
estimated token cost limit. Approval waiting time is excluded from active runtime.
Commands have a 30-second timeout and bounded output. Shell background children
in the command's process group are killed when it returns.

Workspace state (up to 100 regular files and 1 MiB total, binary supported) is
snapshotted into the execution record after tools, before approval pauses, and on
successful completion. Containers are removed on every exit. Approval resumes in
a fresh container restored from that snapshot. Saved files can be downloaded from
the execution dialog through the same project authorization as the execution.
There is no repository cloning, internet access, package installation, persistent
agent memory, or arbitrary host filesystem access in this first backend.

Snapshot failures fail the run and retain the last successful snapshot; oversized
workspaces are not silently truncated. Interrupted actions are marked before
execution and never automatically replayed. Expired runs with an active sandbox
fail with a restart instruction. A host-scoped reconciler removes orphan containers
every 30 seconds between tasks; each container also has a fixed lifetime. After a
consumer or daemon crash, restart the consumer to reconcile remaining containers.
Use a stable, unique host ID shared by consumer replicas on that Docker daemon.

To run real container tests:

```sh
cd huzlr-be
HUZLR_TEST_DOCKER=1 .venv/bin/python -m unittest discover -s tests -p 'test_ai_workers*.py' -v
```

Also set `HUZLR_TEST_POSTGRES=1` to verify the complete runtime against PostgreSQL
and Docker together. That test uses temporary tables inside a rolled-back outer
transaction and does not create project or execution records in application tables.
