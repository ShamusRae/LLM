'use strict';

const OpenAIProvider = require('./openaiProvider');
const ClaudeProvider = require('./claudeProvider');
const OllamaProvider = require('./ollamaProvider');

const providers = {
  openai: OpenAIProvider,
  claude: ClaudeProvider,
  ollama: OllamaProvider,
};

function validateApiKey(providerName, apiKey) {
  if (providerName === 'ollama') return true; // Ollama doesn't need API key
  
  if (!apiKey || apiKey === `your_${providerName}_api_key_here`) {
    return false;
  }
  
  return true;
}

function getProvider(providerName, apiKey) {
  const ProviderClass = providers[providerName];
  if (!ProviderClass) {
    throw new Error(`Unsupported AI provider: ${providerName}`);
  }

  // Validate API key for non-Ollama providers
  if (!validateApiKey(providerName, apiKey)) {
    throw new Error(`API key for ${providerName} is not configured. Please add your ${providerName.toUpperCase()}_API_KEY to the environment or configure it in settings.`);
  }

  return new ProviderClass(apiKey);
}

async function discoverModels() {
  const modelPromises = [
    OpenAIProvider.getAvailableModels(process.env.OPENAI_API_KEY).catch(err => {
      console.warn('OpenAI models not available:', err.message);
      return [];
    }),
    ClaudeProvider.getAvailableModels().catch(err => {
      console.warn('Claude models not available:', err.message);
      return [];
    }),
    OllamaProvider.getAvailableModels().catch(err => {
      console.warn('Ollama models not available:', err.message);
      return [];
    }),
  ];

  const [openaiModels, claudeModels, ollamaModels] = await Promise.all(modelPromises);

  return {
    openai: openaiModels,
    claude: claudeModels,
    ollama: ollamaModels,
  };
}

async function getAvailableProviders() {
  const availability = {
    openai: validateApiKey('openai', process.env.OPENAI_API_KEY),
    claude: validateApiKey('claude', process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
    ollama: false // Will be checked dynamically
  };

  // Check Ollama availability
  try {
    const ollamaModels = await OllamaProvider.getAvailableModels();
    availability.ollama = ollamaModels.length > 0;
  } catch (error) {
    availability.ollama = false;
  }

  return availability;
}

module.exports = {
  getProvider,
  discoverModels,
  getAvailableProviders,
  validateApiKey
}; 