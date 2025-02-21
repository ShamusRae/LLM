#!/bin/bash

# Kill any existing processes on ports 3001 and 5173
echo "Killing existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Wait a moment for processes to fully terminate
sleep 2

# Start backend
echo "Starting backend server..."
cd "$(dirname "$0")/backend"
npm run dev &

# Wait for backend to initialize
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm run dev &

# Keep script running
wait 