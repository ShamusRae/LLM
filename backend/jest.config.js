module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'scripts/**/*.js',
    '!services/**/index.js',
    '!**/*.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true,
  roots: ['<rootDir>'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  collectCoverage: false,
  maxWorkers: 1 // Run tests sequentially to avoid database conflicts
}; 