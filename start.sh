#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting LLM Chat Application with Dynamic Port Discovery${NC}"

# Function to check if Ollama is running
check_ollama() {
  echo -e "${YELLOW}🤖 Checking Ollama status...${NC}"
  
  if command -v ollama >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama installed${NC}"
    
    # Check if Ollama service is running
    if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
      echo -e "${GREEN}✅ Ollama service running${NC}"
      
      # Check available models
      MODELS=$(curl -s http://localhost:11434/api/tags 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | head -5)
      if [ -n "$MODELS" ]; then
        echo -e "${GREEN}✅ Available Ollama models:${NC}"
        echo "$MODELS" | while read -r model; do
          echo -e "   📦 $model"
        done
      else
        echo -e "${YELLOW}⚠️ No Ollama models found${NC}"
        suggest_ollama_models
      fi
    else
      echo -e "${YELLOW}⚠️ Ollama not running - attempting to start...${NC}"
      start_ollama
    fi
  else
    echo -e "${YELLOW}⚠️ Ollama not installed${NC}"
    suggest_ollama_install
  fi
}

# Function to start Ollama service
start_ollama() {
  if command -v ollama >/dev/null 2>&1; then
    echo -e "${BLUE}🚀 Starting Ollama service in background...${NC}"
    nohup ollama serve >/dev/null 2>&1 &
    
    # Wait a moment for startup
    sleep 2
    
    # Check if it started successfully
    if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
      echo -e "${GREEN}✅ Ollama service started successfully${NC}"
      return 0
    else
      echo -e "${RED}❌ Failed to start Ollama service${NC}"
      return 1
    fi
  else
    return 1
  fi
}

# Function to suggest Ollama installation
suggest_ollama_install() {
  echo -e "${BLUE}💡 To enable offline AI capabilities:${NC}"
  echo -e "   1. Install Ollama: ${YELLOW}https://ollama.com${NC}"
  echo -e "   2. Or run: ${YELLOW}curl -fsSL https://ollama.com/install.sh | sh${NC}"
  echo -e "   3. Then install models: ${YELLOW}ollama pull qwq${NC}"
  echo -e ""
}

# Function to suggest popular models
suggest_ollama_models() {
  echo -e "${BLUE}💡 Recommended models to install:${NC}"
  echo -e "   ${YELLOW}ollama pull qwq${NC}           # 32B reasoning model (best overall)"
  echo -e "   ${YELLOW}ollama pull llama3.2${NC}      # 3B fast model" 
  echo -e "   ${YELLOW}ollama pull deepseek-coder${NC} # Coding specialist"
  echo -e "   ${YELLOW}ollama pull phi3:mini${NC}      # Ultra-fast 3.8B model"
  echo -e ""
  
  # Offer to install a basic model automatically
  if [ -t 0 ]; then  # Only if running interactively
    read -p "$(echo -e "${BLUE}Would you like to install the essential 'llama3.2' model now? [y/N]: ${NC}")" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      install_essential_model
    else
      echo -e "${YELLOW}You can install models later with: ollama pull llama3.2${NC}"
    fi
  fi
}

# Function to install an essential model
install_essential_model() {
  echo -e "${BLUE}🔄 Installing llama3.2 model (this may take a few minutes)...${NC}"
  
  if ollama pull llama3.2; then
    echo -e "${GREEN}✅ Successfully installed llama3.2 model${NC}"
    echo -e "${GREEN}🎉 Your app now has offline AI capabilities!${NC}"
    
    # Update .env with the installed model
    if grep -q "^OLLAMA_MODEL=" .env; then
      sed -i.bak 's/^OLLAMA_MODEL=.*/OLLAMA_MODEL=llama3.2/' .env
    else
      echo "OLLAMA_MODEL=llama3.2" >> .env
    fi
    
  else
    echo -e "${RED}❌ Failed to install llama3.2 model${NC}"
    echo -e "${YELLOW}You can try installing it manually later: ollama pull llama3.2${NC}"
  fi
}

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

# Create or update .env file for persistence while preserving existing variables
echo -e "${BLUE}📝 Updating .env file with port assignments...${NC}"

# Read existing .env file if it exists, excluding port variables
if [ -f .env ]; then
  # Create backup
  cp .env .env.backup
  # Extract non-port variables
  grep -v -E "^(BACKEND_PORT|WRAPPER_PORT|FRONTEND_PORT)=" .env > .env.temp 2>/dev/null || true
else
  # Create empty temp file if no .env exists
  touch .env.temp
fi

# Add port assignments
echo "BACKEND_PORT=$BACKEND_PORT" >> .env.temp
echo "WRAPPER_PORT=$WRAPPER_PORT" >> .env.temp
echo "FRONTEND_PORT=$FRONTEND_PORT" >> .env.temp

# Replace .env with updated version
mv .env.temp .env

echo -e "${GREEN}✅ Environment variables updated in .env file${NC}"

# Check Ollama status before starting services
check_ollama

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