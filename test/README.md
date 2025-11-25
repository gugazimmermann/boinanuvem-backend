# Test Configuration

This directory contains test files and configuration for the Boinanuvem backend.

## Test Types

### Unit Tests
- **Location**: `src/**/*.spec.ts`
- **Command**: `npm run test`
- **Purpose**: Test individual components in isolation with mocked dependencies

### Integration Tests
- **Location**: `src/**/*.integration.spec.ts`
- **Command**: `npm run test:integration`
- **Purpose**: Test database operations and service interactions with real database

### End-to-End Tests
- **Location**: `test/**/*.e2e-spec.ts`
- **Command**: `npm run test:e2e`
- **Purpose**: Test complete API workflows with full application stack

## Test Database Setup

For integration and e2e tests, you need a test database. You can:

1. **Use Docker Compose** (recommended):
   ```bash
   docker-compose up -d postgres
   ```

2. **Use separate test database**:
   Create a database named `boinanuvem_test` in your PostgreSQL instance.

3. **Set environment variable**:
   ```bash
   export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/boinanuvem_test"
   ```

## Running Tests

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:cov

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run all tests (unit + integration + e2e)
npm run test:all
```

## Test Environment Variables

For testing, the following environment variables are automatically set:

- `NODE_ENV=test`
- `ENABLE_SWAGGER=false`
- `RATE_LIMIT_TTL=60000`
- `RATE_LIMIT_MAX=1000` (higher limit for testing)
- `PORT=3001` (for e2e tests)

## Test Utilities

The `test-utils.ts` file provides:

- `createTestPrismaClient()` - Create Prisma client for testing
- `setupTestDatabase()` - Setup test database with initial data
- `teardownTestDatabase()` - Clean up test database
- `cleanupTestData()` - Remove test data
- `createTestPlans()` - Create test plans
- `mockPlanData` - Mock data for unit tests
- `testConfig` - Test configuration constants

## Coverage Reports

Coverage reports are generated in:
- `coverage/` - Unit test coverage
- `coverage-integration/` - Integration test coverage
- `coverage-e2e/` - E2E test coverage

## Best Practices

1. **Unit Tests**: Mock all external dependencies (database, HTTP calls, etc.)
2. **Integration Tests**: Use real database but clean up after each test
3. **E2E Tests**: Test complete user workflows with full application
4. **Test Data**: Use descriptive test data names (prefixed with "Test" or "E2E Test")
5. **Cleanup**: Always clean up test data to avoid test pollution
6. **Isolation**: Each test should be independent and not rely on other tests
