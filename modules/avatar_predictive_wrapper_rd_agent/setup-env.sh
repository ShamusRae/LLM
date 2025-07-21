#!/bin/bash

# Script to copy API keys from the main LLM Chat backend environment to the module

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up environment for Avatar Predictive Wrapper RD-Agent...${NC}"

# Path to backend .env file - fix path to point to the correct location
BACKEND_ENV="../../backend/.env"
MODULE_ENV=".env"
MODULE_ENV_EXAMPLE=".env.example"

# Check if backend .env exists
if [ ! -f "$BACKEND_ENV" ]; then
  echo -e "${YELLOW}Warning: Backend .env file not found at $BACKEND_ENV${NC}"
  echo -e "${BLUE}Checking for .env in other locations...${NC}"
  
  # Try to find .env in parent directories
  if [ -f "../../.env" ]; then
    BACKEND_ENV="../../.env"
    echo -e "${GREEN}Found .env file at $BACKEND_ENV${NC}"
  elif [ -f "../../../.env" ]; then
    BACKEND_ENV="../../../.env"
    echo -e "${GREEN}Found .env file at $BACKEND_ENV${NC}"
  else
    echo -e "${RED}Could not find any .env file${NC}"
    echo -e "${BLUE}Creating a default .env file. You'll need to update API keys manually.${NC}"
    cp "$MODULE_ENV_EXAMPLE" "$MODULE_ENV"
    
    # Set up Ollama default configuration
    echo -e "${YELLOW}Setting up default Ollama configuration${NC}"
    echo "OLLAMA_API_BASE_URL=http://localhost:11434" >> "$MODULE_ENV"
    echo "OLLAMA_MODEL=llama3" >> "$MODULE_ENV"
    
    exit 1
  fi
fi

# Create new .env file from example
cp "$MODULE_ENV_EXAMPLE" "$MODULE_ENV"

# Copy API keys from backend .env
echo -e "${BLUE}Copying API keys from backend .env...${NC}"

# List of keys to copy
KEYS_TO_COPY=(
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "COHERE_API_KEY"
  "GEMINI_API_KEY"
  "OLLAMA_API_BASE_URL"
  "OLLAMA_MODEL"
  "AZURE_OPENAI_API_KEY"
  "AZURE_OPENAI_ENDPOINT"
  "HUGGINGFACE_API_KEY"
)

# Copy each key
for KEY in "${KEYS_TO_COPY[@]}"; do
  # Get value from backend .env
  VALUE=$(grep "^$KEY=" "$BACKEND_ENV" | cut -d= -f2-)
  
  if [ -n "$VALUE" ]; then
    # Replace in the module .env file
    if grep -q "^$KEY=" "$MODULE_ENV"; then
      # Replace existing line
      sed -i '' "s|^$KEY=.*|$KEY=$VALUE|" "$MODULE_ENV"
    else
      # Add line if it doesn't exist
      echo "$KEY=$VALUE" >> "$MODULE_ENV"
    fi
    echo -e "${GREEN}✓ Copied $KEY${NC}"
  else
    echo -e "${YELLOW}✗ Key $KEY not found in backend .env${NC}"
    
    # For Ollama, set default values if not found
    if [ "$KEY" = "OLLAMA_API_BASE_URL" ]; then
      echo -e "${BLUE}Setting default value for $KEY${NC}"
      sed -i '' "s|^$KEY=.*|$KEY=http://localhost:11434|" "$MODULE_ENV"
    elif [ "$KEY" = "OLLAMA_MODEL" ]; then
      echo -e "${BLUE}Setting default value for $KEY${NC}"
      sed -i '' "s|^$KEY=.*|$KEY=llama3|" "$MODULE_ENV"
    fi
  fi
done

# Check if Ollama is running
if command -v curl &> /dev/null; then
  echo -e "${BLUE}Checking if Ollama is running...${NC}"
  if curl -s http://localhost:11434/api/version &> /dev/null; then
    echo -e "${GREEN}✓ Ollama is running${NC}"
    
    # Get list of available models
    MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$MODELS" ]; then
      echo -e "${GREEN}Available Ollama models:${NC}"
      echo "$MODELS" | while read -r model; do
        echo -e "  - $model"
      done
    fi
  else
    echo -e "${YELLOW}✗ Ollama is not running${NC}"
    echo -e "${BLUE}To use Ollama, start it with 'ollama serve' in a separate terminal${NC}"
  fi
fi

echo -e "${GREEN}Environment setup complete!${NC}"
echo -e "${BLUE}You may need to manually add any additional API keys or configuration values.${NC}" 