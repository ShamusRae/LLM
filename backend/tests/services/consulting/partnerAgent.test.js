const PartnerAgent = require('../../../services/consulting/partnerAgent');

// Mock dependencies
jest.mock('../../../services/teamCollaborationService', () => ({
  orchestrateCollaboration: jest.fn()
}));

const teamCollaborationService = require('../../../services/teamCollaborationService');

describe('PartnerAgent', () => {
  let partnerAgent;
  let mockOnUpdate;

  beforeEach(() => {
    jest.clearAllMocks();
    partnerAgent = new PartnerAgent();
    mockOnUpdate = jest.fn();
    
    // Setup default AI response mock to simulate failures/unparseable responses
    // This forces tests to use fallback logic, which is more realistic for robust testing
    teamCollaborationService.orchestrateCollaboration.mockResolvedValue({
      responses: [{
        response: 'No JSON here at all - just plain text that cannot be parsed'
      }]
    });
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(partnerAgent).toBeDefined();
      expect(partnerAgent.maxClarificationRounds).toBe(3);
      expect(partnerAgent.requirementsTemplate).toBe('standard');
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        maxClarificationRounds: 5,
        requirementsTemplate: 'detailed',
        consultingStyle: 'strategic'
      };

      const customAgent = new PartnerAgent(customConfig);
      expect(customAgent.maxClarificationRounds).toBe(5);
      expect(customAgent.requirementsTemplate).toBe('detailed');
      expect(customAgent.consultingStyle).toBe('strategic');
    });
  });

  describe('gatherRequirements', () => {
    it('should successfully gather requirements from a clear client request', async () => {
      const clientRequest = {
        query: 'I need a comprehensive market analysis for launching a fintech startup targeting SMB businesses',
        context: 'Financial services, B2B SaaS, targeting companies with 10-500 employees',
        expectedDeliverables: ['market size analysis', 'competitive landscape', 'go-to-market strategy'],
        timeframe: '2-3 weeks',
        budget: '$50,000 consulting budget'
      };

      const result = await partnerAgent.gatherRequirements(clientRequest, mockOnUpdate);

      // Test that it extracts information correctly (using fallback logic)
      expect(result).toMatchObject({
        scope: expect.stringContaining('market analysis'),
        consultingType: expect.any(String),
        objectives: expect.any(Array),
        constraints: expect.arrayContaining([
          expect.stringContaining('2-3 weeks'),
          expect.stringContaining('$50,000')
        ]),
        successCriteria: expect.any(Array),
        deliverableFormat: expect.any(String)
      });

      expect(result.objectives.length).toBeGreaterThan(0);
      expect(result.constraints.length).toBeGreaterThan(0);

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'requirements_analysis',
          message: expect.stringContaining('analyzing')
        })
      );
    });

    it('should handle vague requests by asking clarifying questions', async () => {
      const vagueRequest = {
        query: 'I need help with my business',
        context: 'startup',
        timeframe: 'soon'
      };

      const result = await partnerAgent.gatherRequirements(vagueRequest, mockOnUpdate);

      // Should identify vague requests and suggest clarification
      expect(result).toMatchObject({
        scope: expect.any(String),
        objectives: expect.any(Array),
        constraints: expect.any(Array),
        clarificationNeeded: true,
        suggestedQuestions: expect.any(Array)
      });

      // Should have suggested questions for clarification
      expect(result.suggestedQuestions.length).toBeGreaterThan(0);
      
      // Questions should end with question marks
      result.suggestedQuestions.forEach(q => {
        expect(q).toMatch(/\?$/);
      });

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'requirements_complete',
          requirementsQuality: 'needs_clarification'
        })
      );
    });

    it('should identify different consulting types correctly', async () => {
      const strategicRequest = {
        query: 'We need a comprehensive strategic plan for market expansion into Europe',
        context: 'Enterprise SaaS company, 500 employees, $50M ARR',
        timeframe: '6 months'
      };

      const result = await partnerAgent.gatherRequirements(strategicRequest, mockOnUpdate);

      // Should identify this as strategic planning based on keywords
      expect(result.consultingType).toBe('strategic_planning');
      expect(result.scope).toContain('strategic plan');
      expect(result.constraints).toContain('Timeline: 6 months');
    });

    it('should handle technical requests appropriately', async () => {
      const technicalRequest = {
        query: 'Our application performance is degrading and we need an architecture review',
        context: 'Node.js microservices, 1M+ users, AWS infrastructure',
        urgency: 'high'
      };

      const result = await partnerAgent.gatherRequirements(technicalRequest, mockOnUpdate);

      expect(result).toMatchObject({
        consultingType: 'technical_assessment',
        scope: expect.stringContaining('architecture review'),
        urgency: 'high',
        technicalContext: expect.objectContaining({
          platform: expect.stringContaining('Node.js'),
          scale: expect.stringContaining('1M+'),
          infrastructure: expect.stringContaining('AWS')
        })
      });
    });

    it('should validate budget and timeline constraints', async () => {
      const constrainedRequest = {
        query: 'Complete business transformation consulting',
        context: 'Small business, 25 employees',
        timeframe: '1 week',
        budget: '$5,000'
      };

      const result = await partnerAgent.gatherRequirements(constrainedRequest, mockOnUpdate);

      expect(result).toMatchObject({
        feasibilityWarning: true,
        constraintIssues: expect.arrayContaining([
          expect.stringContaining('Timeline may be too aggressive')
        ]),
        suggestedAlternatives: expect.any(Array)
      });
    });

    it('should handle error cases gracefully', async () => {
      const invalidRequest = null;

      await expect(partnerAgent.gatherRequirements(invalidRequest, mockOnUpdate))
        .rejects.toThrow('Invalid client request');

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'error',
          message: expect.stringContaining('Invalid')
        })
      );
    });
  });

  describe('clarifyScope', () => {
    const baseRequirements = {
      scope: 'Market analysis',
      objectives: ['Understanding market size'],
      constraints: ['Limited budget']
    };

    it('should provide targeted clarification questions', async () => {
      const result = await partnerAgent.clarifyScope(baseRequirements, mockOnUpdate);

      expect(result).toMatchObject({
        clarificationQuestions: expect.arrayContaining([
          expect.objectContaining({
            question: expect.stringContaining('?'),
            category: expect.any(String),
            priority: expect.any(String)
          })
        ]),
        suggestedRefinements: expect.any(Array),
        riskAreas: expect.any(Array)
      });
    });

    it('should identify scope creep risks', async () => {
      const broadRequirements = {
        scope: 'Complete business strategy including market analysis, competitive assessment, financial planning, and operational optimization',
        objectives: ['Everything related to business growth'],
        constraints: ['2 weeks', '$10,000']
      };

      const result = await partnerAgent.clarifyScope(broadRequirements, mockOnUpdate);

      expect(result).toMatchObject({
        scopeCreepRisk: 'medium',
        recommendedScope: expect.any(String),
        prioritizedObjectives: expect.any(Array)
      });
    });

    it('should validate technical feasibility', async () => {
      const technicalRequirements = {
        scope: 'AI system implementation',
        objectives: ['Deploy machine learning model'],
        constraints: ['No technical team', '1 week delivery']
      };

      const result = await partnerAgent.clarifyScope(technicalRequirements, mockOnUpdate);

      expect(result).toMatchObject({
        technicalFeasibility: 'medium',
        requiredCapabilities: expect.any(Array),
        recommendedApproach: expect.any(String)
      });
    });
  });

  describe('validateDeliverables', () => {
    it('should validate high-quality deliverables', async () => {
      const excellentReport = {
        executiveSummary: 'Comprehensive 500-word summary with clear recommendations',
        deliverables: [
          { title: 'Market Analysis', content: 'Detailed 20-page analysis with data sources', qualityScore: 0.95 },
          { title: 'Competitive Assessment', content: 'Thorough competitor analysis with SWOT', qualityScore: 0.92 }
        ],
        qualityScore: 0.94,
        recommendations: [
          'Enter European market through partnerships',
          'Focus on mid-market segment initially',
          'Invest in localization capabilities'
        ],
        supportingData: {
          marketSizeData: true,
          competitorProfiles: true,
          financialProjections: true
        }
      };

      const result = await partnerAgent.validateDeliverables(excellentReport);

      expect(result).toMatchObject({
        approved: true,
        qualityAssessment: 'excellent',
        clientReadiness: true,
        feedback: 'Deliverables meet all requirements and are ready for client presentation'
      });
    });

    it('should identify quality issues in deliverables', async () => {
      const poorReport = {
        executiveSummary: 'Brief summary.',
        deliverables: [
          { title: 'Analysis', content: 'Short analysis', qualityScore: 0.45 },
          { title: 'Recommendations', content: 'Basic recommendations', qualityScore: 0.38 }
        ],
        qualityScore: 0.42,
        recommendations: ['Do something', 'Try harder']
      };

      const result = await partnerAgent.validateDeliverables(poorReport);

      expect(result).toMatchObject({
        approved: false,
        qualityIssues: expect.arrayContaining([
          'Insufficient depth in analysis',
          'Missing supporting data'
        ]),
        requiredImprovements: expect.any(Array),
        resubmissionGuidance: expect.any(String)
      });
    });

    it('should check deliverable completeness', async () => {
      const incompleteReport = {
        executiveSummary: 'Good summary with clear insights',
        deliverables: [
          { title: 'Market Analysis', content: 'Excellent analysis', qualityScore: 0.91 }
          // Missing competitive analysis and other expected deliverables
        ],
        qualityScore: 0.91
        // Missing recommendations (this should make approved = false)
      };

      const result = await partnerAgent.validateDeliverables(incompleteReport);

      expect(result).toMatchObject({
        approved: false,
        completenessIssues: ['Missing recommendations section']
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete requirements gathering workflow', async () => {
      const clientRequest = {
        query: 'Help us decide whether to acquire a competitor or build competing features internally',
        context: 'B2B SaaS, $10M ARR, considering acquisition of $2M ARR competitor',
        timeframe: '6 weeks',
        stakeholders: ['CEO', 'CTO', 'Head of Product'],
        budget: 'flexible for strategic decision'
      };

      // Step 1: Gather requirements
      const requirements = await partnerAgent.gatherRequirements(clientRequest, mockOnUpdate);
      
      expect(requirements.consultingType).toBe('mergers_acquisitions'); // Because the query contains 'acquire'
      expect(requirements.complexity).toBe('medium'); // Fallback default

      // Step 2: Clarify scope
      const clarification = await partnerAgent.clarifyScope(requirements, mockOnUpdate);
      
      // Should have clarification questions
      expect(clarification.clarificationQuestions).toBeDefined();
      expect(Array.isArray(clarification.clarificationQuestions)).toBe(true);

      // Step 3: Validate deliverables (simulated excellent outcome)
      const finalReport = {
        executiveSummary: 'Strategic recommendation: Acquire competitor for strategic market position',
        deliverables: [
          { title: 'Financial Analysis', content: 'Detailed DCF and ROI analysis', qualityScore: 0.93 },
          { title: 'Strategic Assessment', content: 'Market positioning analysis', qualityScore: 0.89 },
          { title: 'Integration Plan', content: 'Post-acquisition integration roadmap', qualityScore: 0.91 }
        ],
        qualityScore: 0.91,
        recommendations: ['Proceed with acquisition', 'Focus on customer retention', 'Integrate engineering teams']
      };

      const validation = await partnerAgent.validateDeliverables(finalReport);
      expect(validation.approved).toBe(true);
      expect(validation.clientReadiness).toBe(true);
    });
  });
}); 