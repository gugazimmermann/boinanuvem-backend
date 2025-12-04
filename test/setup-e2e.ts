/**
 * Setup file for end-to-end tests
 * This file is executed before all e2e tests
 */

import { execSync } from 'child_process';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENABLE_SWAGGER = 'false';
process.env.RATE_LIMIT_TTL = '60000';
process.env.RATE_LIMIT_MAX = '1000'; // Higher limit for testing
process.env.PORT = '3001'; // Different port for testing

// Set test database URL if not provided
const testDbUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/boinanuvem_test';

process.env.DATABASE_URL = testDbUrl;

// Suppress console output during tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(async () => {
  // Suppress console output during tests
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();

  // Ensure test database schema is up to date
  // Use db push for test database (better for test environments)
  try {
    execSync(
      `npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate`,
      {
        env: {
          ...process.env,
          DATABASE_URL: testDbUrl,
        },
        stdio: 'ignore', // Suppress migration output
        cwd: process.cwd(),
      },
    );
  } catch (error) {
    // If schema push fails, try to continue anyway
    // The database might already be in sync

    originalConsoleWarn(
      'Schema sync warning (this is usually OK if schema is already up to date):',
      error,
    );
  }
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
