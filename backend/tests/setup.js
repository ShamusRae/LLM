// Global test setup for Professional Consulting Platform
const { jest } = require('@jest/globals');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002'; // Different port for testing
process.env.DB_NAME = 'consulting_platform_test';
process.env.REDIS_ENABLED = 'false'; // Disable Redis in tests by default

// Mock external dependencies that shouldn't be called during tests
jest.mock('../services/ai/aiProviders.js', () => ({
  testAIConnectivity: jest.fn().mockResolvedValue({
    status: 'ONLINE',
    providers: ['mock']
  }),
  callAI: jest.fn().mockResolvedValue({
    content: 'Mock AI response for testing',
    provider: 'mock'
  })
}));

// Global test utilities
global.testUtils = {
  // Mock project data for testing
  getMockProject: () => ({
    id: 'test_proj_123',
    title: 'Test AMD vs Tesla Analysis',
    description: 'Mock project for testing',
    client_id: 'test_client_123',
    status: 'pending'
  }),
  
  // Mock progress data
  getMockProgress: () => ({
    project_id: 'test_proj_123',
    module_name: 'Partner Initial Assessment',
    status: 'completed',
    percentage: 25,
    summary: 'Mock progress for testing'
  }),
  
  // Mock report data
  getMockReport: () => ({
    project_id: 'test_proj_123',
    title: 'Mock Final Report',
    content: 'This is a mock report for testing purposes',
    type: 'final_report'
  })
};

// Setup and teardown hooks
beforeAll(async () => {
  console.log('🧪 Test suite starting...');
});

afterAll(async () => {
  console.log('🧪 Test suite completed.');
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test if needed
}); 