#!/bin/bash

# Kill any existing processes on ports 3001 and 5173
echo "Killing existing processes..."
pkill -f "node|vite"

# Wait a moment for processes to fully terminate
sleep 2

# Start Ollama if not already running
echo "Starting Ollama..."
if ! pgrep -x "ollama" > /dev/null; then
    ollama serve &
    echo "Waiting for Ollama to initialize..."
    sleep 2
else
    echo "Ollama is already running"
fi

# Start backend server if package.json exists
echo "Starting backend server..."
cd "$(dirname "$0")/backend"
if [ -f "package.json" ]; then
  npm run dev &
else
  echo "package.json not found in backend directory!"
fi

# Wait for backend to initialize
sleep 2

# Start frontend in development mode if package.json exists
echo "Starting frontend in development mode..."
cd ../frontend
if [ -f "package.json" ]; then
  npm run dev &
else
  echo "package.json not found in frontend directory!"
fi

# Keep script running
wait 