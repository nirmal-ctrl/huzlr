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
    # Check if venv exists
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    else
        echo "Error: Backend virtual environment not found in standmate-be/.venv"
        exit 1
    fi
    cd app || { echo "Directory standmate-be/app not found"; exit 1; }
    uvicorn main:app --reload --port 8001
) &

echo "Starting Standmate Frontend..."
(
    cd standmate || { echo "Directory standmate not found"; exit 1; }
    npm run dev
) &

echo "Services started. Press Ctrl+C to stop."
wait
