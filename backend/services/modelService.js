const axios = require('axios');
const { Ollama } = require('ollama');
const modelCategorizationService = require('./modelCategorizationService');
const offlineModelService = require('./offlineModelService');

// Initialize Ollama client
const ollama = new Ollama({
  host: 'http://127.0.0.1:11434'
});

exports.discoverAvailableModels = async () => {
  const models = {
    ollama: [],
    openai: [],
    claude: []
  };

  // First check Ollama availability as it's local
  try {
    console.log('Attempting to list Ollama models...');
    // Use direct fetch for listing models as the library's list method might not be reliable
    const ollamaResponse = await fetch('http://127.0.0.1:11434/api/tags');
    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API returned ${ollamaResponse.status}`);
    }
    const ollamaData = await ollamaResponse.json();
    console.log('Ollama models response:', ollamaData);
    
    if (Array.isArray(ollamaData.models)) {
      models.ollama = ollamaData.models.map(model => ({
        id: model.name,
        name: model.name,
        object: 'model',
        created: Date.now(),
        owned_by: 'ollama'
      }));
    }
  } catch (error) {
    console.error('Error fetching Ollama models:', error.message);
    // Don't throw here, just continue with empty Ollama models
  }

  // Only try OpenAI if we have a valid API key
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
      const openaiResponse = await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 5000
      });
      
      // Filter and map OpenAI models
      const filteredModels = openaiResponse.data.data.filter(model => {
        const modelId = model.id.toLowerCase();
        return modelId.includes('gpt-') || modelId.startsWith('o1-');
      });
      
      models.openai = filteredModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error.message);
    }
  }

  // Only try Claude if we have a valid API key
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_claude_api_key_here') {
    try {
      // Claude doesn't have a model list endpoint, so we use known available models
      const knownClaudeModels = [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' }, 
        { id: 'claude-3.5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
      ];
      
      models.claude = knownClaudeModels.map(model => ({
        ...model,
        object: 'model',
        created: Date.now(),
        owned_by: 'anthropic'
      }));
      
      console.log(`✅ Added ${models.claude.length} Claude models to discovery`);
    } catch (error) {
      console.error('Error adding Claude models:', error.message);
    }
  }

  // Get default model (prefer Ollama if available since it's local)
  const defaultModel = models.ollama.length > 0 
    ? { provider: 'ollama', id: models.ollama[0].id }
    : models.openai.length > 0
      ? { provider: 'openai', id: models.openai[0].id }
    : models.claude.length > 0
      ? { provider: 'claude', id: models.claude[0].id }
      : null;

  return {
    ...models,
    defaultModel
  };
};

/**
 * Discover and categorize models using AI-powered categorization
 */
exports.discoverAndCategorizeModels = async () => {
  console.log('🚀 Starting model discovery and categorization...');
  
  // First discover all available models
  const availableModels = await exports.discoverAvailableModels();
  
  // Then categorize them using our AI service
  const categorizedModels = await modelCategorizationService.categorizeModels(availableModels);
  
  return {
    raw: availableModels,
    categorized: categorizedModels,
    meta: {
      totalModels: Object.values(availableModels).flat().length,
      discoveredAt: Date.now(),
      categorizedAt: modelCategorizationService.lastCategorizationTime
    }
  };
};

/**
 * Get the current model mapping for an avatar based on its category (offline-aware)
 */
exports.resolveAvatarModel = async (avatar, preferLocal = false) => {
  const category = avatar.modelCategory || avatar.selectedModel || 'General';
  
  // If it's an old-style specific model assignment, try to use it (but check availability)
  if (category.includes(':')) {
    const [provider] = category.split(':');
    const connectivity = offlineModelService.getConnectivityStatus();
    
    // Check if the provider is available
    if (connectivity.apiEndpointsUp[provider]) {
      return category;
    } else {
      console.warn(`⚠️ Provider ${provider} not available, falling back to available models`);
      // Fall through to category-based resolution
    }
  }
  
  // Check offline/online status and get available model categories
  const connectivity = offlineModelService.getConnectivityStatus();
  const offlineSafeCategories = offlineModelService.getOfflineSafeCategories();
  
  // Check if the requested category is available in current connectivity state
  let targetCategory = category;
  if (!offlineSafeCategories[category]?.available) {
    // Try to find a fallback category
    const fallbackCategory = offlineSafeCategories[category]?.fallback;
    if (fallbackCategory && offlineSafeCategories[fallbackCategory]?.available) {
      console.log(`🔄 Falling back from ${category} to ${fallbackCategory} due to connectivity`);
      targetCategory = fallbackCategory;
    } else {
      // Find any available category
      const availableCategory = Object.entries(offlineSafeCategories)
        .find(([_, info]) => info.available)?.[0];
      
      if (availableCategory) {
        console.log(`🔄 Falling back from ${category} to ${availableCategory} (only available option)`);
        targetCategory = availableCategory;
      } else {
        console.error('❌ No AI models available in current connectivity state');
        throw new Error('No AI models available - please ensure internet connection or start Ollama');
      }
    }
  }
  
  // Use offline service's preference for local models
  const shouldPreferLocal = preferLocal || offlineModelService.shouldPreferLocal();
  
  // Ensure models are categorized before trying to resolve
  if (!modelCategorizationService.lastCategorizationTime || 
      Date.now() - modelCategorizationService.lastCategorizationTime > 300000) { // 5 minutes
    console.log('🔄 Model categorization needed, running discovery...');
    try {
      await exports.discoverAndCategorizeModels();
    } catch (error) {
      console.warn('⚠️ Categorization failed during resolution:', error.message);
    }
  }
  
  // Get the best model for the (possibly adjusted) category
  const model = modelCategorizationService.getBestModelForCategory(targetCategory, shouldPreferLocal);
  
  if (!model) {
    console.warn(`⚠️ No models available for category ${targetCategory}, attempting final fallback`);
    
    // Try to get any available model from any category
    const allCategories = ['Tactical', 'Rapid', 'General', 'Strategic'];
    for (const fallbackCategory of allCategories) {
      const fallbackModel = modelCategorizationService.getBestModelForCategory(fallbackCategory, shouldPreferLocal);
      if (fallbackModel) {
        console.log(`🆘 Using emergency fallback: ${fallbackModel.id} from ${fallbackCategory}`);
        return fallbackModel.id;
      }
    }
    
    // Ultimate fallback
    return 'openai:gpt-4-turbo-preview';
  }
  
  console.log(`✅ Resolved ${avatar.name} | ${category} → ${targetCategory} → ${model.id} (Local: ${model.isLocal})`);
  return model.id;
};

/**
 * Check if a model response suggests escalation and return better model if needed
 */
exports.checkForEscalation = (currentCategory, responseContent) => {
  const suggestedCategory = modelCategorizationService.shouldEscalate(currentCategory, responseContent);
  
  if (suggestedCategory) {
    console.log(`📈 Model suggesting escalation from ${currentCategory} to ${suggestedCategory}`);
    const betterModel = modelCategorizationService.getBestModelForCategory(suggestedCategory);
    return {
      shouldEscalate: true,
      targetCategory: suggestedCategory,
      targetModel: betterModel ? betterModel.id : null,
      reason: 'Model suggested escalation for better results'
    };
  }
  
  return { shouldEscalate: false };
}; 