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
    ollama: false, // Will be checked dynamically
    deepseek: false // Will be checked via ollama/local setup
  };

  // Check Ollama availability (includes DeepSeek local models)
  try {
    const ollamaModels = await OllamaProvider.getAvailableModels();
    availability.ollama = ollamaModels.length > 0;
    
    // Check if any DeepSeek models are available via Ollama
    const deepseekModels = ollamaModels.filter(model => 
      model.name.includes('deepseek') || model.name.includes('DeepSeek')
    );
    availability.deepseek = deepseekModels.length > 0;
    
    if (availability.deepseek) {
      console.log(`🎯 Found ${deepseekModels.length} DeepSeek models available via Ollama`);
    }
  } catch (error) {
    availability.ollama = false;
    availability.deepseek = false;
  }

  return availability;
}

async function callAI(prompt, model = 'o4-mini', options = {}) {
  console.log(`🤖 AI Service: Calling ${model} with prompt length: ${prompt.length}`);
  
  // Add timeout to AI calls (2 minutes max)
  const AI_TIMEOUT = 2 * 60 * 1000; // 2 minutes
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`AI call to ${model} timed out after ${AI_TIMEOUT / 1000} seconds`));
    }, AI_TIMEOUT);
  });
  
  const aiCallPromise = _callAIInternal(prompt, model, options);
  
  try {
    return await Promise.race([aiCallPromise, timeoutPromise]);
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.error(`⏰ AI TIMEOUT: ${model} call exceeded ${AI_TIMEOUT / 1000}s limit`);
      throw new Error(`AI model ${model} timed out - try a simpler request or different model`);
    }
    throw error;
  }
}

/**
 * Internal AI call method with actual logic
 * @private
 */
async function _callAIInternal(prompt, model = 'o4-mini', options = {}) {
  if (!prompt || prompt === null) {
    throw new Error('Prompt content cannot be null or empty');
  }

  try {
    // Determine provider from model name with updated routing
    let providerName, apiKey;
    
    if (model.includes('claude')) {
      providerName = 'claude';
      apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    } else if (model.includes('gpt') || model.includes('o3') || model.includes('o4') || model.includes('o1')) {
      // Include all OpenAI o-series models
      providerName = 'openai';
      apiKey = process.env.OPENAI_API_KEY;
      
      console.log(`🎯 Routing ${model} to OpenAI provider with web search capabilities`);
    } else if (model.includes('deepseek')) {
      // Route DeepSeek to ollama for now (can be local or API-based)
      providerName = 'ollama';
      apiKey = null; // Ollama/local doesn't need API key
      
      console.log(`🎯 Routing ${model} to Ollama provider (DeepSeek local/API)`);
    } else if (model.includes('llama') || model.includes('ollama')) {
      providerName = 'ollama';
      apiKey = null; // Ollama doesn't need API key
    } else {
      // Default to o4-mini for unknown models (our new primary choice)
      providerName = 'openai';
      apiKey = process.env.OPENAI_API_KEY;
      model = 'o4-mini';
      
      console.log(`⚠️ Unknown model, defaulting to ${model} with web search`);
    }

    const provider = getProvider(providerName, apiKey);
    
    // Handle o3/o4 model-specific requirements
    const isO3O4Model = model && (model.includes('o3') || model.includes('o4'));
    const providerOptions = {
      model: model,
      systemMessage: isO3O4Model ? null : options.systemMessage, // o3/o4 don't support system messages
      functionDefinitions: options.functionDefinitions, // Enable web search tools
      ...options
    };
    
    // Remove problematic parameters for o3/o4 models
    if (isO3O4Model) {
      delete providerOptions.max_tokens; // o3/o4 use max_completion_tokens instead
      delete providerOptions.temperature; // o3/o4 only support default temperature
      console.log(`🔧 AI Service: Filtered o3/o4 incompatible parameters for ${model}`);
    }
    
    const response = await provider.generateResponse(prompt, providerOptions);
    
    // Extract content based on provider response format
    let content;
    if (providerName === 'openai') {
      content = response.choices?.[0]?.message?.content || response.content || response;
    } else if (providerName === 'claude') {
      content = response.content?.[0]?.text || response.content || response;
    } else if (providerName === 'ollama') {
      content = response.response || response.content || response;
    } else {
      content = response.content || response;
    }
    
    return {
      content: content,
      provider: providerName,
      model: model,
      rawResponse: response
    };
  } catch (error) {
    console.error(`AI call failed for model ${model}:`, error.message);
    throw error;
  }
}

module.exports = {
  getProvider,
  discoverModels,
  getAvailableProviders,
  validateApiKey,
  callAI
}; 