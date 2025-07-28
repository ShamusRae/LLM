const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const consultingRoutes = require('../../routes/consulting');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock the consulting orchestrator for integration tests
  const mockOrchestrator = {
    startProject: jest.fn(),
    executeProject: jest.fn(),
    getProjectStatus: jest.fn(),
    getAllProjects: jest.fn()
  };
  
  // Attach mock orchestrator to app context
  app.use((req, res, next) => {
    req.app.locals.consultingOrchestrator = mockOrchestrator;
    next();
  });
  
  app.use('/api/consulting', consultingRoutes);
  
  return { app, mockOrchestrator };
};

describe('Consulting API Integration Tests', () => {
  let app;
  let mockOrchestrator;

  beforeAll(() => {
    const testApp = createTestApp();
    app = testApp.app;
    mockOrchestrator = testApp.mockOrchestrator;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/consulting/start', () => {
    test('should start a new consulting project successfully', async () => {
      const mockProject = {
        id: 'proj_test_123',
        title: 'AMD vs Tesla Stock Analysis',
        status: 'pending'
      };
      
      mockOrchestrator.startProject.mockResolvedValueOnce(mockProject);

      const response = await request(app)
        .post('/api/consulting/start')
        .send({
          title: 'AMD vs Tesla Stock Analysis',
          description: 'Comprehensive analysis comparing AMD and Tesla stocks'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        project: mockProject
      });
      expect(mockOrchestrator.startProject).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'AMD vs Tesla Stock Analysis'
        })
      );
    });

    test('should handle missing project details', async () => {
      const response = await request(app)
        .post('/api/consulting/start')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });

    test('should handle orchestrator errors', async () => {
      mockOrchestrator.startProject.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/consulting/start')
        .send({
          title: 'Test Project',
          description: 'Test Description'
        })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to start project')
      });
    });
  });

  describe('POST /api/consulting/execute/:projectId', () => {
    test('should execute project successfully', async () => {
      const projectId = 'proj_test_123';
      const mockExecution = {
        projectId,
        status: 'in_progress',
        message: 'Project execution started'
      };
      
      mockOrchestrator.executeProject.mockResolvedValueOnce(mockExecution);

      const response = await request(app)
        .post(`/api/consulting/execute/${projectId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        execution: mockExecution
      });
      expect(mockOrchestrator.executeProject).toHaveBeenCalledWith(projectId);
    });

    test('should handle invalid project ID', async () => {
      const invalidId = 'invalid_id';
      
      mockOrchestrator.executeProject.mockRejectedValueOnce(
        new Error('Project not found')
      );

      const response = await request(app)
        .post(`/api/consulting/execute/${invalidId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Project not found')
      });
    });
  });

  describe('GET /api/consulting/status/:projectId', () => {
    test('should return project status successfully', async () => {
      const projectId = 'proj_test_123';
      const mockStatus = {
        project: testUtils.getMockProject(),
        progress: [testUtils.getMockProgress()],
        reports: [testUtils.getMockReport()]
      };
      
      mockOrchestrator.getProjectStatus.mockResolvedValueOnce(mockStatus);

      const response = await request(app)
        .get(`/api/consulting/status/${projectId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: mockStatus
      });
      expect(mockOrchestrator.getProjectStatus).toHaveBeenCalledWith(projectId);
    });

    test('should handle non-existent project', async () => {
      const projectId = 'non_existent';
      
      mockOrchestrator.getProjectStatus.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/consulting/status/${projectId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Project not found'
      });
    });
  });

  describe('GET /api/consulting/projects', () => {
    test('should return all projects successfully', async () => {
      const mockProjects = [
        testUtils.getMockProject(),
        { ...testUtils.getMockProject(), id: 'proj_test_456', title: 'Another Project' }
      ];
      
      mockOrchestrator.getAllProjects.mockResolvedValueOnce(mockProjects);

      const response = await request(app)
        .get('/api/consulting/projects')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        projects: mockProjects
      });
      expect(mockOrchestrator.getAllProjects).toHaveBeenCalled();
    });

    test('should return empty array when no projects exist', async () => {
      mockOrchestrator.getAllProjects.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/consulting/projects')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        projects: []
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/consulting/start')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid JSON')
      });
    });

    test('should handle very long project titles', async () => {
      const longTitle = 'A'.repeat(1000);
      
      mockOrchestrator.startProject.mockRejectedValueOnce(
        new Error('Title too long')
      );

      const response = await request(app)
        .post('/api/consulting/start')
        .send({
          title: longTitle,
          description: 'Test description'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Title too long')
      });
    });

    test('should handle concurrent project execution requests', async () => {
      const projectId = 'proj_test_123';
      
      mockOrchestrator.executeProject.mockResolvedValue({
        projectId,
        status: 'in_progress'
      });

      // Send multiple concurrent requests
      const requests = Array(3).fill().map(() =>
        request(app).post(`/api/consulting/execute/${projectId}`)
      );

      const responses = await Promise.all(requests);

      // All should succeed (idempotent operation)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple simultaneous project status requests', async () => {
      const projectIds = ['proj_1', 'proj_2', 'proj_3', 'proj_4', 'proj_5'];
      
      // Mock responses for each project
      projectIds.forEach(id => {
        mockOrchestrator.getProjectStatus.mockResolvedValueOnce({
          project: { ...testUtils.getMockProject(), id },
          progress: [],
          reports: []
        });
      });

      // Send concurrent status requests
      const requests = projectIds.map(id =>
        request(app).get(`/api/consulting/status/${id}`)
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.status.project.id).toBe(projectIds[index]);
      });
    });

    test('should complete API calls within reasonable time', async () => {
      const startTime = Date.now();
      
      mockOrchestrator.getAllProjects.mockResolvedValueOnce([
        testUtils.getMockProject()
      ]);

      await request(app)
        .get('/api/consulting/projects')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 