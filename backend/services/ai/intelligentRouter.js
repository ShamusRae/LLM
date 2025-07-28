// Intelligent AI Model Router for Professional Consulting Platform
// Dynamically selects optimal AI models based on task characteristics

const { callAI } = require('./aiService');

class IntelligentAIRouter {
  constructor() {
    // Model capabilities matrix - defines what each model excels at
    this.modelCapabilities = {
      // === OpenAI o-series Models (2025) - PRIMARY CHOICE ===
      'o3': {
        reasoning: 10,
        analysis: 10,
        creativity: 9,
        technical: 10,
        speed: 6,
        cost: 9, // Very expensive but best reasoning
        domains: ['complex_analysis', 'strategic_planning', 'research', 'mathematical_reasoning'],
        maxTokens: 16000,
        strengths: ['elite_reasoning', 'multi_step_logic', 'complex_problem_solving', 'web_search'],
        pricing: { input: 10.00, output: 40.00, webSearch: 10.00 }, // $10/1k web search calls
        apiNotes: 'No system messages, reasoning-focused model with web search tools',
        hasWebSearch: true
      },
      'o4-mini': {
        reasoning: 9,
        analysis: 9,
        creativity: 8,
        technical: 9,
        speed: 8,
        cost: 3, // Excellent cost/performance ratio
        domains: ['finance', 'strategy', 'analysis', 'consulting', 'business_planning'],
        maxTokens: 16000,
        strengths: ['cost_effective_reasoning', 'business_analysis', 'strategic_thinking', 'web_search'],
        pricing: { input: 1.10, output: 4.40, webSearch: 10.00 }, // $10/1k web search calls
        apiNotes: 'No system messages, best value for consulting with web search',
        hasWebSearch: true
      },
      'o3-pro': {
        reasoning: 10,
        analysis: 10,
        creativity: 9,
        technical: 10,
        speed: 5,
        cost: 10, // Most expensive but highest capability
        domains: ['complex_analysis', 'strategic_planning', 'research', 'mathematical_reasoning'],
        maxTokens: 32000,
        strengths: ['elite_reasoning', 'professional_analysis', 'web_search', 'deep_research'],
        pricing: { input: 20.00, output: 80.00, webSearch: 10.00 },
        apiNotes: 'Professional tier with advanced reasoning and web search',
        hasWebSearch: true
      },
      'o3-deep-research': {
        reasoning: 10,
        analysis: 10,
        creativity: 9,
        technical: 10,
        speed: 4, // Slower but very thorough
        cost: 10,
        domains: ['deep_research', 'comprehensive_analysis', 'strategic_planning'],
        maxTokens: 32000,
        strengths: ['comprehensive_research', 'thorough_analysis', 'web_search', 'deep_insights'],
        pricing: { input: 15.00, output: 60.00, webSearch: 10.00 },
        apiNotes: 'Deep research variant with extensive web search capabilities',
        hasWebSearch: true
      },
      'o4-mini-deep-research': {
        reasoning: 9,
        analysis: 9,
        creativity: 8,
        technical: 9,
        speed: 6,
        cost: 4,
        domains: ['research', 'analysis', 'consulting', 'business_intelligence'],
        maxTokens: 16000,
        strengths: ['cost_effective_research', 'business_analysis', 'web_search', 'data_synthesis'],
        pricing: { input: 2.00, output: 8.00, webSearch: 10.00 },
        apiNotes: 'Cost-effective deep research with web search',
        hasWebSearch: true
      },
      
      // === Claude 4 Models - BACKUP CHOICE ===
      'claude-4': {
        reasoning: 10,
        analysis: 10,
        creativity: 9,
        technical: 9,
        speed: 8,
        cost: 7,
        domains: ['finance', 'analysis', 'reporting', 'general', 'complex_analysis'],
        maxTokens: 8000,
        strengths: ['balanced_performance', 'reliability', 'web_search', 'nuanced_analysis'],
        pricing: { input: 5.00, output: 20.00, webSearch: 10.00 },
        apiNotes: 'Claude 4 with internet search capabilities',
        hasWebSearch: true
      },
      'claude-4-opus': {
        reasoning: 10,
        analysis: 10,
        creativity: 10,
        technical: 9,
        speed: 6,
        cost: 9,
        domains: ['creative_analysis', 'strategic_thinking', 'complex_reasoning'],
        maxTokens: 8000,
        strengths: ['creative_reasoning', 'strategic_insights', 'web_search', 'comprehensive_analysis'],
        pricing: { input: 15.00, output: 75.00, webSearch: 10.00 },
        apiNotes: 'Premium Claude 4 with internet search',
        hasWebSearch: true
      },

      // === DeepSeek Models - OFFLINE FALLBACK ===
      'deepseek-v3': {
        reasoning: 8,
        analysis: 8,
        creativity: 7,
        technical: 9,
        speed: 9,
        cost: 1, // Very cost effective
        domains: ['finance', 'analysis', 'research', 'local_processing'],
        maxTokens: 8000,
        strengths: ['cost_effective', 'fast_processing', 'local_control', 'privacy'],
        pricing: { input: 0.10, output: 0.20 },
        apiNotes: 'Cost-effective model for offline processing',
        hasWebSearch: false
      },
      'deepseek-coder': {
        reasoning: 8,
        analysis: 9,
        creativity: 6,
        technical: 10,
        speed: 9,
        cost: 1,
        domains: ['technical_analysis', 'coding', 'data_analysis'],
        maxTokens: 8000,
        strengths: ['technical_accuracy', 'coding_excellence', 'data_processing'],
        pricing: { input: 0.10, output: 0.20 },
        apiNotes: 'Specialized for technical analysis',
        hasWebSearch: false
      },

      // === Legacy OpenAI Models - COMPATIBILITY ===
      'o1-preview': {
        reasoning: 10,
        analysis: 10,
        creativity: 8,
        technical: 10,
        speed: 5,
        cost: 8,
        domains: ['complex_analysis', 'strategic_planning', 'research'],
        maxTokens: 32000,
        strengths: ['advanced_reasoning', 'complex_problem_solving'],
        pricing: { input: 15.00, output: 60.00 },
        apiNotes: 'Legacy reasoning model',
        hasWebSearch: false
      },
    };

    // Task complexity definitions with o3/o4-mini primary, Claude 4 backup, DeepSeek offline
    this.taskComplexity = {
      simple: {
        preferred: ['o4-mini', 'claude-4', 'deepseek-v3'],
        budget: ['o4-mini', 'deepseek-v3', 'claude-4'],
        description: 'Simple queries, data lookup, basic summaries'
      },
      moderate: {
        preferred: ['o4-mini', 'o3', 'claude-4', 'deepseek-v3'],
        budget: ['o4-mini-deep-research', 'claude-4', 'deepseek-v3'],
        description: 'Analysis, comparisons, moderate research with web search'
      },
      complex: {
        preferred: ['o3', 'o3-pro', 'o3-deep-research', 'claude-4-opus', 'deepseek-v3'],
        budget: ['o4-mini-deep-research', 'claude-4', 'deepseek-v3'],
        description: 'Deep analysis, multi-step reasoning, strategic thinking with comprehensive research'
      },
    };

    // Performance tracking for adaptive learning
    this.performanceHistory = new Map();
    this.loadBalancer = {
      claude: { requests: 0, avgResponseTime: 0 },
      openai: { requests: 0, avgResponseTime: 0 },
      ollama: { requests: 0, avgResponseTime: 0 }
    };
  }

  /**
   * Select optimal model based on task context
   */
  selectOptimalModel(taskContext, budget = 'preferred') {
    try {
      const { taskType = 'moderate', domain = 'general', urgency = 'normal', complexity = 'moderate' } = taskContext;
      
      // Map consulting task types to complexity levels
      const consultingTaskMap = {
        'partner_assessment': 'complex',
        'principal_analysis': 'complex', 
        'strategic_planning': 'complex',
        'associate_research': 'moderate',
        'financial_modeling': 'complex',
        'data_processing': 'simple',
        'report_generation': 'moderate',
        'summarization': 'simple',
        'competitive_analysis': 'moderate',
        'risk_assessment': 'complex',
        'investment_analysis': 'complex',
        'market_analysis': 'moderate'
      };
      
      // Determine complexity level
      const complexityLevel = consultingTaskMap[taskType] || complexity;
      
      // Get preferred models for this complexity
      const complexityConfig = this.taskComplexity[complexityLevel];
      if (!complexityConfig) {
        console.warn(`Unknown complexity level: ${complexityLevel}, defaulting to moderate`);
        return this.taskComplexity.moderate.preferred[0];
      }
      
      const modelList = budget === 'budget' ? complexityConfig.budget : complexityConfig.preferred;
      
      // Filter by available models
      const availableModels = modelList.filter(model => this.modelCapabilities[model]);
      
      if (availableModels.length === 0) {
        console.warn(`No available models for complexity ${complexityLevel}, using fallback`);
        return 'gpt-4o-mini'; // Safe fallback
      }
      
      // Select first available model (they're ordered by preference)
      const selectedModel = availableModels[0];
      
      console.log(`🧠 Selected model ${selectedModel} for ${taskType} (${complexityLevel} complexity)`);
      return selectedModel;
      
    } catch (error) {
      console.error('Model selection failed:', error);
      return 'gpt-4o-mini'; // Safe fallback
    }
  }

  /**
   * Enhanced AI call with intelligent routing and performance tracking
   */
  async callIntelligentAI(taskContext, prompt, options = {}) {
    const startTime = Date.now();
    
    // Validate inputs
    if (!prompt || prompt === null || prompt.trim() === '') {
      throw new Error('Prompt cannot be null, undefined, or empty');
    }
    
    if (!taskContext || !taskContext.taskType) {
      throw new Error('Task context with taskType is required');
    }
    
    const selectedModel = this.selectOptimalModel(taskContext);
    
    try {
      // Add task context to the prompt for better results
      const enhancedPrompt = this.enhancePromptWithContext(prompt, taskContext, selectedModel);
      
      // Validate enhanced prompt
      if (!enhancedPrompt || enhancedPrompt.trim() === '') {
        console.error('❌ Enhanced prompt is empty, using original prompt');
        const finalPrompt = prompt.trim();
        
        if (!finalPrompt) {
          throw new Error('Both original and enhanced prompts are empty');
        }
        
        // 🌐 PASS FUNCTION DEFINITIONS TO AI FOR INTERNET ACCESS
        const aiOptions = {
          ...options,
          functionDefinitions: options.functionDefinitions || []
        };
        
        const result = await callAI(finalPrompt, selectedModel, aiOptions);
        
        // Track performance for adaptive learning
        const responseTime = Date.now() - startTime;
        this.trackPerformance(selectedModel, taskContext.taskType, responseTime, true);
        
        return {
          ...result,
          metadata: {
            selectedModel,
            responseTime,
            taskType: taskContext.taskType,
            reasoningPath: this.explainSelection(selectedModel, taskContext),
            warning: 'Used original prompt due to enhancement failure',
            toolsAvailable: options.functionDefinitions?.length || 0
          }
        };
      }
      
      // 🌐 PASS FUNCTION DEFINITIONS TO AI FOR INTERNET ACCESS  
      const aiOptions = {
        ...options,
        functionDefinitions: options.functionDefinitions || []
      };
      
      console.log(`🔧 AI Router: Providing ${aiOptions.functionDefinitions.length} tools to ${selectedModel}`);
      
      const result = await callAI(enhancedPrompt, selectedModel, aiOptions);
      
      // Track performance for adaptive learning
      const responseTime = Date.now() - startTime;
      this.trackPerformance(selectedModel, taskContext.taskType, responseTime, true);
      
      return {
        ...result,
        metadata: {
          selectedModel,
          responseTime,
          taskType: taskContext.taskType,
          reasoningPath: this.explainSelection(selectedModel, taskContext),
          toolsUsed: aiOptions.functionDefinitions.length
        }
      };
    } catch (error) {
      console.error(`❌ AI Router failed for ${selectedModel}:`, error.message);
      return this.handleFailover(taskContext, prompt, options, error);
    }
  }

  /**
   * Handle model failover with intelligent backup selection
   */
  async handleFailover(taskContext, prompt, options, originalError) {
    // Remove the failed model temporarily and select next best
    const failedModel = this.selectOptimalModel(taskContext);
    const availableModels = Object.keys(this.modelCapabilities)
      .filter(model => model !== failedModel);
    
    if (availableModels.length === 0) {
      throw new Error(`All AI models unavailable. Original error: ${originalError.message}`);
    }

    // Select backup model with modified context (prefer speed and reliability)
    const backupContext = {
      ...taskContext,
      urgency: 'high',
      requiresSpeed: true
    };

    const backupModel = this.selectOptimalModel(backupContext);
    console.log(`🔄 Fallback to: ${backupModel}`);

    try {
      const enhancedPrompt = this.enhancePromptWithContext(prompt, taskContext, backupModel);
      const result = await callAI(enhancedPrompt, backupModel, options);
      
      return {
        ...result,
        metadata: {
          selectedModel: backupModel,
          fallbackFrom: failedModel,
          taskType: taskContext.taskType,
          reasoningPath: 'Fallback selection due to primary model failure'
        }
      };
    } catch (backupError) {
      throw new Error(`Both primary (${failedModel}) and backup (${backupModel}) models failed. Errors: ${originalError.message}, ${backupError.message}`);
    }
  }

  // Scoring functions for model selection
  scoreComplexityMatch(taskComplexity, capabilities) {
    const complexityDiff = Math.abs(taskComplexity - capabilities.reasoning);
    return Math.max(0, 10 - complexityDiff) * 2; // Weight: 2x
  }

  scoreDomainMatch(taskDomain, modelDomains) {
    return modelDomains.includes(taskDomain) ? 15 : 
           modelDomains.includes('general') ? 5 : 0; // Weight: high
  }

  scoreRequirementsMatch(taskInfo, capabilities) {
    let score = 0;
    if (taskInfo.requiresCreativity) score += capabilities.creativity;
    if (taskInfo.requiresDeepReasoning) score += capabilities.reasoning;
    return score * 0.5; // Weight: 0.5x
  }

  scoreUrgency(urgency, speed) {
    const urgencyMultiplier = { low: 0.5, normal: 1, high: 2, critical: 3 };
    return speed * (urgencyMultiplier[urgency] || 1);
  }

  scoreBudget(budget, cost) {
    const budgetScores = { 
      low: cost <= 3 ? 10 : 0,
      medium: cost <= 6 ? 8 : cost <= 8 ? 5 : 0,
      high: 8 // Any cost acceptable
    };
    return budgetScores[budget] || 5;
  }

  scoreAccuracy(requiresAccuracy, reasoning) {
    return requiresAccuracy ? reasoning * 1.5 : reasoning * 0.5;
  }

  scorePrivacy(requiresPrivacy, modelName) {
    if (!requiresPrivacy) return 0;
    return modelName.includes('llama') || modelName.includes('ollama') ? 15 : -5;
  }

  /**
   * Score models based on task-specific preferences
   * @private
   */
  scorePreferredModels(modelName, taskComplexityInfo) {
    if (!taskComplexityInfo.preferredModels) return 0;
    
    const preferredModels = taskComplexityInfo.preferredModels;
    const index = preferredModels.indexOf(modelName);
    
    if (index === -1) return 0; // Not in preferred list
    
    // Higher score for earlier models in the preference list
    const maxScore = 15; // High impact on selection
    const positionBonus = maxScore - (index * 3);
    
    console.log(`💡 ${modelName} is preferred for this task (position ${index + 1}): +${positionBonus} points`);
    return Math.max(positionBonus, 2); // Minimum 2 points for being in the list
  }

  /**
   * Score models based on budget sensitivity
   * @private
   */
  scoreBudgetSensitivity(modelName, taskComplexityInfo, budget) {
    const capabilities = this.modelCapabilities[modelName];
    if (!capabilities || !taskComplexityInfo.budgetSensitive) return 0;
    
    // If task is budget sensitive, prefer lower cost models
    const costScore = 10 - capabilities.cost; // Invert cost (lower cost = higher score)
    
    if (budget === 'low') {
      return costScore * 2; // Double the cost impact for low budget
    } else if (budget === 'medium') {
      return costScore;
    } else if (budget === 'high') {
      return costScore * 0.5; // Reduce cost impact for high budget
    }
    
    return costScore;
  }

  scorePerformanceHistory(modelName, taskType) {
    const key = `${modelName}:${taskType}`;
    const history = this.performanceHistory.get(key);
    if (!history) return 0;
    
    const successRate = history.successes / history.total;
    const avgResponseTime = history.avgResponseTime;
    
    return (successRate * 10) - (avgResponseTime / 1000); // Favor success and speed
  }

  scoreLoadBalancing(modelName) {
    const provider = this.getProviderFromModel(modelName);
    const load = this.loadBalancer[provider]?.requests || 0;
    return Math.max(0, 5 - (load * 0.1)); // Slight preference for less loaded providers
  }

  // Helper methods
  enhancePromptWithContext(prompt, taskContext, selectedModel) {
    const modelCapabilities = this.modelCapabilities[selectedModel];
    const strengths = modelCapabilities.strengths.join(', ');
    
    return `[Task: ${taskContext.taskType} | Domain: ${taskContext.domain || 'general'} | Model Strengths: ${strengths}]

${prompt}

[Please leverage your strengths in ${strengths} to provide the most accurate and insightful response possible.]`;
  }

  explainSelection(selectedModel, taskContext) {
    const capabilities = this.modelCapabilities[selectedModel];
    return `Selected ${selectedModel} for ${taskContext.taskType} due to strong ${capabilities.strengths.join(' and ')} capabilities, matching domain expertise in ${capabilities.domains.join(', ')}, and optimal balance of performance characteristics for this task complexity.`;
  }

  trackPerformance(modelName, taskType, responseTime, success) {
    const key = `${modelName}:${taskType}`;
    const current = this.performanceHistory.get(key) || {
      total: 0,
      successes: 0,
      avgResponseTime: 0,
      lastUsed: Date.now()
    };

    current.total++;
    if (success) current.successes++;
    
    // Update rolling average response time
    current.avgResponseTime = ((current.avgResponseTime * (current.total - 1)) + responseTime) / current.total;
    current.lastUsed = Date.now();
    
    this.performanceHistory.set(key, current);

    // Update load balancer stats
    const provider = this.getProviderFromModel(modelName);
    if (this.loadBalancer[provider]) {
      this.loadBalancer[provider].requests++;
      this.loadBalancer[provider].avgResponseTime = 
        ((this.loadBalancer[provider].avgResponseTime * (this.loadBalancer[provider].requests - 1)) + responseTime) / 
        this.loadBalancer[provider].requests;
    }
  }

  getProviderFromModel(modelName) {
    if (modelName.includes('claude')) return 'claude';
    if (modelName.includes('gpt') || modelName.includes('o3') || modelName.includes('o4') || modelName.includes('o1')) return 'openai';
    if (modelName.includes('deepseek')) return 'deepseek';
    if (modelName.includes('llama')) return 'ollama';
    return 'openai'; // Default to OpenAI for o-series models
  }

  // Analytics and insights
  getPerformanceInsights() {
    const insights = {
      modelPerformance: {},
      recommendations: [],
      totalRequests: 0
    };

    for (const [key, stats] of this.performanceHistory.entries()) {
      const [model, taskType] = key.split(':');
      if (!insights.modelPerformance[model]) {
        insights.modelPerformance[model] = { tasks: {}, overall: { total: 0, successes: 0, avgTime: 0 } };
      }
      
      insights.modelPerformance[model].tasks[taskType] = {
        successRate: (stats.successes / stats.total * 100).toFixed(1) + '%',
        avgResponseTime: Math.round(stats.avgResponseTime) + 'ms',
        totalRequests: stats.total
      };

      insights.modelPerformance[model].overall.total += stats.total;
      insights.modelPerformance[model].overall.successes += stats.successes;
      insights.totalRequests += stats.total;
    }

    // Generate recommendations
    if (insights.totalRequests > 10) {
      insights.recommendations.push('Sufficient data collected for intelligent routing optimization');
    }

    return insights;
  }
}

module.exports = IntelligentAIRouter; 