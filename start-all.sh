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

echo "Starting Huzlr Backend on port 8001 (LiveKit Agent will start automatically inside)..."
(
    cd huzlr-be || { echo "Directory huzlr-be not found"; exit 1; }
    cd app || { echo "Directory huzlr-be/app not found"; exit 1; }
    ../.venv/bin/python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
) &

echo "Starting Huzlr Frontend..."
(
    cd huzlr || { echo "Directory huzlr not found"; exit 1; }
    npm run dev
) &

echo "Services started. Press Ctrl+C to stop."
wait
