#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🤖 LLM Chat - Ollama Setup Assistant${NC}"
echo -e "${BLUE}This will help you set up offline AI capabilities${NC}"
echo ""

# Function to check system requirements
check_system() {
  echo -e "${YELLOW}🔍 Checking system requirements...${NC}"
  
  # Check available disk space (Ollama models can be large)
  AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}' | sed 's/[^0-9.]//g')
  echo -e "   💾 Available disk space: ${BLUE}$(df -h . | awk 'NR==2 {print $4}')${NC}"
  
  # Check RAM
  if [[ "$OSTYPE" == "darwin"* ]]; then
    RAM_GB=$(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2}')
    echo -e "   🧠 System RAM: ${BLUE}${RAM_GB}${NC}"
  else
    RAM_GB=$(free -h | awk '/^Mem:/ {print $2}')
    echo -e "   🧠 System RAM: ${BLUE}${RAM_GB}${NC}"
  fi
  
  echo ""
}

# Function to install Ollama
install_ollama() {
  echo -e "${BLUE}📦 Installing Ollama...${NC}"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS installation
    if command -v brew >/dev/null 2>&1; then
      echo -e "${YELLOW}Using Homebrew to install Ollama...${NC}"
      brew install ollama
    else
      echo -e "${YELLOW}Using official installer...${NC}"
      curl -fsSL https://ollama.com/install.sh | sh
    fi
  else
    # Linux installation
    echo -e "${YELLOW}Using official installer for Linux...${NC}"
    curl -fsSL https://ollama.com/install.sh | sh
  fi
  
  # Verify installation
  if command -v ollama >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama installed successfully${NC}"
    return 0
  else
    echo -e "${RED}❌ Ollama installation failed${NC}"
    return 1
  fi
}

# Function to start Ollama service
start_ollama_service() {
  echo -e "${BLUE}🚀 Starting Ollama service...${NC}"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - start as background service
    brew services start ollama || nohup ollama serve >/dev/null 2>&1 &
  else
    # Linux - start in background
    nohup ollama serve >/dev/null 2>&1 &
  fi
  
  # Wait for startup
  echo -e "${YELLOW}Waiting for Ollama to start...${NC}"
  sleep 3
  
  # Check if started
  if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama service is running${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed to start Ollama service${NC}"
    return 1
  fi
}

# Function to show model recommendations
show_model_recommendations() {
  echo -e "${PURPLE}🎯 Recommended Models for LLM Chat:${NC}"
  echo ""
  
  echo -e "${BLUE}🧠 Strategic Category (Advanced reasoning):${NC}"
  echo -e "   • ${YELLOW}qwq${NC} (32B) - Best reasoning and analysis"
  echo -e "   • ${YELLOW}deepseek-r1:14b${NC} (14B) - Strong reasoning, smaller"
  echo ""
  
  echo -e "${BLUE}⚖️ General Category (Everyday tasks):${NC}"
  echo -e "   • ${YELLOW}llama3.2${NC} (3B) - Well-rounded, good balance"
  echo -e "   • ${YELLOW}llama3.1:8b${NC} (8B) - More capable general model"
  echo ""
  
  echo -e "${BLUE}⚡ Rapid Category (Fast responses):${NC}"
  echo -e "   • ${YELLOW}phi3:mini${NC} (3.8B) - Ultra-fast responses"
  echo -e "   • ${YELLOW}gemma2:2b${NC} (2B) - Smallest, fastest"
  echo ""
  
  echo -e "${BLUE}🎯 Tactical Category (Specialized):${NC}"
  echo -e "   • ${YELLOW}deepseek-coder${NC} (6.7B) - Code generation expert"
  echo -e "   • ${YELLOW}llama3.2-vision${NC} (11B) - Image understanding"
  echo ""
  
  echo -e "${YELLOW}💡 For beginners, we recommend starting with 'llama3.2' - it's small, fast, and capable${NC}"
  echo ""
}

# Function to install recommended models
install_models() {
  show_model_recommendations
  
  echo -e "${BLUE}Which models would you like to install?${NC}"
  echo -e "${YELLOW}1) Essential only (llama3.2 - 2GB)${NC}"
  echo -e "${YELLOW}2) Balanced set (llama3.2 + phi3:mini - ~4GB)${NC}"
  echo -e "${YELLOW}3) Full set (all recommended models - ~25GB)${NC}"
  echo -e "${YELLOW}4) Custom selection${NC}"
  echo -e "${YELLOW}5) Skip model installation${NC}"
  
  read -p "$(echo -e "${BLUE}Choose an option [1-5]: ${NC}")" choice
  
  case $choice in
    1)
      install_model_set "essential"
      ;;
    2)
      install_model_set "balanced"
      ;;
    3)
      install_model_set "full"
      ;;
    4)
      custom_model_selection
      ;;
    5)
      echo -e "${YELLOW}Skipping model installation. You can install models later with: ollama pull <model-name>${NC}"
      ;;
    *)
      echo -e "${RED}Invalid option. Skipping model installation.${NC}"
      ;;
  esac
}

# Function to install model sets
install_model_set() {
  local set_type=$1
  
  case $set_type in
    "essential")
      models=("llama3.2")
      ;;
    "balanced")
      models=("llama3.2" "phi3:mini")
      ;;
    "full")
      models=("llama3.2" "phi3:mini" "qwq" "deepseek-coder" "llama3.1:8b")
      ;;
  esac
  
  echo -e "${BLUE}Installing selected models...${NC}"
  
  for model in "${models[@]}"; do
    echo -e "${YELLOW}📦 Installing ${model}...${NC}"
    if ollama pull "$model"; then
      echo -e "${GREEN}✅ ${model} installed successfully${NC}"
    else
      echo -e "${RED}❌ Failed to install ${model}${NC}"
    fi
    echo ""
  done
  
  # Update .env file with a default model
  if [ -f .env ]; then
    if grep -q "^OLLAMA_MODEL=" .env; then
      sed -i.bak "s/^OLLAMA_MODEL=.*/OLLAMA_MODEL=${models[0]}/" .env
    else
      echo "OLLAMA_MODEL=${models[0]}" >> .env
    fi
    echo -e "${BLUE}Updated .env file with default model: ${models[0]}${NC}"
  fi
}

# Function for custom model selection
custom_model_selection() {
  echo -e "${BLUE}Enter model names separated by spaces (e.g., llama3.2 phi3:mini):${NC}"
  read -p "Models: " -a custom_models
  
  if [ ${#custom_models[@]} -eq 0 ]; then
    echo -e "${YELLOW}No models specified. Skipping installation.${NC}"
    return
  fi
  
  echo -e "${BLUE}Installing custom model selection...${NC}"
  
  for model in "${custom_models[@]}"; do
    echo -e "${YELLOW}📦 Installing ${model}...${NC}"
    if ollama pull "$model"; then
      echo -e "${GREEN}✅ ${model} installed successfully${NC}"
    else
      echo -e "${RED}❌ Failed to install ${model}${NC}"
    fi
    echo ""
  done
}

# Function to test installation
test_installation() {
  echo -e "${BLUE}🧪 Testing Ollama installation...${NC}"
  
  # List installed models
  echo -e "${YELLOW}Installed models:${NC}"
  ollama list
  echo ""
  
  # Quick test with the first available model
  FIRST_MODEL=$(ollama list | grep -v NAME | head -1 | awk '{print $1}')
  
  if [ -n "$FIRST_MODEL" ]; then
    echo -e "${BLUE}Testing ${FIRST_MODEL} with a simple query...${NC}"
    echo "Hello! Can you confirm you're working?" | ollama run "$FIRST_MODEL"
    echo ""
    echo -e "${GREEN}✅ Ollama is working correctly!${NC}"
  else
    echo -e "${YELLOW}⚠️ No models installed. Please install at least one model to test.${NC}"
  fi
}

# Function to show final summary
show_summary() {
  echo -e "${PURPLE}🎉 Setup Complete!${NC}"
  echo ""
  echo -e "${GREEN}✅ Ollama is installed and running${NC}"
  echo -e "${GREEN}✅ Models are ready for offline AI${NC}"
  echo ""
  echo -e "${BLUE}🚀 Next steps:${NC}"
  echo -e "   1. Run ${YELLOW}./start.sh${NC} to start LLM Chat"
  echo -e "   2. Your avatars will now automatically use local models when offline"
  echo -e "   3. The app will work perfectly on planes! ✈️"
  echo ""
  echo -e "${YELLOW}💡 Useful commands:${NC}"
  echo -e "   • ${BLUE}ollama list${NC} - Show installed models"
  echo -e "   • ${BLUE}ollama pull <model>${NC} - Install new models"
  echo -e "   • ${BLUE}ollama run <model>${NC} - Chat with a model directly"
  echo ""
}

# Main execution
main() {
  check_system
  
  # Check if Ollama is already installed
  if command -v ollama >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama is already installed${NC}"
    
    # Check if service is running
    if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
      echo -e "${GREEN}✅ Ollama service is running${NC}"
    else
      start_ollama_service
    fi
  else
    # Install Ollama
    install_ollama || exit 1
    start_ollama_service || exit 1
  fi
  
  # Install models
  install_models
  
  # Test installation
  test_installation
  
  # Show summary
  show_summary
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi 