#!/bin/bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/huzlr-be"
FRONTEND_DIR="$ROOT_DIR/huzlr"
AGENTS_DIR="$ROOT_DIR/huzlr-agents"
HUZL_DIR="$ROOT_DIR/huzl"
AGENT_PYTHON="$AGENTS_DIR/.venv/bin/python"
HUZL_COMPOSE=(docker compose --project-directory "$HUZL_DIR" --env-file "$HUZL_DIR/.env" -f "$HUZL_DIR/compose.yaml")
HUZL_STARTED=0
CHILD_PIDS=()
CLEANING_UP=0

require_file() {
    local path="$1"
    local help_message="$2"
    if [ ! -f "$path" ]; then
        echo "Missing required file: $path"
        echo "$help_message"
        exit 1
    fi
}

release_port() {
    local port="$1"
    local listeners

    if ! command -v lsof >/dev/null 2>&1; then
        echo "lsof is unavailable; skipping the port $port preflight check."
        return
    fi

    listeners="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -z "$listeners" ]; then
        echo "Port $port is available."
        return
    fi

    echo "Stopping existing listener(s) on port $port: $listeners"
    kill $listeners 2>/dev/null || true

    local attempt
    for attempt in {1..20}; do
        if ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
            echo "Port $port is available."
            return
        fi
        sleep 0.25
    done

    echo "Port $port is still occupied. Stop that process manually and retry."
    exit 1
}

remember_pid() {
    CHILD_PIDS+=("$1")
}

cleanup() {
    if [ "$CLEANING_UP" -eq 1 ]; then
        return
    fi
    CLEANING_UP=1
    trap - INT TERM EXIT

    echo ""
    echo "Stopping Huzlr services..."

    # Stop the Meet worker while the backend and voice agents are still available.
    # Leave its container and persistent Google profile intact for the next run.
    if [ "$HUZL_STARTED" -eq 1 ]; then
        echo "Stopping Huzl Google Meet worker..."
        "${HUZL_COMPOSE[@]}" stop --timeout 10 worker || echo "Could not stop the Huzl worker; check Docker."
        HUZL_STARTED=0
    fi

    local pid
    if [ "${#CHILD_PIDS[@]}" -gt 0 ]; then
        for pid in "${CHILD_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                kill -TERM "$pid" 2>/dev/null || true
            fi
        done

        for pid in "${CHILD_PIDS[@]}"; do
            wait "$pid" 2>/dev/null || true
        done
    fi

    echo "All Huzlr services stopped."
}

start_agent() {
    local agent_type="$1"
    local display_name="$2"

    echo "Starting $display_name..."
    (
        cd "$AGENTS_DIR" || exit 1
        exec env \
            PYTHONPATH=src \
            HUZLR_AGENT_TYPE="$agent_type" \
            "$AGENT_PYTHON" -m huzlr_agents.runner dev --no-reload
    ) &
    remember_pid "$!"
}

trap cleanup INT TERM EXIT

require_file \
    "$BACKEND_DIR/.venv/bin/python" \
    "Create the backend virtual environment and install huzlr-be/requirements.txt."
require_file \
    "$BACKEND_DIR/.venv/bin/alembic" \
    "Install huzlr-be/requirements.txt into the backend virtual environment."
require_file \
    "$BACKEND_DIR/.env" \
    "Create huzlr-be/.env from huzlr-be/.env.example."

if [ ! -x "$AGENT_PYTHON" ]; then
    if "$BACKEND_DIR/.venv/bin/python" -c \
        'from livekit import agents; from livekit.plugins import deepgram, google, silero' \
        >/dev/null 2>&1; then
        AGENT_PYTHON="$BACKEND_DIR/.venv/bin/python"
        echo "Using the compatible backend virtual environment for local agents."
    else
        require_file \
            "$AGENT_PYTHON" \
            "Run: cd huzlr-agents && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python -m livekit.agents download-files"
    fi
fi

require_file \
    "$AGENTS_DIR/.env" \
    "Create huzlr-agents/.env from huzlr-agents/.env.example."
require_file \
    "$FRONTEND_DIR/package.json" \
    "The huzlr frontend package is missing."
require_file \
    "$HUZL_DIR/.env" \
    "Create huzl/.env from huzl/.env.example and configure the worker key and provisioned Google bot profile."
require_file \
    "$HUZL_DIR/compose.yaml" \
    "The Huzl Docker Compose configuration is missing."

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required for the Huzl Google Meet worker. Install and start Docker Desktop."
    exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose is unavailable. Install the Docker Compose plugin or Docker Desktop."
    exit 1
fi
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running or is unreachable. Start Docker Desktop and retry."
    exit 1
fi
if ! "${HUZL_COMPOSE[@]}" config --quiet; then
    echo "Huzl configuration is invalid. Check huzl/.env and BOT_PROFILE_HOST_DIR."
    exit 1
fi

echo "Applying backend database migrations..."
(
    cd "$BACKEND_DIR" || exit 1
    exec .venv/bin/alembic upgrade head
) || {
    echo "Backend migrations failed. No services were started."
    exit 1
}

echo "Checking local development ports..."
release_port 8001
release_port 3001

echo "Starting Huzlr Backend on http://localhost:8001..."
(
    cd "$BACKEND_DIR/app" || exit 1
    exec ../.venv/bin/python -m uvicorn main:app \
        --reload --host 0.0.0.0 --port 8001
) &
remember_pid "$!"

echo "Starting Huzlr Frontend on http://localhost:3001..."
(
    cd "$FRONTEND_DIR" || exit 1
    exec npm run dev
) &
remember_pid "$!"

start_agent "brainstorm" "Brainstorm agent"
start_agent "founder" "Ask Nirmal agent"
start_agent "scrum_master" "Scrum Master agent"

echo "Building and starting Huzl Google Meet worker..."
# Mark it before starting so a partially failed Compose startup is cleaned up too.
HUZL_STARTED=1
if ! "${HUZL_COMPOSE[@]}" up --build -d worker; then
    echo "Huzl worker startup failed. Stopping the other Huzlr services."
    exit 1
fi
"${HUZL_COMPOSE[@]}" logs --follow --tail=20 worker &
remember_pid "$!"

echo ""
echo "All services started. Press Ctrl+C to stop."
echo "Process IDs: ${CHILD_PIDS[*]}"

wait
