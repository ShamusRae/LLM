#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting LLM Chat Application...${NC}"

# Stop only this project's services, then start fresh.
./stop.sh || true
sleep 1
./start.sh

# Read discovered ports if available
if [ -f ".env" ]; then
  source .env
fi

BACKEND_PORT="${BACKEND_PORT:-3001}"
HEALTH_URL="http://localhost:${BACKEND_PORT}/api/health"
BRIDGE_URL="http://localhost:${BACKEND_PORT}/api/mcp/bridge/diagnostics"

check_endpoint() {
  local url="$1"
  local label="$2"
  local attempts=10
  local delay=2

  for ((i=1; i<=attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo -e "${GREEN}✅ ${label} is healthy: ${url}${NC}"
      return 0
    fi
    sleep "$delay"
  done

  echo -e "${RED}❌ ${label} did not become healthy: ${url}${NC}"
  return 1
}

echo -e "${YELLOW}🔎 Running post-restart health checks...${NC}"
check_endpoint "$HEALTH_URL" "Backend API"
check_endpoint "$BRIDGE_URL" "MCP Bridge"

echo -e "${GREEN}🎉 Restart sequence complete.${NC}"
