// Context-Aware Prompt Engineering Engine for Professional Consulting Platform
// Dynamically optimizes prompts based on task characteristics and model capabilities

class ContextAwarePromptEngine {
  constructor() {
    // Prompt templates optimized for different roles and tasks
    this.promptTemplates = {
      partner_assessment: {
        base: `As a senior consulting partner with extensive industry experience, conduct a strategic assessment of {topic}. 

Your analysis should demonstrate:
- Executive-level strategic thinking
- Market leadership insights
- Risk assessment capabilities
- Investment recommendation authority

Focus Areas:
{focus_areas}

Context: {context}

Provide a comprehensive assessment that would be suitable for C-suite presentation, including strategic implications, competitive positioning, and actionable recommendations.`,
        
        enhancers: {
          'claude-3-opus': 'Leverage your sophisticated reasoning capabilities to provide nuanced strategic insights with deep analytical depth.',
          'gpt-4': 'Apply your technical accuracy and logical reasoning to ensure all strategic recommendations are well-founded.',
          'llama3': 'Utilize your analytical capabilities to provide cost-effective strategic insights with local processing advantages.'
        }
      },

      principal_analysis: {
        base: `As a consulting principal specializing in {domain} analysis, conduct a detailed examination of {topic}.

Your analysis should include:
- Quantitative data interpretation
- Financial modeling insights
- Industry trend analysis
- Competitive benchmarking

Key Questions to Address:
{key_questions}

Data Available: {data_context}

Provide a thorough analysis with supporting data, methodological transparency, and clear findings that can guide strategic decision-making.`,

        enhancers: {
          'claude-3-opus': 'Apply your advanced analytical capabilities to uncover subtle patterns and provide comprehensive insights.',
          'claude-3-sonnet': 'Use your balanced analytical approach to provide reliable, efficient analysis with clear reasoning.',
          'gpt-4': 'Leverage your technical precision to ensure accurate data interpretation and logical conclusions.'
        }
      },

      associate_research: {
        base: `As a consulting associate, conduct comprehensive research on {topic} to support senior-level analysis.

Research Objectives:
{objectives}

Required Deliverables:
- Fact-based findings
- Data compilation and organization
- Source validation
- Preliminary insights

Research Scope: {scope}
Timeline: {timeline}

Provide well-organized, accurate research findings that will support higher-level strategic analysis and decision-making.`,

        enhancers: {
          'claude-3-haiku': 'Use your speed and efficiency to gather comprehensive research quickly and accurately.',
          'gpt-3.5-turbo': 'Apply your general-purpose capabilities to conduct thorough research efficiently.',
          'llama3': 'Utilize your research capabilities to provide comprehensive findings with cost-effective processing.'
        }
      },

      report_generation: {
        base: `Generate a professional consulting report on {topic} for {audience}.

Report Structure:
1. Executive Summary
2. Key Findings
3. Analysis and Insights
4. Recommendations
5. Implementation Roadmap

Content Requirements:
{content_requirements}

Tone: {tone}
Length: {target_length}

Create a polished, professional report that clearly communicates insights and actionable recommendations to the target audience.`,

        enhancers: {
          'claude-3-opus': 'Apply your creative and analytical strengths to produce a sophisticated, well-reasoned report.',
          'claude-3-sonnet': 'Use your balanced capabilities to create a reliable, comprehensive report with clear structure.',
          'gpt-4': 'Leverage your versatility and logical reasoning to ensure the report is technically accurate and well-organized.'
        }
      }
    };

    // Context enrichment strategies
    this.contextStrategies = {
      market_analysis: {
        dataPoints: ['market_size', 'growth_rate', 'key_players', 'trends', 'challenges'],
        frameworks: ['Porter Five Forces', 'SWOT Analysis', 'Market Segmentation'],
        considerations: ['regulatory_environment', 'technological_disruption', 'economic_factors']
      },

      financial_analysis: {
        dataPoints: ['revenue', 'profitability', 'cash_flow', 'debt_levels', 'valuation_metrics'],
        frameworks: ['DCF Analysis', 'Comparable Company Analysis', 'Financial Ratios'],
        considerations: ['accounting_standards', 'seasonal_factors', 'currency_impact']
      },

      competitive_analysis: {
        dataPoints: ['market_share', 'competitive_advantages', 'pricing_strategies', 'product_portfolio'],
        frameworks: ['Competitive Positioning', 'Value Chain Analysis', 'Game Theory'],
        considerations: ['barrier_to_entry', 'switching_costs', 'network_effects']
      }
    };

    // Performance optimization patterns
    this.optimizationPatterns = new Map();
    this.promptPerformance = new Map();
  }

  /**
   * Generate optimized prompt based on task context and target model
   */
  generateOptimizedPrompt(taskContext, targetModel, baseContent) {
    const {
      taskType,
      domain,
      complexity,
      audience,
      urgency,
      dataAvailable = [],
      specificRequirements = [],
      outputFormat = 'detailed_analysis'
    } = taskContext;

    // Get base template
    const template = this.promptTemplates[taskType];
    if (!template) {
      return this.generateGenericPrompt(taskContext, targetModel, baseContent);
    }

    // Build context-specific variables
    const promptVariables = this.buildPromptVariables(taskContext, baseContent);
    
    // Interpolate base template
    let optimizedPrompt = this.interpolateTemplate(template.base, promptVariables);
    
    // Add model-specific enhancements
    if (template.enhancers[targetModel]) {
      optimizedPrompt += `\n\n[Model Optimization]: ${template.enhancers[targetModel]}`;
    }

    // Apply context enrichment
    optimizedPrompt = this.enrichWithContext(optimizedPrompt, taskContext);
    
    // Add performance optimizations
    optimizedPrompt = this.applyPerformanceOptimizations(optimizedPrompt, taskType, targetModel);

    // Add output formatting instructions
    optimizedPrompt += this.getOutputFormatInstructions(outputFormat, audience);

    console.log(`📝 Generated optimized prompt for ${taskType} using ${targetModel}`);
    
    return optimizedPrompt;
  }

  /**
   * Build context-specific variables for prompt interpolation
   */
  buildPromptVariables(taskContext, baseContent) {
    const variables = {
      topic: baseContent.topic || taskContext.topic || 'the specified subject',
      domain: taskContext.domain || 'general business',
      context: baseContent.context || 'As requested by the client',
      audience: taskContext.audience || 'executive leadership'
    };

    // Add task-specific variables
    switch (taskContext.taskType) {
      case 'partner_assessment':
        variables.focus_areas = this.generateFocusAreas(taskContext);
        break;
        
      case 'principal_analysis':
        variables.key_questions = this.generateKeyQuestions(taskContext);
        variables.data_context = this.describeAvailableData(taskContext.dataAvailable);
        break;
        
      case 'associate_research':
        variables.objectives = this.generateResearchObjectives(taskContext);
        variables.scope = taskContext.scope || 'Comprehensive market and competitive analysis';
        variables.timeline = taskContext.timeline || 'Standard consulting timeline';
        break;
        
      case 'report_generation':
        variables.content_requirements = this.generateContentRequirements(taskContext);
        variables.tone = taskContext.tone || 'Professional and analytical';
        variables.target_length = taskContext.targetLength || 'Comprehensive report';
        break;
    }

    return variables;
  }

  /**
   * Enrich prompt with domain-specific context
   */
  enrichWithContext(prompt, taskContext) {
    const strategy = this.contextStrategies[taskContext.domain];
    if (!strategy) return prompt;

    let enrichedPrompt = prompt;

    // Add relevant frameworks
    if (strategy.frameworks && strategy.frameworks.length > 0) {
      enrichedPrompt += `\n\nRelevant Analytical Frameworks: Consider applying ${strategy.frameworks.join(', ')} as appropriate for this analysis.`;
    }

    // Add key considerations
    if (strategy.considerations && strategy.considerations.length > 0) {
      enrichedPrompt += `\n\nKey Considerations: Please factor in ${strategy.considerations.join(', ')} in your analysis.`;
    }

    // Add data point guidance
    if (strategy.dataPoints && strategy.dataPoints.length > 0) {
      enrichedPrompt += `\n\nImportant Data Points: Focus on ${strategy.dataPoints.join(', ')} where relevant and available.`;
    }

    return enrichedPrompt;
  }

  /**
   * Apply performance optimizations based on historical data
   */
  applyPerformanceOptimizations(prompt, taskType, targetModel) {
    const optimizationKey = `${taskType}:${targetModel}`;
    const patterns = this.optimizationPatterns.get(optimizationKey);
    
    if (!patterns) return prompt;

    let optimizedPrompt = prompt;

    // Apply successful patterns
    if (patterns.successfulInstructions && patterns.successfulInstructions.length > 0) {
      optimizedPrompt += `\n\n[Optimization]: ${patterns.successfulInstructions.join(' ')}`;
    }

    return optimizedPrompt;
  }

  /**
   * Get output format instructions based on requirements
   */
  getOutputFormatInstructions(format, audience) {
    const formatInstructions = {
      detailed_analysis: `\n\nOutput Format: Provide a detailed, structured analysis with clear headings, bullet points for key findings, and numbered recommendations. Ensure the analysis is suitable for ${audience} consumption.`,
      
      executive_summary: `\n\nOutput Format: Create a concise executive summary suitable for ${audience}, highlighting key insights and recommendations in a scannable format with clear action items.`,
      
      technical_report: `\n\nOutput Format: Generate a comprehensive technical report with detailed methodology, data analysis, supporting evidence, and thorough documentation suitable for ${audience} review.`,
      
      presentation_ready: `\n\nOutput Format: Structure the content to be presentation-ready for ${audience}, with clear sections that could easily be converted to slides, emphasizing visual insights and actionable takeaways.`
    };

    return formatInstructions[format] || formatInstructions.detailed_analysis;
  }

  // Helper methods for generating context-specific content
  generateFocusAreas(taskContext) {
    const defaultAreas = [
      'Strategic positioning and competitive advantage',
      'Market opportunity assessment',
      'Risk evaluation and mitigation strategies',
      'Investment implications and ROI potential'
    ];
    
    return taskContext.focusAreas?.join('\n- ') || defaultAreas.join('\n- ');
  }

  generateKeyQuestions(taskContext) {
    const defaultQuestions = [
      'What are the key financial performance indicators?',
      'How does this compare to industry benchmarks?',
      'What trends are driving performance changes?',
      'What are the primary risk factors to consider?'
    ];
    
    return taskContext.keyQuestions?.join('\n- ') || defaultQuestions.join('\n- ');
  }

  generateResearchObjectives(taskContext) {
    const defaultObjectives = [
      'Gather comprehensive market intelligence',
      'Analyze competitive landscape and positioning',
      'Identify key trends and growth drivers',
      'Compile relevant financial and operational data'
    ];
    
    return taskContext.objectives?.join('\n- ') || defaultObjectives.join('\n- ');
  }

  generateContentRequirements(taskContext) {
    const defaultRequirements = [
      'Executive-level insights and recommendations',
      'Supporting data and evidence',
      'Clear action items and next steps',
      'Professional formatting and structure'
    ];
    
    return taskContext.contentRequirements?.join('\n- ') || defaultRequirements.join('\n- ');
  }

  describeAvailableData(dataAvailable) {
    if (!dataAvailable || dataAvailable.length === 0) {
      return 'Standard publicly available information and industry reports';
    }
    
    return Array.isArray(dataAvailable) ? dataAvailable.join(', ') : dataAvailable;
  }

  /**
   * Generate generic prompt for unknown task types
   */
  generateGenericPrompt(taskContext, targetModel, baseContent) {
    const genericTemplate = `Analyze the following: ${baseContent.topic || baseContent}

Task Context:
- Type: ${taskContext.taskType}
- Domain: ${taskContext.domain || 'general'}
- Complexity: ${taskContext.complexity || 'standard'}
- Audience: ${taskContext.audience || 'professional'}

Please provide a thorough, professional analysis that addresses the key aspects of this topic and delivers actionable insights appropriate for the specified audience.`;

    return genericTemplate;
  }

  /**
   * Interpolate template with variables
   */
  interpolateTemplate(template, variables) {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  /**
   * Track prompt performance for optimization
   */
  trackPromptPerformance(taskType, targetModel, promptId, performance) {
    const key = `${taskType}:${targetModel}`;
    
    if (!this.promptPerformance.has(key)) {
      this.promptPerformance.set(key, {
        totalRequests: 0,
        successfulRequests: 0,
        avgResponseTime: 0,
        qualityScore: 0
      });
    }

    const stats = this.promptPerformance.get(key);
    stats.totalRequests++;
    
    if (performance.success) {
      stats.successfulRequests++;
    }
    
    // Update rolling averages
    stats.avgResponseTime = ((stats.avgResponseTime * (stats.totalRequests - 1)) + performance.responseTime) / stats.totalRequests;
    
    if (performance.qualityScore) {
      stats.qualityScore = ((stats.qualityScore * (stats.totalRequests - 1)) + performance.qualityScore) / stats.totalRequests;
    }

    this.promptPerformance.set(key, stats);

    // Learn optimization patterns
    if (performance.success && performance.qualityScore > 8) {
      this.learnOptimizationPattern(taskType, targetModel, promptId, performance);
    }
  }

  /**
   * Learn optimization patterns from successful prompts
   */
  learnOptimizationPattern(taskType, targetModel, promptId, performance) {
    const optimizationKey = `${taskType}:${targetModel}`;
    
    if (!this.optimizationPatterns.has(optimizationKey)) {
      this.optimizationPatterns.set(optimizationKey, {
        successfulInstructions: [],
        failurePatterns: [],
        bestPractices: []
      });
    }

    // Extract successful patterns (this would be more sophisticated in practice)
    if (performance.qualityScore > 9) {
      const patterns = this.optimizationPatterns.get(optimizationKey);
      if (!patterns.successfulInstructions.includes(performance.instruction)) {
        patterns.successfulInstructions.push(performance.instruction);
      }
    }
  }

  /**
   * Get performance analytics
   */
  getPromptAnalytics() {
    const analytics = {
      taskPerformance: {},
      modelEfficiency: {},
      recommendations: []
    };

    for (const [key, stats] of this.promptPerformance.entries()) {
      const [taskType, model] = key.split(':');
      
      if (!analytics.taskPerformance[taskType]) {
        analytics.taskPerformance[taskType] = {};
      }
      
      analytics.taskPerformance[taskType][model] = {
        successRate: `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`,
        avgResponseTime: `${Math.round(stats.avgResponseTime)}ms`,
        qualityScore: stats.qualityScore.toFixed(1),
        totalRequests: stats.totalRequests
      };
    }

    // Generate recommendations
    analytics.recommendations = this.generateOptimizationRecommendations();

    return analytics;
  }

  generateOptimizationRecommendations() {
    const recommendations = [];
    
    for (const [key, stats] of this.promptPerformance.entries()) {
      const [taskType, model] = key.split(':');
      const successRate = stats.successfulRequests / stats.totalRequests;
      
      if (successRate < 0.8 && stats.totalRequests > 5) {
        recommendations.push(`Consider optimizing prompts for ${taskType} tasks using ${model} - current success rate: ${(successRate * 100).toFixed(1)}%`);
      }
      
      if (stats.avgResponseTime > 10000 && stats.totalRequests > 3) {
        recommendations.push(`${model} response times for ${taskType} tasks are high (${Math.round(stats.avgResponseTime)}ms) - consider model optimization or task decomposition`);
      }
    }

    return recommendations;
  }
}

module.exports = ContextAwarePromptEngine; 