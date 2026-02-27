// Purpose: Integration tests for consulting API routes (aligned with actual route API).
// Author: LLM Chat, Last Modified: 2025-02-26

const { describe, test, expect, beforeAll, beforeEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const consultingRoutes = require('../../routes/consulting');

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const mockOrchestrator = {
    startConsultingProject: jest.fn(),
    executeProject: jest.fn(),
    getProjectStatus: jest.fn(),
    cancelProject: jest.fn()
  };

  app.set('consultingOrchestrator', mockOrchestrator);
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
    test('should start a new consulting project when query is provided', async () => {
      const mockProject = { id: 'proj_test_123', title: 'AMD vs Tesla', status: 'pending' };
      mockOrchestrator.startConsultingProject.mockResolvedValueOnce(mockProject);

      const response = await request(app)
        .post('/api/consulting/start')
        .send({
          query: 'Compare AMD vs Tesla stock',
          context: 'Investment analysis'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        project: mockProject
      });
      expect(mockOrchestrator.startConsultingProject).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Compare AMD vs Tesla stock',
          context: 'Investment analysis'
        }),
        expect.any(Function)
      );
    });

    test('should return 400 when query is missing', async () => {
      const response = await request(app)
        .post('/api/consulting/start')
        .send({})
        .expect(400);

      expect(response.body.error).toMatch(/query|Query/);
    });

    test('should return 500 when orchestrator throws', async () => {
      mockOrchestrator.startConsultingProject.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/consulting/start')
        .send({ query: 'Test query' })
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toMatch(/Database connection failed|Failed to start/);
    });
  });

  describe('POST /api/consulting/execute/:projectId', () => {
    test('should return 400 when project body is missing', async () => {
      const response = await request(app)
        .post('/api/consulting/execute/proj_123')
        .send({})
        .expect(400);

      expect(response.body.error).toMatch(/project|Project/);
    });

    test('should return 404 when project not found in orchestrator', async () => {
      mockOrchestrator.activeProjects = { get: jest.fn().mockReturnValue(null) };
      mockOrchestrator.database = { getProject: jest.fn().mockResolvedValue(null) };

      const response = await request(app)
        .post('/api/consulting/execute/proj_123')
        .send({ project: { id: 'proj_123' } })
        .expect(404);

      expect(response.body.error).toMatch(/not found|Project/);
    });
  });

  describe('GET /api/consulting/status/:projectId', () => {
    test('should return project status when orchestrator returns status', async () => {
      const projectId = 'proj_test_123';
      const mockStatus = {
        project: global.testUtils?.getMockProject?.() || { id: projectId, title: 'Test' },
        progress: [],
        reports: []
      };
      mockOrchestrator.getProjectStatus.mockReturnValueOnce(mockStatus);

      const response = await request(app)
        .get(`/api/consulting/status/${projectId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: mockStatus
      });
      expect(mockOrchestrator.getProjectStatus).toHaveBeenCalledWith(projectId);
    });

    test('should return 404 when project status is null', async () => {
      mockOrchestrator.getProjectStatus.mockReturnValueOnce(null);

      const response = await request(app)
        .get('/api/consulting/status/non_existent')
        .expect(404);

      expect(response.body.error).toMatch(/not found|Project/);
    });
  });

  describe('POST /api/consulting/cancel/:projectId', () => {
    test('should cancel project and return success', async () => {
      mockOrchestrator.cancelProject.mockResolvedValueOnce({ cancelled: true });

      const response = await request(app)
        .post('/api/consulting/cancel/proj_123')
        .send({ reason: 'User requested' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockOrchestrator.cancelProject).toHaveBeenCalledWith('proj_123', 'User requested');
    });
  });

  describe('Performance', () => {
    test('should handle multiple status requests', async () => {
      const projectIds = ['proj_1', 'proj_2', 'proj_3'];
      projectIds.forEach((id) => {
        mockOrchestrator.getProjectStatus.mockReturnValueOnce({
          project: { id, title: 'Test' },
          progress: [],
          reports: []
        });
      });

      const requests = projectIds.map((id) =>
        request(app).get(`/api/consulting/status/${id}`)
      );
      const responses = await Promise.all(requests);

      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.status.project.id).toBe(projectIds[i]);
      });
    });
  });
});
