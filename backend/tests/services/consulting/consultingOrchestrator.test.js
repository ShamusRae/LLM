const ConsultingOrchestrator = require('../../../services/consulting/consultingOrchestrator');
const PartnerAgent = require('../../../services/consulting/partnerAgent');
const PrincipalAgent = require('../../../services/consulting/principalAgent');
const AssociatePool = require('../../../services/consulting/associatePool');
const ConsultingDatabase = require('../../../services/database/consultingDatabase');

jest.mock('../../../services/consulting/partnerAgent');
jest.mock('../../../services/consulting/principalAgent');
jest.mock('../../../services/consulting/associatePool');
jest.mock('../../../services/database/consultingDatabase');

describe('ConsultingOrchestrator', () => {
  let orchestrator;
  let mockPartnerAgent;
  let mockPrincipalAgent;
  let mockAssociatePool;
  let mockDatabase;
  let mockOnUpdate;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPartnerAgent = {
      gatherRequirements: jest.fn(),
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
      getAvailableSpecialists: jest.fn()
    };
    mockDatabase = {
      initialize: jest.fn().mockResolvedValue(true),
      createProject: jest.fn(),
      updateProject: jest.fn().mockResolvedValue({}),
      saveProjectReport: jest.fn().mockResolvedValue({}),
      getProject: jest.fn()
    };

    PartnerAgent.mockImplementation(() => mockPartnerAgent);
    PrincipalAgent.mockImplementation(() => mockPrincipalAgent);
    AssociatePool.mockImplementation(() => mockAssociatePool);
    ConsultingDatabase.mockImplementation(() => mockDatabase);

    mockOnUpdate = jest.fn();
    orchestrator = new ConsultingOrchestrator();
  });

  it('initializes with default configuration', () => {
    expect(orchestrator.maxProjectDuration).toBe(8 * 60 * 60 * 1000);
    expect(orchestrator.qualityThreshold).toBe(0.75);
    expect(orchestrator.maxWorkModules).toBe(12);
  });

  describe('startConsultingProject', () => {
    it('initiates a project when feasible', async () => {
      const request = { query: 'Analyze market', context: 'B2B' };
      const requirements = { objectives: ['o1'], consultingType: 'strategy', complexity: 'medium' };
      const feasibility = { feasible: true, confidence: '90%', riskLevel: 'Low' };
      const workModules = [
        { id: 'wm1', type: 'analysis', specialist: 'research', estimatedHours: 2 }
      ];
      mockPartnerAgent.gatherRequirements.mockResolvedValue(requirements);
      mockPrincipalAgent.analyzeRequirements.mockResolvedValue(feasibility);
      mockPrincipalAgent.createWorkModules.mockResolvedValue(workModules);
      mockDatabase.createProject.mockResolvedValue({ id: 'proj_1', client_id: 'c1' });

      const result = await orchestrator.startConsultingProject(request, mockOnUpdate);

      expect(result.status).toBe('initiated');
      expect(result.projectId).toBe('proj_1');
      expect(result.workModules).toEqual(workModules);
      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ phase: 'project_initiated' }));
    });

    it('throws when work modules are missing from principal planning', async () => {
      mockPartnerAgent.gatherRequirements.mockResolvedValue({ objectives: [] });
      mockPrincipalAgent.analyzeRequirements.mockResolvedValue({
        feasible: false,
        reason: 'Insufficient scope',
        suggestedAlternative: 'Narrow objective'
      });
      mockPrincipalAgent.createWorkModules.mockResolvedValue(undefined);

      await expect(orchestrator.startConsultingProject({ query: 'Test' }, mockOnUpdate))
        .rejects
        .toThrow('Failed to initiate consulting project');
    });
  });

  describe('executeProject', () => {
    it('executes project and returns completed report', async () => {
      const project = {
        id: 'proj_1',
        workModules: [{ id: 'wm1', type: 'analysis', specialist: 'research', estimatedHours: 2 }]
      };
      const deliverables = [{ moduleId: 'wm1', qualityScore: 0.9 }];
      const finalReport = { qualityScore: 0.9, recommendations: ['r1'] };

      mockAssociatePool.getAvailableSpecialists.mockResolvedValue(['research']);
      mockPrincipalAgent.coordinateExecution.mockResolvedValue(deliverables);
      mockPrincipalAgent.integrateDeliverables.mockResolvedValue(finalReport);
      mockPartnerAgent.validateDeliverables.mockResolvedValue({ approved: true });

      const result = await orchestrator.executeProject(project, mockOnUpdate);

      expect(result.status).toBe('completed');
      expect(result.qualityScore).toBe(0.9);
      expect(mockDatabase.saveProjectReport).toHaveBeenCalledWith('proj_1', finalReport);
      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ phase: 'completed' }));
    });

    it('returns quality_review_required when quality below threshold', async () => {
      const project = {
        id: 'proj_1',
        workModules: [{ id: 'wm1', type: 'analysis', specialist: 'research', estimatedHours: 2 }]
      };
      mockAssociatePool.getAvailableSpecialists.mockResolvedValue(['research']);
      mockPrincipalAgent.coordinateExecution.mockResolvedValue([{ moduleId: 'wm1', qualityScore: 0.55 }]);
      mockPrincipalAgent.integrateDeliverables.mockResolvedValue({ qualityScore: 0.58 });

      const result = await orchestrator.executeProject(project, mockOnUpdate);

      expect(result.status).toBe('quality_review_required');
      expect(result.qualityScore).toBe(0.58);
    });
  });

  describe('project status and cancellation', () => {
    it('returns status from in-memory status map', () => {
      orchestrator.projectStatuses.set('proj_1', { phase: 'execution', progress: 40 });
      expect(orchestrator.getProjectStatus('proj_1')).toEqual({ phase: 'execution', progress: 40 });
      expect(orchestrator.getProjectStatus('missing')).toBeNull();
    });

    it('cancels a project and tracks cancellation', async () => {
      const result = await orchestrator.cancelProject('proj_1', 'User cancelled');
      expect(result.status).toBe('cancelled');
      expect(orchestrator.projectCancellations.has('proj_1')).toBe(true);
      expect(orchestrator.getProjectStatus('proj_1')).toEqual(
        expect.objectContaining({ phase: 'cancelled' })
      );
    });
  });
});