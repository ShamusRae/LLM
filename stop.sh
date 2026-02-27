#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping LLM Chat Application...${NC}"

# Stop only this project's processes to avoid impacting unrelated PM2 apps
pm2 stop backend frontend avatar-wrapper >/dev/null 2>&1 || true
pm2 delete backend frontend avatar-wrapper >/dev/null 2>&1 || true

echo -e "${GREEN}✅ LLM Chat services stopped (backend, frontend, avatar-wrapper).${NC}"