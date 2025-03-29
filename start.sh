#!/bin/bash

# Start services script with dynamic port management
# This script starts all required services with appropriate port ranges

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Function to check if a port is available
is_port_available() {
  local port=$1
  if command -v nc >/dev/null 2>&1; then
    nc -z localhost $port >/dev/null 2>&1
    if [ $? -eq 0 ]; then
      return 1 # Port is in use
    else
      return 0 # Port is available
    fi
  elif command -v lsof >/dev/null 2>&1; then
    lsof -i :$port >/dev/null 2>&1
    if [ $? -eq 0 ]; then
      return 1 # Port is in use
    else
      return 0 # Port is available
    fi
  else
    # If we can't check, assume it's available
    return 0
  fi
}

# Find an available port in a range
find_available_port() {
  local start_port=$1
  local end_port=$2
  local current_port=$start_port
  
  while [ $current_port -le $end_port ]; do
    if is_port_available $current_port; then
      echo $current_port
      return 0
    fi
    ((current_port++))
  done
  
  # If no ports in the range are available, return the start port
  # and let the service's internal port discovery handle it
  echo $start_port
  return 1
}

# Kill existing processes that might conflict
cleanup() {
  print $YELLOW "Cleaning up existing processes..."
  
  # More aggressive process cleanup for specific ports
  for port in 3001 3002 3051 3052 3053 3054 3055 5173 5174 5175; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
      print $YELLOW "Killing process $pid on port $port"
      kill -9 $pid 2>/dev/null || true
    fi
  done
  
  # Kill any node processes related to our application
  print $YELLOW "Killing any existing node processes for this application..."
  pkill -f "node.*LLM Chat" 2>/dev/null || true
  pkill -f "node.*llm-chat" 2>/dev/null || true
  
  # Kill any npm processes related to our application
  print $YELLOW "Killing any existing npm processes for this application..."
  pkill -f "npm.*LLM Chat" 2>/dev/null || true
  pkill -f "npm.*llm-chat" 2>/dev/null || true
  
  print $GREEN "Cleanup complete"
  
  # Larger delay to ensure ports are fully released
  sleep 5
}

# Set up temporary file directories
setup_directories() {
  print $YELLOW "Setting up directories..."
  
  # Project root directory
  ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  
  # Create necessary directories if they don't exist
  mkdir -p "$ROOT_DIR/storage/uploads" "$ROOT_DIR/storage/avatars" "$ROOT_DIR/storage/sessions" "$ROOT_DIR/storage/markdown" "$ROOT_DIR/storage/team-images"
  mkdir -p "$ROOT_DIR/modules/avatar_predictive_wrapper_rd_agent/tmp/configs" "$ROOT_DIR/modules/avatar_predictive_wrapper_rd_agent/tmp/outputs" "$ROOT_DIR/modules/avatar_predictive_wrapper_rd_agent/logs"
  
  print $GREEN "Directories set up successfully"
}

# Run cleanup first
cleanup

# Set up directories
setup_directories

# Project root directory
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$ROOT_DIR"

print $BLUE "Starting services with dynamic port allocation..."

# Start backend service
cd "$ROOT_DIR/backend"
print $YELLOW "Starting backend service..."
# Find an available port for the backend
BACKEND_PORT=$(find_available_port 3001 3050)
print $BLUE "Using port $BACKEND_PORT for backend"
PORT=$BACKEND_PORT node server.js &
BACKEND_PID=$!
print $GREEN "Backend service started with PID: $BACKEND_PID on port $BACKEND_PORT"

# Let backend initialize
sleep 3

# Start avatar wrapper service
cd "$ROOT_DIR/modules/avatar_predictive_wrapper_rd_agent"
print $YELLOW "Starting avatar wrapper service..."
# Find an available port for the avatar wrapper
WRAPPER_PORT=$(find_available_port 3051 3100)
print $BLUE "Using port $WRAPPER_PORT for avatar wrapper"
PORT=$WRAPPER_PORT node server.js &
AVATAR_PID=$!
print $GREEN "Avatar wrapper service started with PID: $AVATAR_PID on port $WRAPPER_PORT"

# Let avatar wrapper initialize
sleep 3

# Start frontend service
cd "$ROOT_DIR/frontend" 
print $YELLOW "Starting frontend service..."
FRONTEND_PORT=$(find_available_port 5173 5200)
print $BLUE "Using port $FRONTEND_PORT for frontend"

# Set Vite environment variable to disable Mirage
export VITE_DISABLE_MIRAGE=true
PORT=$FRONTEND_PORT VITE_API_PORT=$BACKEND_PORT VITE_WRAPPER_PORT=$WRAPPER_PORT npm run dev &
FRONTEND_PID=$!
print $GREEN "Frontend service started with PID: $FRONTEND_PID on port $FRONTEND_PORT"

print $BLUE "---------------------------------"
print $GREEN "All services started successfully!"
print $BLUE "The services will discover each other automatically."
print $BLUE "Access the application at: http://localhost:$FRONTEND_PORT"
print $BLUE "Backend running on: http://localhost:$BACKEND_PORT"
print $BLUE "RD Agent running on: http://localhost:$WRAPPER_PORT"
print $BLUE "---------------------------------"
print $YELLOW "Note: To work with large datasets (800MB+), use the file path approach:"
print $YELLOW "Tell Ada Lovelace: \"Analyze the dataset at /Users/shamusrae/path/to/your_file.csv\""
print $BLUE "---------------------------------"

# Wait for user to press Ctrl+C
wait 