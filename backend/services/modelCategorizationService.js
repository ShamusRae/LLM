const aiService = require('./ai/aiService');

/**
 * Model Category Definitions:
 * - Strategic: Most capable models for complex reasoning, analysis, planning (GPT-4, Claude 3.5 Sonnet)
 * - General: Well-rounded models for everyday tasks (GPT-4o, Claude 3 Haiku) 
 * - Rapid: Fast, efficient models for simple tasks (GPT-3.5, smaller local models)
 * - Tactical: Specialized models for specific domains or local execution
 */

class ModelCategorizationService {
  constructor() {
    this.modelCategories = {
      Strategic: [],
      General: [], 
      Rapid: [],
      Tactical: []
    };
    this.lastCategorizationTime = null;
    this.categorizationCache = new Map();
  }

  /**
   * Categorize all available models using LLM analysis
   */
  async categorizeModels(availableModels) {
    console.log('🔍 Starting LLM-powered model categorization...');
    
    // Flatten all models from all providers
    const allModels = [];
          Object.entries(availableModels).forEach(([provider, models]) => {
        console.log(`🔍 Processing provider: ${provider}, type: ${Array.isArray(models) ? 'array' : typeof models}, count: ${Array.isArray(models) ? models.length : 'N/A'}`);
        
        // Skip non-array properties like 'defaultModel'
        if (Array.isArray(models)) {
          models.forEach(model => {
            const modelData = {
              id: `${provider}:${model.id}`,
              name: model.name || model.id,
              provider: provider,
              modelId: model.id,
              isLocal: provider === 'ollama',
              isOnline: provider !== 'ollama'
            };
            
            // Only add models that have a valid category (excludes image/audio models)
            const category = this.getFallbackCategory(modelData);
            
            // Debug Claude models specifically
            if (provider === 'claude') {
              console.log(`🔍 Claude model filtering: ${modelData.modelId} → category: ${category}`);
            }
            
            if (category) {
              allModels.push(modelData);
            } else if (provider === 'claude') {
              console.log(`❌ Claude model FILTERED OUT: ${modelData.modelId} (category was null)`);
            }
          });
        }
      });

    if (allModels.length === 0) {
      console.warn('⚠️ No models available for categorization');
      return this.getDefaultCategories();
    }

    try {
      const categorizedModels = await this.performLLMCategorization(allModels);
      this.modelCategories = categorizedModels;
      this.lastCategorizationTime = Date.now();
      
      console.log('✅ Model categorization completed:', {
        Strategic: this.modelCategories.Strategic.length,
        General: this.modelCategories.General.length,
        Rapid: this.modelCategories.Rapid.length,
        Tactical: this.modelCategories.Tactical.length
      });
      
      return this.modelCategories;
    } catch (error) {
      console.error('❌ LLM categorization failed, using fallback:', error.message);
      const fallbackCategories = this.performFallbackCategorization(allModels);
      this.modelCategories = fallbackCategories;
      this.lastCategorizationTime = Date.now();
      return fallbackCategories;
    }
  }

  /**
   * Use LLM to intelligently categorize models
   */
  async performLLMCategorization(models) {
    console.log(`🔍 Starting LLM categorization with ${models.length} models`);
    
    if (models.length === 0) {
      throw new Error('No models provided for categorization');
    }
    
    // Debug: show first few models being categorized
    console.log('📋 First 3 models to categorize:');
    models.slice(0, 3).forEach(m => {
      console.log(`  - ${m.id} (Provider: ${m.provider}, Local: ${m.isLocal})`);
    });
    
    const modelList = models.map(m => `${m.id} (Provider: ${m.provider}, Local: ${m.isLocal})`).join('\n');
    
    const prompt = `You are an AI model expert. Categorize these AI models into exactly 4 categories:

**Strategic** - Most capable models for complex reasoning, analysis, strategic planning, creative work
**General** - Well-rounded models suitable for everyday tasks, good balance of capability and speed  
**Rapid** - Fast, efficient models optimized for speed and simple tasks
**Tactical** - Local/specialized models for specific use cases, offline scenarios, or experimental models

Available Models:
${modelList}

IMPORTANT RULES:
1. Every model must be assigned to exactly ONE category
2. Consider model capabilities, size, speed, and use cases
3. Local models (ollama) are generally better for Tactical unless they're very capable
4. Latest/most advanced models (gpt-4, claude-3.5-sonnet, o1) should be Strategic
5. Balanced models should be General
6. Fast/smaller models should be Rapid

Respond with a JSON object in this exact format:
{
  "Strategic": ["provider:model1", "provider:model2"],
  "General": ["provider:model3", "provider:model4"], 
  "Rapid": ["provider:model5", "provider:model6"],
  "Tactical": ["provider:model7", "provider:model8"]
}`;

    // Try to get the best available provider for categorization
    let provider, modelToUse;
    try {
      provider = aiService.getProvider('openai', process.env.OPENAI_API_KEY);
      modelToUse = 'gpt-4';
    } catch {
      try {
        provider = aiService.getProvider('claude', process.env.ANTHROPIC_API_KEY);
        modelToUse = 'claude-3-5-sonnet-20241022';
      } catch {
        provider = aiService.getProvider('ollama');
        // Use the best available local model for categorization
        modelToUse = process.env.OLLAMA_MODEL || 'qwq:latest';
      }
    }

    console.log(`🔍 Attempting LLM categorization with ${provider.constructor.name}, model: ${modelToUse}`);
    console.log(`📝 Prompt length: ${prompt?.length || 'null'} characters`);
    
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is empty or null');
    }

    const response = await provider.generateResponse(prompt, { 
      model: modelToUse,
      temperature: 0.1
    });

    const content = response.choices?.[0]?.message?.content || response.content;
    
    if (!content || content === null) {
      console.warn('⚠️ LLM response content is null/empty, response structure:', 
        JSON.stringify(response, null, 2).substring(0, 300) + '...');
      throw new Error('LLM response content is null or empty');
    }
    
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    const categorization = JSON.parse(cleanedContent);
    
    // Validate and enrich the categorization
    return this.validateAndEnrichCategorization(categorization, models);
  }

  /**
   * Validate LLM categorization and enrich with model metadata
   */
  validateAndEnrichCategorization(categorization, models) {
    const result = { Strategic: [], General: [], Rapid: [], Tactical: [] };
    const modelMap = new Map(models.map(m => [m.id, m]));
    const usedModels = new Set();

    // Process LLM categorization
    Object.entries(categorization).forEach(([category, modelIds]) => {
      if (result[category]) {
        modelIds.forEach(modelId => {
          const model = modelMap.get(modelId);
          if (model) {
            result[category].push({
              ...model,
              category: category,
              categorizedBy: 'llm',
              categorizedAt: Date.now()
            });
            usedModels.add(modelId);
          }
        });
      }
    });

    // Handle any uncategorized models with fallback logic
    models.forEach(model => {
      if (!usedModels.has(model.id)) {
        const fallbackCategory = this.getFallbackCategory(model);
        result[fallbackCategory].push({
          ...model,
          category: fallbackCategory,
          categorizedBy: 'fallback',
          categorizedAt: Date.now()
        });
      }
    });

    return result;
  }

  /**
   * Fallback categorization when LLM is unavailable
   */
  performFallbackCategorization(models) {
    console.log('🔄 Using fallback categorization logic...');
    
    const categories = { Strategic: [], General: [], Rapid: [], Tactical: [] };
    
    models.forEach(model => {
      const category = this.getFallbackCategory(model);
      // Skip models that don't have a valid category (like image/audio models)
      if (category && categories[category]) {
        categories[category].push({
          ...model,
          category: category,
          categorizedBy: 'fallback',
          categorizedAt: Date.now()
        });
      }
    });

    return categories;
  }

  /**
   * Determine fallback category based on model name patterns
   */
  getFallbackCategory(model) {
    const modelName = (model.modelId || model.id).toLowerCase();
    
    // Strategic: Best reasoning models (Claude 4 Opus, O3, older Claude Opus, best local)
    if (modelName.includes('claude-4-opus-20250722') || 
        modelName.includes('claude-3.5-sonnet-20240620') || 
        modelName.includes('claude-3-opus-20240229') ||
        modelName.includes('o3-') || modelName.includes('qwq') || 
        modelName.includes('deepseek-r1') ||
        (modelName.includes('phi4') && !modelName.includes('mini'))) {
      return 'Strategic';
    }
    
    // General: Latest GPT-4o, balanced Claude, general purpose models
    if (modelName.includes('gpt-4o') || modelName.includes('chatgpt-4o') ||
        modelName.includes('claude-3-sonnet') || modelName.includes('gemma') ||
        modelName.includes('general')) {
      return 'General';
    }
    
    // Rapid: Fast models optimized for speed
    if (modelName.includes('gpt-3.5') || modelName.includes('haiku') || 
        modelName.includes('mini') || modelName.includes('fast') || 
        modelName.includes('rapid') || modelName.includes('turbo-instruct')) {
      return 'Rapid';
    }
    
    // Tactical: Local models and specialized models
    if (model.isLocal) {
      return 'Tactical';
    }
    
    // Exclude image/audio models from chat categories
    if (modelName.includes('image') || modelName.includes('audio') || 
        modelName.includes('vision') || modelName.includes('tts') ||
        modelName.includes('whisper')) {
      return null; // Don't categorize these for chat
    }
    
    // General: Everything else
    return 'General';
  }

  /**
   * Get default categories when no models are available
   */
  getDefaultCategories() {
    return {
      Strategic: [],
      General: [], 
      Rapid: [],
      Tactical: []
    };
  }

  /**
   * Get the best model from a category for a given task
   */
  getBestModelForCategory(category, preferLocal = false) {
    const models = this.modelCategories[category] || [];
    if (models.length === 0) return null;

    // Prefer local models if requested and available
    if (preferLocal) {
      const localModels = models.filter(m => m.isLocal);
      if (localModels.length > 0) {
        const best = this.selectBestModel(localModels);
        console.log(`🏠 Using local model: ${best.id} for ${category}`);
        return best;
      }
    }

    // If NOT preferLocal, prioritize online models when available
    if (!preferLocal) {
      const onlineModels = models.filter(m => !m.isLocal);
      if (onlineModels.length > 0) {
        const best = this.selectBestModel(onlineModels);
        console.log(`🌐 Using online model: ${best.id} for ${category}`);
        return best;
      }
    }

    // Fallback to best available model
    const best = this.selectBestModel(models);
    console.log(`📋 Using fallback model: ${best.id} for ${category}`);
    return best;
  }

  /**
   * Select the best model from a list based on quality scoring
   */
  selectBestModel(models) {
    if (models.length === 1) return models[0];
    
    // Sort by model quality/preference
    return models.sort((a, b) => {
      const scoreA = this.getModelQualityScore(a);
      const scoreB = this.getModelQualityScore(b);
      return scoreB - scoreA; // Higher score = better
    })[0];
  }

  /**
   * Score models for quality/preference (higher = better)
   */
  getModelQualityScore(model) {
    const modelName = model.modelId.toLowerCase();
    
    // Premium models get highest scores (2025+ models)
    if (modelName.includes('claude-4-opus-20250722')) return 105; // Claude 4 - newest and best!
    if (modelName.includes('claude-3.5-sonnet-20240620')) return 100;
    if (modelName.includes('gpt-4.1-2025-04-14')) return 98;
    if (modelName.includes('o3-mini')) return 95;
    if (modelName.includes('gpt-4.1-mini-2025-04-14')) return 92;
    if (modelName.includes('chatgpt-4o-latest')) return 90;
    if (modelName.includes('gpt-4o-2024-11-20')) return 88;
    if (modelName.includes('gpt-4o-2024-08-06')) return 86;
    if (modelName.includes('claude-3-opus-20240229')) return 85;
    if (modelName.includes('gpt-4.1-nano-2025-04-14')) return 82;
    if (modelName.includes('gpt-4o')) return 80;
    if (modelName.includes('claude-3-sonnet-20240229')) return 75;
    if (modelName.includes('gpt-4-turbo')) return 70;
    if (modelName.includes('gpt-4')) return 65;
    if (modelName.includes('gpt-3.5-turbo-0125')) return 60;
    if (modelName.includes('gpt-3.5-turbo')) return 55;
    if (modelName.includes('claude-3-haiku-20240307')) return 50;
    
    // Local model scoring
    if (modelName.includes('deepseek-r1')) return 85;
    if (modelName.includes('qwq')) return 80;
    if (modelName.includes('phi4') && !modelName.includes('mini')) return 75;
    if (modelName.includes('gemma3n')) return 60;
    if (modelName.includes('phi4-mini')) return 40;
    
    // Default score
    return 30;
  }

  /**
   * Check if escalation is needed based on model suggestion
   */
  shouldEscalate(currentCategory, responseContent) {
    // Simple escalation patterns - could be made more sophisticated
    const escalationTriggers = [
      'this requires more advanced reasoning',
      'i need a more capable model',
      'this is beyond my capabilities', 
      'escalate to strategic model',
      'complex analysis required'
    ];
    
    const content = responseContent.toLowerCase();
    const needsEscalation = escalationTriggers.some(trigger => content.includes(trigger));
    
    if (needsEscalation) {
      const categoryOrder = ['Rapid', 'General', 'Strategic'];
      const currentIndex = categoryOrder.indexOf(currentCategory);
      if (currentIndex < categoryOrder.length - 1) {
        return categoryOrder[currentIndex + 1];
      }
    }
    
    return null;
  }

  /**
   * Get categories with available models
   */
  getAvailableCategories() {
    return Object.entries(this.modelCategories)
      .filter(([_, models]) => models.length > 0)
      .map(([category, models]) => ({
        category,
        count: models.length,
        hasLocal: models.some(m => m.isLocal),
        hasOnline: models.some(m => m.isOnline)
      }));
  }
}

module.exports = new ModelCategorizationService(); 