#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 LLM Chat Application Status${NC}"
echo ""

# Show PM2 status
echo -e "${YELLOW}🔧 PM2 Process Status:${NC}"
pm2 status
echo ""

# Show current port assignments if .env exists
if [ -f ".env" ]; then
  echo -e "${YELLOW}🌐 Current Port Assignments:${NC}"
  source .env
  
  # Function to check if a port is responding
  check_port() {
    local port=$1
    local service=$2
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
      echo -e "   $service: ${GREEN}http://localhost:$port ✅${NC}"
    else
      echo -e "   $service: ${RED}http://localhost:$port ❌${NC}"
    fi
  }
  
  echo -e "   Frontend: ${GREEN}http://localhost:${FRONTEND_PORT:-5173}${NC}"
  check_port "${BACKEND_PORT:-3001}" "Backend API"
  check_port "${WRAPPER_PORT:-3002}" "Avatar Wrapper"
  
else
  echo -e "${RED}⚠️  No .env file found. Run ./start.sh to initialize.${NC}"
fi

echo ""
echo -e "${BLUE}💡 Available commands:${NC}"
echo -e "   ${GREEN}./start.sh${NC}  - Start all services with dynamic port discovery"
echo -e "   ${GREEN}./stop.sh${NC}   - Stop all services"
echo -e "   ${GREEN}./logs.sh${NC}   - View real-time logs"
echo -e "   ${GREEN}./status.sh${NC} - Show this status information" 