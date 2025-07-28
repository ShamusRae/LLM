const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const ConsultingDatabase = require('../../services/database/consultingDatabase');

// Mock pg and redis modules
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
    // Reset mocks
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
      const mockProject = testUtils.getMockProject();
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockProject, created_at: new Date() }]
      });

      const result = await database.createProject(mockProject);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        expect.arrayContaining([mockProject.title, mockProject.description])
      );
      expect(result).toMatchObject(mockProject);
    });

    test('should retrieve project by ID', async () => {
      const mockProject = testUtils.getMockProject();
      
      // Test cache miss then database hit
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({
        rows: [mockProject]
      });

      const result = await database.getProject(mockProject.id);

      expect(mockRedis.get).toHaveBeenCalledWith(`project:${mockProject.id}`);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM projects WHERE id = $1'),
        [mockProject.id]
      );
      expect(result).toEqual(mockProject);
    });

    test('should return null for non-existent project', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await database.getProject('non_existent_id');

      expect(result).toBeNull();
    });

    test('should update project status', async () => {
      const projectId = 'test_proj_123';
      const newStatus = 'in_progress';
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: projectId, status: newStatus }]
      });

      const result = await database.updateProjectStatus(projectId, newStatus);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE projects SET status = $1'),
        [newStatus, projectId]
      );
      expect(result.status).toBe(newStatus);
    });
  });

  describe('Progress Operations', () => {
    test('should add progress update', async () => {
      const mockProgress = testUtils.getMockProgress();
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockProgress, id: 'progress_123' }]
      });

      const result = await database.addProgress(mockProgress);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO work_modules'),
        expect.arrayContaining([
          mockProgress.project_id,
          mockProgress.module_name,
          mockProgress.status
        ])
      );
      expect(result).toMatchObject(mockProgress);
    });

    test('should get project progress', async () => {
      const projectId = 'test_proj_123';
      const mockProgressList = [
        testUtils.getMockProgress(),
        { ...testUtils.getMockProgress(), module_name: 'Principal Deep Dive' }
      ];
      
      mockPool.query.mockResolvedValueOnce({
        rows: mockProgressList
      });

      const result = await database.getProjectProgress(projectId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM work_modules WHERE project_id = $1'),
        [projectId]
      );
      expect(result).toEqual(mockProgressList);
    });
  });

  describe('Report Operations', () => {
    test('should save report', async () => {
      const mockReport = testUtils.getMockReport();
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockReport, id: 'report_123' }]
      });

      const result = await database.saveReport(mockReport);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reports'),
        expect.arrayContaining([
          mockReport.project_id,
          mockReport.title,
          mockReport.content
        ])
      );
      expect(result).toMatchObject(mockReport);
    });

    test('should get project reports', async () => {
      const projectId = 'test_proj_123';
      const mockReports = [testUtils.getMockReport()];
      
      mockPool.query.mockResolvedValueOnce({
        rows: mockReports
      });

      const result = await database.getProjectReports(projectId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM reports WHERE project_id = $1'),
        [projectId]
      );
      expect(result).toEqual(mockReports);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(database.getProject('test_id')).rejects.toThrow('Connection failed');
    });

    test('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis unavailable'));
      mockPool.query.mockResolvedValueOnce({
        rows: [testUtils.getMockProject()]
      });

      // Should still work even if Redis fails
      const result = await database.getProject('test_proj_123');
      expect(result).toBeDefined();
    });
  });

  describe('Caching Behavior', () => {
    test('should use cached data when available', async () => {
      const mockProject = testUtils.getMockProject();
      
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockProject));

      const result = await database.getProject(mockProject.id);

      expect(mockRedis.get).toHaveBeenCalledWith(`project:${mockProject.id}`);
      expect(mockPool.query).not.toHaveBeenCalled(); // Should not hit database
      expect(result).toEqual(mockProject);
    });

    test('should cache data after database retrieval', async () => {
      const mockProject = testUtils.getMockProject();
      
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({
        rows: [mockProject]
      });

      await database.getProject(mockProject.id);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `project:${mockProject.id}`,
        expect.any(Number), // TTL
        JSON.stringify(mockProject)
      );
    });
  });
}); 