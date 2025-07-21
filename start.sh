#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting LLM Chat Application with Dynamic Port Discovery${NC}"

# Function to check if a port is available
is_port_available() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    return 1 # Port is in use
  else
    return 0 # Port is available
  fi
}

# Function to find an available port starting from a given port
find_available_port() {
  local start_port=$1
  local port=$start_port
  local max_attempts=100
  local attempts=0
  
  while [ $attempts -lt $max_attempts ]; do
    if is_port_available $port; then
      echo $port
      return 0
    fi
    port=$((port + 1))
    attempts=$((attempts + 1))
  done
  
  echo "ERROR: Could not find available port starting from $start_port" >&2
  return 1
}

# Discover available ports
echo -e "${YELLOW}🔍 Discovering available ports...${NC}"

BACKEND_PORT=$(find_available_port 3001)
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to find available port for backend${NC}"
  exit 1
fi

WRAPPER_PORT=$(find_available_port $((BACKEND_PORT + 1)))
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to find available port for avatar wrapper${NC}"
  exit 1
fi

FRONTEND_PORT=$(find_available_port 5173)
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to find available port for frontend${NC}"
  exit 1
fi

# Export environment variables
export BACKEND_PORT=$BACKEND_PORT
export WRAPPER_PORT=$WRAPPER_PORT
export FRONTEND_PORT=$FRONTEND_PORT

echo -e "${GREEN}✅ Port assignments:${NC}"
echo -e "   Backend: ${GREEN}$BACKEND_PORT${NC}"
echo -e "   Avatar Wrapper: ${GREEN}$WRAPPER_PORT${NC}"
echo -e "   Frontend: ${GREEN}$FRONTEND_PORT${NC}"

# Create .env file for persistence
echo "BACKEND_PORT=$BACKEND_PORT" > .env
echo "WRAPPER_PORT=$WRAPPER_PORT" >> .env
echo "FRONTEND_PORT=$FRONTEND_PORT" >> .env

echo -e "${BLUE}📝 Environment variables saved to .env file${NC}"

# Start services with pm2
echo -e "${BLUE}🎬 Starting all services with pm2...${NC}"
pm2 start ecosystem.config.js

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ All services started successfully!${NC}"
  echo ""
  echo -e "${BLUE}🌐 Access your application at:${NC}"
  echo -e "   Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
  echo -e "   Backend API: ${GREEN}http://localhost:$BACKEND_PORT${NC}"
  echo -e "   Avatar Wrapper: ${GREEN}http://localhost:$WRAPPER_PORT${NC}"
  echo ""
  echo -e "${YELLOW}📊 Use 'pm2 logs' to view logs and 'pm2 stop all' to stop services.${NC}"
else
  echo -e "${RED}❌ Failed to start services${NC}"
  exit 1
fi 