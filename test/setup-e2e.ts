/**
 * Setup file for end-to-end tests
 * This file is executed before all e2e tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENABLE_SWAGGER = 'false';
process.env.RATE_LIMIT_TTL = '60000';
process.env.RATE_LIMIT_MAX = '1000'; // Higher limit for testing
process.env.PORT = '3001'; // Different port for testing

// Set test database URL if not provided
if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/boinanuvem_test';
}

// Suppress console output during tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(async () => {
  // Restore console output after tests
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;

  // Force close any remaining connections
  await new Promise((resolve) => setTimeout(resolve, 100));
});

// Increase test timeout for full application tests
jest.setTimeout(30000);
