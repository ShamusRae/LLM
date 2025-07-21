#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 LLM Chat Application Logs${NC}"

# Show current port assignments if .env exists
if [ -f ".env" ]; then
  echo -e "${YELLOW}🌐 Current port assignments:${NC}"
  source .env
  echo -e "   Frontend: ${GREEN}http://localhost:${FRONTEND_PORT:-5173}${NC}"
  echo -e "   Backend API: ${GREEN}http://localhost:${BACKEND_PORT:-3001}${NC}"
  echo -e "   Avatar Wrapper: ${GREEN}http://localhost:${WRAPPER_PORT:-3002}${NC}"
  echo ""
fi

echo -e "${BLUE}📝 Tailing logs for all services...${NC}"
echo -e "${YELLOW}Press Ctrl+C to exit logs${NC}"
echo ""

pm2 logs 