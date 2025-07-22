const ConsultingOrchestrator = require('../../../services/consulting/consultingOrchestrator');
const PartnerAgent = require('../../../services/consulting/partnerAgent');
const PrincipalAgent = require('../../../services/consulting/principalAgent');
const AssociatePool = require('../../../services/consulting/associatePool');

// Mock the dependencies
jest.mock('../../../services/consulting/partnerAgent');
jest.mock('../../../services/consulting/principalAgent');
jest.mock('../../../services/consulting/associatePool');

describe('ConsultingOrchestrator', () => {
  let orchestrator;
  let mockPartnerAgent;
  let mockPrincipalAgent;
  let mockAssociatePool;
  let mockOnUpdate;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockPartnerAgent = {
      gatherRequirements: jest.fn(),
      clarifyScope: jest.fn(),
      validateDeliverables: jest.fn()
    };
    
    mockPrincipalAgent = {
      analyzeRequirements: jest.fn(),
      createWorkModules: jest.fn(),
      coordinateExecution: jest.fn(),
      integrateDeliverables: jest.fn()
    };
    
    mockAssociatePool = {
      assignWorkModule: jest.fn(),
      getAvailableSpecialists: jest.fn(),
      monitorProgress: jest.fn(),
      collectDeliverables: jest.fn()
    };
    
    mockOnUpdate = jest.fn();
    
    // Setup constructor mocks
    PartnerAgent.mockImplementation(() => mockPartnerAgent);
    PrincipalAgent.mockImplementation(() => mockPrincipalAgent);
    AssociatePool.mockImplementation(() => mockAssociatePool);
    
    orchestrator = new ConsultingOrchestrator();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.maxProjectDuration).toBe(8 * 60 * 60 * 1000); // 8 hours
      expect(orchestrator.qualityThreshold).toBe(0.85);
      expect(orchestrator.maxWorkModules).toBe(12);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        maxProjectDuration: 4 * 60 * 60 * 1000, // 4 hours
        qualityThreshold: 0.9,
        maxWorkModules: 8
      };
      
      const customOrchestrator = new ConsultingOrchestrator(customConfig);
      expect(customOrchestrator.maxProjectDuration).toBe(customConfig.maxProjectDuration);
      expect(customOrchestrator.qualityThreshold).toBe(customConfig.qualityThreshold);
      expect(customOrchestrator.maxWorkModules).toBe(customConfig.maxWorkModules);
    });
  });

  describe('startConsultingProject', () => {
    const mockClientRequest = {
      query: 'I need a comprehensive market analysis for launching a fintech startup',
      context: 'Financial services, B2B, enterprise clients',
      expectedDeliverables: ['market analysis', 'competitive landscape', 'go-to-market strategy'],
      timeframe: 'urgent - within 6 hours'
    };

    it('should successfully initiate a consulting project', async () => {
      // Setup mocks
      const mockRequirements = {
        scope: 'Fintech market analysis and strategy',
        objectives: ['Market size analysis', 'Competitor analysis', 'Strategy recommendation'],
        constraints: ['6-hour timeframe', 'B2B focus'],
        successCriteria: ['Actionable insights', 'Data-driven recommendations']
      };
      
      const mockWorkModules = [
        { id: 'wm1', type: 'market_research', specialist: 'research', estimatedHours: 2 },
        { id: 'wm2', type: 'competitive_analysis', specialist: 'strategy', estimatedHours: 2 },
        { id: 'wm3', type: 'strategy_formulation', specialist: 'strategy', estimatedHours: 2 }
      ];
      
      const mockProject = {
        id: 'proj_12345',
        status: 'active',
        requirements: mockRequirements,
        workModules: mockWorkModules,
        timeline: expect.any(Object)
      };

      mockPartnerAgent.gatherRequirements.mockResolvedValue(mockRequirements);
      mockPrincipalAgent.analyzeRequirements.mockResolvedValue({ feasible: true, estimatedDuration: 6 });
      mockPrincipalAgent.createWorkModules.mockResolvedValue(mockWorkModules);

      const result = await orchestrator.startConsultingProject(mockClientRequest, mockOnUpdate);

      expect(result).toMatchObject({
        projectId: expect.any(String),
        status: 'initiated',
        requirements: mockRequirements,
        workModules: mockWorkModules,
        estimatedCompletion: expect.any(Date)
      });

      expect(mockPartnerAgent.gatherRequirements).toHaveBeenCalledWith(mockClientRequest, mockOnUpdate);
      expect(mockPrincipalAgent.analyzeRequirements).toHaveBeenCalledWith(mockRequirements);
      expect(mockPrincipalAgent.createWorkModules).toHaveBeenCalledWith(mockRequirements);
      expect(mockOnUpdate).toHaveBeenCalledWith({
        phase: 'project_initiated',
        message: 'Consulting project started',
        progress: 10
      });
    });

    it('should handle infeasible projects gracefully', async () => {
      const infeasibleRequest = {
        query: 'Create a complete business plan in 30 minutes',
        timeframe: '30 minutes'
      };

      const mockRequirements = {
        scope: 'Complete business plan',
        timeframe: '30 minutes'
      };

      mockPartnerAgent.gatherRequirements.mockResolvedValue(mockRequirements);
      mockPrincipalAgent.analyzeRequirements.mockResolvedValue({ 
        feasible: false, 
        reason: 'Insufficient time for comprehensive business plan',
        suggestedAlternative: 'Business plan outline or specific section focus'
      });

      const result = await orchestrator.startConsultingProject(infeasibleRequest, mockOnUpdate);

      expect(result).toMatchObject({
        status: 'infeasible',
        reason: expect.any(String),
        suggestedAlternative: expect.any(String)
      });

      expect(mockPrincipalAgent.createWorkModules).not.toHaveBeenCalled();
    });

    it('should handle partner agent errors', async () => {
      mockPartnerAgent.gatherRequirements.mockRejectedValue(new Error('Requirements gathering failed'));

      await expect(orchestrator.startConsultingProject(mockClientRequest, mockOnUpdate))
        .rejects.toThrow('Failed to initiate consulting project: Requirements gathering failed');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        phase: 'error',
        message: 'Failed to gather requirements',
        error: 'Requirements gathering failed'
      });
    });
  });

  describe('executeProject', () => {
    const mockProject = {
      id: 'proj_12345',
      requirements: {
        scope: 'Market analysis',
        objectives: ['Market size', 'Competitors']
      },
      workModules: [
        { id: 'wm1', type: 'market_research', specialist: 'research', status: 'pending' },
        { id: 'wm2', type: 'competitive_analysis', specialist: 'strategy', status: 'pending' }
      ]
    };

    it('should execute all work modules successfully', async () => {
      const mockDeliverables = [
        { moduleId: 'wm1', content: 'Market research results', qualityScore: 0.92 },
        { moduleId: 'wm2', content: 'Competitive analysis', qualityScore: 0.88 }
      ];

      const mockFinalReport = {
        executiveSummary: 'Project completed successfully',
        deliverables: mockDeliverables,
        qualityScore: 0.90,
        recommendations: ['Recommendation 1', 'Recommendation 2']
      };

      mockAssociatePool.getAvailableSpecialists.mockResolvedValue(['research', 'strategy']);
      mockAssociatePool.assignWorkModule.mockResolvedValue({ assigned: true });
      mockPrincipalAgent.coordinateExecution.mockResolvedValue(mockDeliverables);
      mockPrincipalAgent.integrateDeliverables.mockResolvedValue(mockFinalReport);

      const result = await orchestrator.executeProject(mockProject, mockOnUpdate);

      expect(result).toMatchObject({
        status: 'completed',
        finalReport: mockFinalReport,
        executionTime: expect.any(Number),
        qualityScore: 0.90
      });

      expect(mockPrincipalAgent.coordinateExecution).toHaveBeenCalledWith(
        mockProject.workModules,
        mockAssociatePool,
        mockOnUpdate
      );
      expect(mockPartnerAgent.validateDeliverables).toHaveBeenCalledWith(mockFinalReport);
    });

    it('should handle quality threshold failures', async () => {
      const lowQualityDeliverables = [
        { moduleId: 'wm1', content: 'Poor quality research', qualityScore: 0.60 },
        { moduleId: 'wm2', content: 'Incomplete analysis', qualityScore: 0.55 }
      ];

      const lowQualityReport = {
        deliverables: lowQualityDeliverables,
        qualityScore: 0.58 // Below threshold of 0.85
      };

      mockAssociatePool.getAvailableSpecialists.mockResolvedValue(['research']);
      mockPrincipalAgent.coordinateExecution.mockResolvedValue(lowQualityDeliverables);
      mockPrincipalAgent.integrateDeliverables.mockResolvedValue(lowQualityReport);

      const result = await orchestrator.executeProject(mockProject, mockOnUpdate);

      expect(result).toMatchObject({
        status: 'quality_review_required',
        qualityScore: 0.58,
        requiredActions: expect.any(Array)
      });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        phase: 'quality_review',
        message: 'Deliverables require quality improvement',
        qualityScore: 0.58
      });
    });

    it('should handle execution timeouts', async () => {
      // Mock a long-running execution
      mockPrincipalAgent.coordinateExecution.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      // Set a short timeout for testing (shorter than the mock execution time)
      const shortTimeoutProject = { ...mockProject, maxDuration: 50 };

      const result = await orchestrator.executeProject(shortTimeoutProject, mockOnUpdate);

      expect(result).toMatchObject({
        status: 'timeout',
        reason: 'Project execution exceeded maximum duration',
        partialResults: expect.any(Object)
      });
    }, 10000); // Increase Jest timeout for this specific test
  });

  describe('getProjectStatus', () => {
    it('should return comprehensive project status', () => {
      const mockProjectId = 'proj_12345';
      const mockStatus = {
        projectId: mockProjectId,
        phase: 'execution',
        progress: 65,
        activeModules: 2,
        completedModules: 1,
        currentActivity: 'Competitive analysis in progress',
        estimatedCompletion: new Date(),
        qualityMetrics: {
          averageScore: 0.87,
          moduleScores: [0.92, 0.82]
        }
      };

      // This would typically fetch from a data store
      orchestrator.projectStatuses = new Map([[mockProjectId, mockStatus]]);

      const result = orchestrator.getProjectStatus(mockProjectId);

      expect(result).toEqual(mockStatus);
    });

    it('should return null for non-existent projects', () => {
      const result = orchestrator.getProjectStatus('non_existent_id');
      expect(result).toBeNull();
    });
  });

  describe('cancelProject', () => {
    it('should gracefully cancel an active project', async () => {
      const mockProjectId = 'proj_12345';
      
      mockPrincipalAgent.coordinateExecution.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      // Start a project
      const projectPromise = orchestrator.executeProject({ 
        id: mockProjectId, 
        workModules: [] 
      }, mockOnUpdate);

      // Cancel it immediately
      const cancelResult = await orchestrator.cancelProject(mockProjectId, 'User requested cancellation');

      expect(cancelResult).toMatchObject({
        status: 'cancelled',
        reason: 'User requested cancellation',
        partialResults: expect.any(Object)
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete end-to-end consulting workflow', async () => {
      const clientRequest = {
        query: 'Help me understand the market opportunity for AI-powered customer service tools',
        context: 'SaaS startup, targeting mid-market companies',
        timeframe: '4 hours'
      };

      // Mock the complete workflow
      const requirements = {
        scope: 'AI customer service market analysis',
        objectives: ['Market size', 'Competition', 'Positioning strategy'],
        constraints: ['4-hour delivery', 'Mid-market focus']
      };

      const workModules = [
        { id: 'wm1', type: 'market_sizing', specialist: 'research' },
        { id: 'wm2', type: 'competitive_intelligence', specialist: 'strategy' },
        { id: 'wm3', type: 'positioning_strategy', specialist: 'strategy' }
      ];

      const deliverables = [
        { moduleId: 'wm1', content: 'Market size: $2.3B TAM', qualityScore: 0.91 },
        { moduleId: 'wm2', content: 'Key competitors analysis', qualityScore: 0.87 },
        { moduleId: 'wm3', content: 'Positioning recommendations', qualityScore: 0.93 }
      ];

      const finalReport = {
        executiveSummary: 'Strong market opportunity with clear differentiation path',
        deliverables,
        qualityScore: 0.90,
        recommendations: [
          'Focus on mid-market segment with $50-500M revenue',
          'Emphasize AI accuracy and integration capabilities',
          'Price competitively at $50-100 per agent per month'
        ]
      };

      // Setup mocks for complete workflow
      mockPartnerAgent.gatherRequirements.mockResolvedValue(requirements);
      mockPrincipalAgent.analyzeRequirements.mockResolvedValue({ feasible: true });
      mockPrincipalAgent.createWorkModules.mockResolvedValue(workModules);
      mockAssociatePool.getAvailableSpecialists.mockResolvedValue(['research', 'strategy']);
      mockPrincipalAgent.coordinateExecution.mockResolvedValue(deliverables);
      mockPrincipalAgent.integrateDeliverables.mockResolvedValue(finalReport);
      mockPartnerAgent.validateDeliverables.mockResolvedValue({ approved: true });

      // Execute the complete workflow
      const projectResult = await orchestrator.startConsultingProject(clientRequest, mockOnUpdate);
      const executionResult = await orchestrator.executeProject(projectResult, mockOnUpdate);

      expect(executionResult).toMatchObject({
        status: 'completed',
        finalReport: {
          qualityScore: 0.90,
          recommendations: expect.arrayContaining([
            expect.stringContaining('mid-market'),
            expect.stringContaining('AI accuracy'),
            expect.stringContaining('$50-100')
          ])
        }
      });

      // Verify all phases were called
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'project_initiated' })
      );
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'execution_started' })
      );
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'completed' })
      );
    });
  });
}); 