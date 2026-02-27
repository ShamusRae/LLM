// Purpose: Unit tests for ConsultingDatabase (aligned with actual API and schema).
// Author: LLM Chat, Last Modified: 2025-02-26

const { describe, test, expect, beforeEach } = require('@jest/globals');
const ConsultingDatabase = require('../../services/database/consultingDatabase');

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    query: jest.fn(),
    end: jest.fn()
  }))
}));

jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    quit: jest.fn().mockResolvedValue()
  }))
}));

describe('ConsultingDatabase', () => {
  let database;
  let mockPool;
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    database = new ConsultingDatabase();
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
      })
    };
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn()
    };
    database.pool = mockPool;
    database.redis = mockRedis;
  });

  describe('Project Operations', () => {
    test('should create a new project successfully', async () => {
      const projectData = {
        query: 'Test query',
        context: 'Test context',
        expectedDeliverables: [],
        requirements: {},
        feasibilityAnalysis: {}
      };
      const mockProject = { id: 'test_proj_123', title: 'Test query', client_id: 'client_1' };
      const mockClientQuery = jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'client_1' }] }) // getOrCreateDemoClient SELECT
        .mockResolvedValueOnce({ rows: [mockProject] }) // INSERT consulting_projects
        .mockResolvedValueOnce(undefined); // COMMIT
      mockPool.connect.mockResolvedValue({
        query: mockClientQuery,
        release: jest.fn()
      });

      const result = await database.createProject(projectData);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockProject.id);
      expect(mockClientQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO consulting_projects'), expect.any(Array));
    });

    test('should retrieve project by ID', async () => {
      const mockProject = { id: 'test_proj_123', title: 'Test' };
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({ rows: [mockProject] });

      const result = await database.getProject('test_proj_123');

      expect(mockRedis.get).toHaveBeenCalledWith('project:test_proj_123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM consulting_projects'),
        ['test_proj_123']
      );
      expect(result).toEqual(mockProject);
    });

    test('should throw for non-existent project', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(database.getProject('non_existent_id')).rejects.toThrow('not found');
    });

    test('should update project', async () => {
      const projectId = 'test_proj_123';
      const updates = { status: 'in_progress' };
      mockPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: [{ id: projectId, status: 'in_progress', client_id: 'c1' }] }),
        release: jest.fn()
      });

      const result = await database.updateProject(projectId, updates);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.status).toBe('in_progress');
    });
  });

  describe('Progress Operations', () => {
    test('should add progress update', async () => {
      const projectId = 'test_proj_123';
      const progressData = { phase: 'analysis', message: 'Working', progress: 25 };
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'progress_123', project_id: projectId, ...progressData }]
      });

      const result = await database.addProgressUpdate(projectId, progressData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO project_progress'),
        expect.arrayContaining([projectId, progressData.phase, progressData.message])
      );
      expect(result).toBeDefined();
    });

    test('should get progress updates', async () => {
      const projectId = 'test_proj_123';
      const mockProgressList = [{ id: 'p1', phase: 'analysis', message: 'Done' }];
      mockPool.query.mockResolvedValueOnce({ rows: mockProgressList });

      const result = await database.getProgressUpdates(projectId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM project_progress'),
        [projectId, 50]
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Report Operations', () => {
    test('should save project report', async () => {
      const projectId = 'test_proj_123';
      const reportData = {
        executiveSummary: 'Summary',
        keyFindings: [],
        recommendations: {},
        implementationRoadmap: {},
        riskMitigation: [],
        successMetrics: [],
        qualityScore: 0.9,
        deliverables: []
      };
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'report_123', project_id: projectId, ...reportData }]
      });

      const result = await database.saveProjectReport(projectId, reportData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO project_reports'),
        expect.arrayContaining([projectId])
      );
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle database query errors', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(database.getProject('test_id')).rejects.toThrow();
    });

    test('should still return project when Redis fails', async () => {
      const mockProject = { id: 'test_proj_123', title: 'Test' };
      mockRedis.get.mockRejectedValueOnce(new Error('Redis unavailable'));
      mockPool.query.mockResolvedValueOnce({ rows: [mockProject] });

      const result = await database.getProject('test_proj_123');
      expect(result).toEqual(mockProject);
    });
  });

  describe('Caching Behavior', () => {
    test('should use cached data when available', async () => {
      const mockProject = { id: 'test_proj_123', title: 'Test' };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockProject));

      const result = await database.getProject('test_proj_123');

      expect(mockRedis.get).toHaveBeenCalledWith('project:test_proj_123');
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(result).toEqual(mockProject);
    });

    test('should cache data after database retrieval', async () => {
      const mockProject = { id: 'test_proj_123', title: 'Test' };
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({ rows: [mockProject] });

      await database.getProject('test_proj_123');

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'project:test_proj_123',
        300,
        JSON.stringify(mockProject)
      );
    });
  });
});
