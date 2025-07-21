#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping LLM Chat Application...${NC}"

pm2 stop all

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ All services stopped successfully!${NC}"
else
  echo -e "${RED}❌ Error stopping services${NC}"
  exit 1
fi 