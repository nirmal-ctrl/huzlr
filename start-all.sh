#!/bin/bash

# Function to handle cleanup
cleanup() {
    echo ""
    echo "Stopping all services..."
    # Kill all child processes of this script
    pkill -P $$
    exit 0
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

# Kill existing processes on ports
echo "Checking for existing processes on ports 8001 and 3001..."

kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ -n "$pid" ]; then
        echo "Killing process $pid on port $port"
        kill -9 $pid
    else
        echo "No process found on port $port"
    fi
}

kill_port 8001
kill_port 3001

echo "Starting Standmate Backend on port 8001..."
(
    cd standmate-be || { echo "Directory standmate-be not found"; exit 1; }
    cd app || { echo "Directory standmate-be/app not found"; exit 1; }
    ../.venv/bin/python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
) &

echo "Starting LiveKit Voice Agent..."
(
    cd standmate-be || { echo "Directory standmate-be not found"; exit 1; }
    if [ -f "app/services/livekit_agent.py" ]; then
        ./.venv/bin/python3 app/services/livekit_agent.py dev
    else
        echo "⚠️  LiveKit voice agent script not found yet at standmate-be/app/services/livekit_agent.py. Skipping agent runner (will start once created)."
    fi
) &

echo "Starting Standmate Frontend..."
(
    cd standmate || { echo "Directory standmate not found"; exit 1; }
    npm run dev
) &

echo "Services started. Press Ctrl+C to stop."
wait
