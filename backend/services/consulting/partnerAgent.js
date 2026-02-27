'use strict';

const teamCollaborationService = require('../teamCollaborationService');

/**
 * PartnerAgent - Handles sophisticated client interaction and requirements gathering
 * Acts as the senior consultant who understands business context and client needs
 */
class PartnerAgent {
  constructor(config = {}, aiRouter = null, promptEngine = null) {
    this.maxClarificationRounds = config.maxClarificationRounds || 3;
    this.requirementsTemplate = config.requirementsTemplate || 'standard';
    this.consultingStyle = config.consultingStyle || 'professional';
    
    // 🧠 AI Intelligence Integration (Phase 2)
    this.aiRouter = aiRouter;
    this.promptEngine = promptEngine;
    
    // Consulting expertise areas
    this.expertiseAreas = [
      'strategic_planning', 'market_analysis', 'technical_assessment',
      'organizational_change', 'financial_analysis', 'operational_optimization',
      'digital_transformation', 'mergers_acquisitions'
    ];
  }

  /**
   * Gather detailed requirements from client request
   */
  async gatherRequirements(clientRequest, onUpdate) {
    if (!clientRequest || typeof clientRequest !== 'object') {
      if (onUpdate) {
        onUpdate({
          phase: 'error',
          message: 'Invalid client request provided'
        });
      }
      throw new Error('Invalid client request');
    }

    if (onUpdate) {
      onUpdate({
        phase: 'requirements_analysis',
        message: 'Partner analyzing your request and business context...'
      });
    }

    try {
      // Analyze the client request using AI
      const analysisPrompt = this.buildRequirementsAnalysisPrompt(clientRequest);
      const response = await this.getAIAnalysis(analysisPrompt);
      
      // Parse and structure the requirements
      const structuredRequirements = this.parseRequirementsResponse(response, clientRequest);
      
      // Validate and enrich requirements
      const enrichedRequirements = await this.enrichRequirements(structuredRequirements, clientRequest);
      
      if (onUpdate) {
        onUpdate({
          phase: 'requirements_complete',
          message: 'Requirements analysis complete',
          requirementsQuality: enrichedRequirements.clarificationNeeded ? 'needs_clarification' : 'clear'
        });
      }

      return enrichedRequirements;

    } catch (error) {
      console.error('Error gathering requirements:', error);
      
      if (onUpdate) {
        onUpdate({
          phase: 'error',
          message: 'Failed to analyze requirements',
          error: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Clarify scope and constraints with follow-up questions
   */
  async clarifyScope(initialRequirements, onUpdate) {
    if (onUpdate) {
      onUpdate({
        phase: 'scope_clarification',
        message: 'Partner analyzing scope and identifying clarification needs...'
      });
    }

    try {
      const clarificationPrompt = this.buildScopeClarificationPrompt(initialRequirements);
      const response = await this.getAIAnalysis(clarificationPrompt);
      
      const clarificationResult = this.parseClarificationResponse(response, initialRequirements);
      
      if (onUpdate) {
        onUpdate({
          phase: 'clarification_complete',
          message: 'Scope clarification analysis complete',
          clarificationCount: clarificationResult.clarificationQuestions?.length || 0
        });
      }

      return clarificationResult;

    } catch (error) {
      console.error('Error clarifying scope:', error);
      throw error;
    }
  }

  /**
   * Validate final deliverables meet client expectations
   */
  async validateDeliverables(finalReport) {
    try {
      const validationPrompt = this.buildDeliverableValidationPrompt(finalReport);
      const response = await this.getAIAnalysis(validationPrompt);
      
      const validationResult = this.parseValidationResponse(response, finalReport);
      
      return validationResult;

    } catch (error) {
      console.error('Error validating deliverables:', error);
      throw error;
    }
  }

  /**
   * Build requirements analysis prompt for AI
   * @private
   */
  buildRequirementsAnalysisPrompt(clientRequest) {
    return `As a senior consulting partner, analyze this client request and structure detailed requirements:

CLIENT REQUEST:
Query: ${clientRequest.query || 'Not specified'}
Context: ${clientRequest.context || 'Limited context provided'}
Expected Deliverables: ${Array.isArray(clientRequest.expectedDeliverables) ? clientRequest.expectedDeliverables.join(', ') : clientRequest.expectedDeliverables || 'Not specified'}
Timeframe: ${clientRequest.timeframe || 'Not specified'}
Budget: ${clientRequest.budget || 'Not specified'}
Stakeholders: ${Array.isArray(clientRequest.stakeholders) ? clientRequest.stakeholders.join(', ') : clientRequest.stakeholders || 'Not specified'}
Urgency: ${clientRequest.urgency || 'Normal'}

REQUIREMENTS ANALYSIS:
Please provide a structured analysis including:

1. CONSULTING TYPE: Identify the type of consulting (strategic_planning, market_analysis, technical_assessment, etc.)
2. SCOPE: Clear statement of what needs to be accomplished
3. OBJECTIVES: Specific, measurable objectives (array)
4. CONSTRAINTS: Timeline, budget, resource, and other constraints (array)
5. SUCCESS CRITERIA: How success will be measured (array)
6. COMPLEXITY: High/Medium/Low complexity assessment
7. ESTIMATED EFFORT: Rough time estimate
8. TARGET AUDIENCE: Who are the end beneficiaries
9. DELIVERABLE FORMAT: Preferred format for deliverables
10. KEY STAKEHOLDERS: People who need to be involved (array)
11. FEASIBILITY WARNING: True if timeline/budget seems unrealistic
12. CONSTRAINT ISSUES: Specific constraint problems (array)
13. SUGGESTED ALTERNATIVES: Alternative approaches if constrained (array)
14. CLARIFICATION NEEDED: True if request is too vague
15. SUGGESTED QUESTIONS: Clarification questions needed (array)
16. TECHNICAL CONTEXT: If technical, extract platform/scale/infrastructure details

Respond with a JSON object containing these fields. Be thorough and professional.`;
  }

  /**
   * Build scope clarification prompt for AI
   * @private
   */
  buildScopeClarificationPrompt(requirements) {
    return `As a senior consulting partner, analyze these initial requirements and provide clarification guidance:

CURRENT REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

CLARIFICATION ANALYSIS:
Please provide:

1. CLARIFICATION QUESTIONS: Array of specific questions to ask, each with:
   - question: The actual question text
   - category: Type of clarification (scope, budget, timeline, technical, stakeholders)
   - priority: High/Medium/Low priority

2. SUGGESTED REFINEMENTS: Improvements to make scope clearer (array)

3. RISK AREAS: Potential issues or ambiguities (array)

4. SCOPE CREEP RISK: High/Medium/Low risk assessment

5. RECOMMENDED SCOPE: Refined scope statement if current is too broad

6. PRIORITIZED OBJECTIVES: Reordered objectives by importance (array)

7. TECHNICAL FEASIBILITY: High/Medium/Low if technical project

8. REQUIRED CAPABILITIES: Skills/resources needed (array)

9. RECOMMENDED APPROACH: Suggested methodology or approach

Respond with a JSON object. Focus on reducing ambiguity and ensuring project success.`;
  }

  /**
   * Build deliverable validation prompt for AI
   * @private
   */
  buildDeliverableValidationPrompt(finalReport) {
    return `As a senior consulting partner, validate these project deliverables for client readiness:

FINAL REPORT:
${JSON.stringify(finalReport, null, 2)}

VALIDATION ASSESSMENT:
Please evaluate:

1. APPROVED: True/False - Are deliverables ready for client?
2. QUALITY ASSESSMENT: Excellent/Good/Adequate/Poor
3. CLIENT READINESS: True/False - Ready for client presentation?
4. FEEDBACK: Overall assessment comment
5. QUALITY ISSUES: Specific problems found (array)
6. COMPLETENESS ISSUES: Missing elements (array)
7. REQUIRED IMPROVEMENTS: What needs to be fixed (array)
8. RESUBMISSION GUIDANCE: How to improve deliverables
9. BUSINESS VALUE: High/Medium/Low value assessment
10. ACTIONABILITY: Are recommendations actionable?

Focus on:
- Executive summary clarity and impact
- Deliverable depth and quality
- Recommendation practicality
- Supporting data adequacy
- Professional presentation standard

Respond with a JSON object.`;
  }

  /**
   * Get AI analysis using the existing team collaboration service WITH INTERNET ACCESS
   * @private
   */
  async getAIAnalysis(prompt) {
    try {
      // Create a strategic avatar for analysis (equivalent to Partner-level thinking)
      const strategicAvatar = {
        id: 'partner_analysis',
        name: 'Senior Partner',
        modelCategory: 'Strategic',
        role: 'Senior Consulting Partner',
        description: 'Expert in business analysis and client requirements gathering with real-time data access',
        skills: ['Strategic Analysis', 'Client Relations', 'Business Development', 'Requirements Gathering', 'Real-time Data Access']
      };

      // 🌐 ENABLE INTERNET ACCESS: Get function definitions for real data
      const mcpBridge = require('../mcpBridge');
      const functionDefinitions = mcpBridge.getFunctionDefinitions();
      
      console.log(`🌐 PARTNER AGENT: Enabled ${functionDefinitions.length} internet tools for requirements analysis`);

      // Use team collaboration service for AI analysis WITH INTERNET ACCESS
      const result = await teamCollaborationService.orchestrateCollaboration({
        message: prompt,
        activeAvatars: [strategicAvatar],
        chatHistory: [],
        onUpdate: null,
        selectedFiles: [],
        functionDefinitions: functionDefinitions // 🌐 INTERNET ACCESS FOR PARTNER ANALYSIS
      });

      if (result && result.responses && result.responses.length > 0 && result.responses[0]) {
        console.log(`✅ PARTNER AGENT: Got AI analysis: ${result.responses[0].response.length} chars`);
        return result.responses[0].response;
      } else {
        throw new Error('No response from AI analysis');
      }

    } catch (error) {
      console.error('❌ PARTNER AGENT: AI analysis failed:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Parse requirements response from AI
   * @private
   */
  parseRequirementsResponse(response, originalRequest) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackRequirements(originalRequest);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure all required fields are present
      return {
        consultingType: parsed.consultingType || this.inferConsultingType(originalRequest.query),
        scope: parsed.scope || originalRequest.query || 'Business consulting engagement',
        objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [parsed.scope || 'Complete the requested analysis'],
        constraints: Array.isArray(parsed.constraints) ? parsed.constraints : this.extractConstraints(originalRequest),
        successCriteria: Array.isArray(parsed.successCriteria) ? parsed.successCriteria : ['Deliverables meet client expectations'],
        complexity: parsed.complexity || 'medium',
        estimatedEffort: parsed.estimatedEffort || '2-4 weeks',
        targetAudience: parsed.targetAudience || 'Business stakeholders',
        deliverableFormat: parsed.deliverableFormat || 'Professional report with executive summary',
        keyStakeholders: Array.isArray(parsed.keyStakeholders) ? parsed.keyStakeholders : ['Client leadership team'],
        feasibilityWarning: parsed.feasibilityWarning || false,
        constraintIssues: Array.isArray(parsed.constraintIssues) ? parsed.constraintIssues : [],
        suggestedAlternatives: Array.isArray(parsed.suggestedAlternatives) ? parsed.suggestedAlternatives : [],
        clarificationNeeded: parsed.clarificationNeeded || false,
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
        technicalContext: parsed.technicalContext || {}
      };

    } catch (error) {
      console.warn('Failed to parse requirements response, using fallback:', error);
      return this.createFallbackRequirements(originalRequest);
    }
  }

  /**
   * Parse clarification response from AI
   * @private
   */
  parseClarificationResponse(response, requirements) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackClarification(requirements);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        clarificationQuestions: Array.isArray(parsed.clarificationQuestions) ? parsed.clarificationQuestions : [],
        suggestedRefinements: Array.isArray(parsed.suggestedRefinements) ? parsed.suggestedRefinements : [],
        riskAreas: Array.isArray(parsed.riskAreas) ? parsed.riskAreas : [],
        scopeCreepRisk: parsed.scopeCreepRisk || 'medium',
        recommendedScope: parsed.recommendedScope || requirements.scope,
        prioritizedObjectives: Array.isArray(parsed.prioritizedObjectives) ? parsed.prioritizedObjectives : requirements.objectives,
        technicalFeasibility: parsed.technicalFeasibility || 'medium',
        requiredCapabilities: Array.isArray(parsed.requiredCapabilities) ? parsed.requiredCapabilities : [],
        recommendedApproach: parsed.recommendedApproach || 'Standard consulting methodology'
      };

    } catch (error) {
      console.warn('Failed to parse clarification response, using fallback:', error);
      return this.createFallbackClarification(requirements);
    }
  }

  /**
   * Parse validation response from AI
   * @private
   */
  parseValidationResponse(response, finalReport) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackValidation(finalReport);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        approved: parsed.approved !== false, // Default to true unless explicitly false
        qualityAssessment: parsed.qualityAssessment || 'good',
        clientReadiness: parsed.clientReadiness !== false,
        feedback: parsed.feedback || 'Deliverables meet all requirements and are ready for client presentation',
        qualityIssues: Array.isArray(parsed.qualityIssues) ? parsed.qualityIssues : [],
        completenessIssues: Array.isArray(parsed.completenessIssues) ? parsed.completenessIssues : [],
        requiredImprovements: Array.isArray(parsed.requiredImprovements) ? parsed.requiredImprovements : [],
        resubmissionGuidance: parsed.resubmissionGuidance || '',
        businessValue: parsed.businessValue || 'high',
        actionability: parsed.actionability !== false
      };

    } catch (error) {
      console.warn('Failed to parse validation response, using fallback:', error);
      return this.createFallbackValidation(finalReport);
    }
  }

  /**
   * Create fallback requirements if AI parsing fails
   * @private
   */
  createFallbackRequirements(originalRequest) {
    const isVague = !originalRequest.query || originalRequest.query.length < 30;
    
    return {
      consultingType: this.inferConsultingType(originalRequest.query),
      scope: originalRequest.query || 'Business consulting engagement',
      objectives: ['Complete requested analysis', 'Provide actionable recommendations'],
      constraints: this.extractConstraints(originalRequest),
      successCriteria: ['Client satisfaction', 'Actionable deliverables'],
      complexity: 'medium',
      estimatedEffort: '2-4 weeks',
      targetAudience: 'Business stakeholders',
      deliverableFormat: 'Professional report',
      keyStakeholders: ['Client leadership team'],
      feasibilityWarning: this.checkFeasibilityWarning(originalRequest),
      constraintIssues: this.identifyConstraintIssues(originalRequest),
      suggestedAlternatives: [],
      clarificationNeeded: isVague,
      suggestedQuestions: isVague ? ['What specific outcomes are you looking for?', 'What is your target timeline?', 'What is your budget range?'] : [],
      technicalContext: this.extractTechnicalContext(originalRequest)
    };
  }

  /**
   * Create fallback clarification if AI parsing fails
   * @private
   */
  createFallbackClarification(requirements) {
    return {
      clarificationQuestions: [
        { question: 'What specific outcomes are most important to you?', category: 'scope', priority: 'high' },
        { question: 'Are there any constraints we should be aware of?', category: 'constraints', priority: 'medium' }
      ],
      suggestedRefinements: ['Clarify success metrics', 'Define deliverable format'],
      riskAreas: ['Scope ambiguity', 'Timeline constraints'],
      scopeCreepRisk: 'medium',
      recommendedScope: requirements.scope,
      prioritizedObjectives: requirements.objectives,
      technicalFeasibility: 'medium',
      requiredCapabilities: ['Business analysis', 'Strategic thinking'],
      recommendedApproach: 'Collaborative consulting methodology'
    };
  }

  /**
   * Create fallback validation if AI parsing fails
   * @private
   */
  createFallbackValidation(finalReport) {
    const qualityScore = finalReport.qualityScore || 0.8;
    const hasRecommendations = !!(finalReport.recommendations && finalReport.recommendations.length > 0);
    const hasExecutiveSummary = !!(finalReport.executiveSummary && finalReport.executiveSummary.length > 50);
    
    const approved = qualityScore >= 0.7 && hasRecommendations && hasExecutiveSummary;
    
    return {
      approved,
      qualityAssessment: qualityScore >= 0.9 ? 'excellent' : qualityScore >= 0.7 ? 'good' : 'poor',
      clientReadiness: approved,
      feedback: approved ? 'Deliverables meet all requirements and are ready for client presentation' : 'Deliverables need improvement before client presentation',
      qualityIssues: approved ? [] : ['Insufficient depth in analysis', 'Missing supporting data'],
      completenessIssues: !hasRecommendations ? ['Missing recommendations section'] : [],
      requiredImprovements: approved ? [] : ['Enhance analysis depth', 'Add more supporting data'],
      resubmissionGuidance: approved ? '' : 'Please strengthen the analysis and ensure all deliverables meet quality standards',
      businessValue: 'high',
      actionability: hasRecommendations
    };
  }

  /**
   * Helper methods for fallback logic
   * @private
   */
  inferConsultingType(query) {
    if (!query) return 'general_consulting';
    
    const queryLower = query.toLowerCase();
    if (queryLower.includes('strategy') || queryLower.includes('strategic')) return 'strategic_planning';
    if (queryLower.includes('market') || queryLower.includes('competitive')) return 'market_analysis';
    if (queryLower.includes('technical') || queryLower.includes('architecture')) return 'technical_assessment';
    if (queryLower.includes('acquire') || queryLower.includes('merger')) return 'mergers_acquisitions';
    if (queryLower.includes('organization') || queryLower.includes('change')) return 'organizational_change';
    
    return 'general_consulting';
  }

  extractConstraints(request) {
    const constraints = [];
    if (request.timeframe) constraints.push(`Timeline: ${request.timeframe}`);
    if (request.budget) constraints.push(`Budget: ${request.budget}`);
    if (request.urgency) constraints.push(`Urgency: ${request.urgency}`);
    return constraints.length > 0 ? constraints : ['Standard timeline and budget'];
  }

  checkFeasibilityWarning(request) {
    // Check for obvious feasibility issues
    const timeframe = request.timeframe?.toLowerCase() || '';
    const query = request.query?.toLowerCase() || '';
    
    if ((timeframe.includes('week') || timeframe.includes('day')) && 
        (query.includes('comprehensive') || query.includes('complete') || query.includes('transformation'))) {
      return true;
    }
    
    return false;
  }

  identifyConstraintIssues(request) {
    const issues = [];
    
    if (this.checkFeasibilityWarning(request)) {
      issues.push('Timeline may be too aggressive for scope');
    }
    
    if (request.budget && request.budget.includes('$') && parseInt(request.budget.replace(/\D/g, '')) < 10000 && 
        request.query?.includes('comprehensive')) {
      issues.push('Budget may be insufficient for comprehensive analysis');
    }
    
    return issues;
  }

  extractTechnicalContext(request) {
    const context = {};
    const contextStr = (request.context || '') + ' ' + (request.query || '');
    
    if (contextStr.includes('Node.js')) context.platform = 'Node.js platform';
    if (contextStr.includes('AWS')) context.infrastructure = 'AWS cloud infrastructure';
    if (contextStr.match(/\d+M?\+?\s*(users|customers)/i)) {
      const match = contextStr.match(/(\d+M?\+?)\s*(users|customers)/i);
      context.scale = `${match[1]} users`;
    }
    
    return context;
  }

  /**
   * Enrich requirements with additional analysis
   * @private
   */
  async enrichRequirements(requirements, originalRequest) {
    // Add urgency assessment
    if (originalRequest.urgency === 'high' || originalRequest.timeframe?.includes('urgent')) {
      requirements.urgency = 'high';
    }
    
    // Add stakeholder insights
    if (originalRequest.stakeholders) {
      requirements.keyStakeholders = Array.isArray(originalRequest.stakeholders) 
        ? originalRequest.stakeholders 
        : [originalRequest.stakeholders];
    }
    
    return requirements;
  }
}

module.exports = PartnerAgent; 