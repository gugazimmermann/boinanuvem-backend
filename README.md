# Boinanuvem Backend

A secure and scalable NestJS backend API built with TypeScript, featuring comprehensive security measures, health monitoring, and metrics collection.

## Technology Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.x
- **Runtime**: Node.js
- **Security**: Helmet, CORS, Rate Limiting, Input Validation
- **Monitoring**: Health checks, Prometheus metrics, Structured logging
- **Testing**: Jest (Unit & E2E tests)
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks

## Features

### Core API Functionality
- RESTful API endpoints with OpenAPI/Swagger documentation
- Global input validation and transformation
- Structured error handling and logging
- Environment-based configuration management

### Security Features
- **Security Headers**: Comprehensive HTTP security headers via Helmet
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Per-IP request throttling with configurable limits
- **Input Validation**: Automatic payload validation and sanitization
- **Security Monitoring**: Real-time detection of SQL injection, XSS, and path traversal attempts
- **Request Fingerprinting**: Detailed logging of suspicious activities

### Health Monitoring & Metrics
- Health check endpoints for application status
- Prometheus metrics collection and exposure
- Structured logging with daily rotation
- Performance monitoring and alerting capabilities

### Logging System
- Daily rotated log files by severity level
- Security event tracking and alerting
- Request/response logging with configurable detail levels
- Error tracking and debugging support

## Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd boinanuvem-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy example environment file (create one if needed)
cp .env.example .env

# Configure required variables:
# - CORS_ORIGIN: Allowed origins for CORS
# - RATE_LIMIT_TTL: Rate limiting time window (ms)
# - RATE_LIMIT_MAX: Maximum requests per time window
# - ENABLE_SWAGGER: Enable/disable API documentation
```

## Development

### Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run start:prod
```

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugging enabled

# Code Quality
npm run lint               # Run ESLint with auto-fix
npm run format             # Format code with Prettier
npm run format:check       # Check code formatting
npm run typecheck          # TypeScript type checking
npm run check              # Run all quality checks

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests
npm run test:debug         # Run tests in debug mode

# Build
npm run build              # Build for production
```

### Code Quality Tools

The project uses several tools to maintain code quality:

- **ESLint**: Linting with TypeScript support
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters on staged files only

Pre-commit hooks automatically run:
- Code formatting check
- Linting with auto-fix
- TypeScript type checking

## API Documentation

### Swagger/OpenAPI
When `ENABLE_SWAGGER=true`, interactive API documentation is available at:
- **Development**: `http://localhost:3000/api`
- **Production**: Disabled by default for security

### Core Endpoints

#### Health Checks
- `GET /health` - Application health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

#### Metrics
- `GET /metrics` - Prometheus metrics (Prometheus format)

#### Application
- `GET /` - Basic application info and status

## Security Features Summary

### HTTP Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- Referrer Policy

### Request Protection
- **Rate Limiting**: 
  - Development: 100 requests/minute per IP
  - Production: 50 requests/minute per IP
- **CORS**: Configurable allowed origins
- **Input Validation**: Automatic validation with class-validator
- **Request Size Limits**: Configurable payload size restrictions

### Security Monitoring
The application actively monitors and logs:
- SQL injection attempts
- Cross-site scripting (XSS) attempts
- Path traversal attempts
- Suspicious user agents
- Rate limit violations

Security events are logged to `logs/security-*.log` and alerts to `logs/error-*.log`.

### Environment-Specific Security
- **Development**: Higher rate limits, detailed errors, Swagger enabled
- **Production**: Lower rate limits, generic errors, Swagger disabled

## Production Deployment

### Build Process
```bash
# Install production dependencies
npm ci --only=production

# Build the application
npm run build

# Start production server
npm run start:prod
```

### Environment Variables

#### Required Variables
```bash
# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=50
ENABLE_SWAGGER=false

# Optional Security Headers
HSTS_MAX_AGE=31536000
CSP_DIRECTIVES=default-src 'self'
```

#### Production Considerations
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Disable Swagger documentation
- Set up log aggregation and monitoring
- Configure reverse proxy (nginx/Apache)
- Implement SSL/TLS termination
- Set up security monitoring alerts

## Project Structure

```
src/
├── common/              # Shared utilities and configurations
│   ├── config/         # Environment and security configuration
│   ├── dto/            # Data Transfer Objects
│   ├── guards/         # Security guards and middleware
│   ├── interceptors/   # Request/response interceptors
│   └── logger/         # Custom logging service
├── health/             # Health check module
├── metrics/            # Prometheus metrics module
├── app.controller.ts   # Main application controller
├── app.module.ts       # Root application module
├── app.service.ts      # Main application service
└── main.ts            # Application bootstrap

test/                   # End-to-end tests
logs/                   # Application logs (auto-generated)
dist/                   # Compiled JavaScript (auto-generated)
```

## Contributing & Development

### Development Workflow
1. Create a feature branch from `main`
2. Make changes following the established patterns
3. Ensure all tests pass: `npm run check`
4. Commit changes (pre-commit hooks will run automatically)
5. Create a pull request

### Testing Strategy
- **Unit Tests**: Test individual components and services
- **E2E Tests**: Test complete request/response cycles
- **Security Tests**: Validate security measures and configurations
- **Coverage**: Maintain high test coverage for critical paths

### Code Standards
- Follow TypeScript best practices
- Use NestJS decorators and dependency injection
- Implement proper error handling
- Add comprehensive logging for debugging
- Document complex business logic
- Follow security-first development principles

## Support & Resources

- **NestJS Documentation**: [https://docs.nestjs.com](https://docs.nestjs.com)
- **Security Best Practices**: [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- **TypeScript Handbook**: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)

## License

This project is private and unlicensed. All rights reserved.
