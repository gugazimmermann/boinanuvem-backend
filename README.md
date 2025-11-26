# Boinanuvem Backend

A secure and scalable NestJS backend API built with TypeScript for the Boinanuvem cattle management platform. Features comprehensive authentication system, subscription management with 14-day trials, payment processing, security measures, health monitoring, metrics collection, PostgreSQL database with Prisma ORM, and complete pricing plans management.

## Technology Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.x
- **Runtime**: Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens, bcrypt password hashing
- **Email Service**: Nodemailer with Gmail SMTP integration
- **Security**: Helmet, CORS, Rate Limiting, Input Validation, Throttling
- **Monitoring**: Health checks, Prometheus metrics, Structured logging
- **Testing**: Jest (Unit, Integration & E2E tests) - 197 tests total
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks
- **Documentation**: Swagger/OpenAPI with authentication support
- **Containerization**: Docker & Docker Compose

## Features

### Authentication & Authorization System
- **Two-tier User System**: Main users (company owners) and regular team members
- **Company Registration**: Complete company onboarding with main user creation and automatic trial activation
- **JWT Authentication**: Access tokens (7-day expiry) and refresh tokens (30-day expiry)
- **Email Verification**: Required for account activation and email changes
- **Password Management**: Secure password reset with email verification
- **Email Integration**: Professional HTML emails via Gmail SMTP (verification, password reset, welcome, invitations)
- **Granular Permissions**: 4 sections (Registration, Records, Breedings, Finances) × 4 actions (view, add, edit, remove)
- **Role-based Access Control**: Main users have full access, team members have configurable permissions
- **Account Status Management**: Pending, active, inactive user states
- **Trial System**: Automatic 14-day trial periods for new companies with status tracking

### Core API Functionality
- RESTful API endpoints with comprehensive OpenAPI/Swagger documentation
- Global input validation and transformation with class-validator
- Structured error handling and logging
- Environment-based configuration management
- **Plans Management**: Complete pricing plans API for subscription management
- **Subscription Management**: Full subscription lifecycle management with trial periods
- **Payment Management**: Payment tracking, billing, and transaction management
- **Trial System**: 14-day trial periods with automatic management and status tracking
- **User Management**: Team member creation, permission management, profile updates
- **Company Management**: Company profile management and settings

### Security Features
- **Security Headers**: Comprehensive HTTP security headers via Helmet
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Per-IP request throttling with configurable limits (ThrottlerModule)
- **Input Validation**: Automatic payload validation and sanitization
- **Password Security**: bcrypt hashing with salt rounds
- **JWT Security**: Secure token generation and validation with configurable expiry
- **Security Monitoring**: Real-time detection of SQL injection, XSS, and path traversal attempts
- **Request Fingerprinting**: Detailed logging of suspicious activities
- **Authentication Guards**: JWT and permission-based route protection

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
- Authentication event logging

### Database & ORM Features
- **PostgreSQL**: Robust relational database with ACID compliance
- **Prisma ORM**: Type-safe database client with auto-generated types
- **Database Migrations**: Version-controlled schema changes
- **Database Seeding**: Automated initial data population with pricing plans
- **Connection Pooling**: Efficient database connection management
- **Type Safety**: Full TypeScript integration with database operations
- **Complex Relations**: Users, companies, authentication tokens, permissions, subscriptions, payments
- **Trial Management**: Built-in trial period tracking and automatic expiry handling

## Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher
- **PostgreSQL**: Version 15.x or higher (or use Docker Compose)
- **Docker & Docker Compose**: For containerized database setup (optional)

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

3. Set up the database:
```bash
# Option 1: Using Docker Compose (recommended for development)
docker-compose up -d postgres

# Option 2: Use your own PostgreSQL instance
# Make sure PostgreSQL is running and create a database named 'boinanuvem'
```

4. Set up environment variables:
```bash
# Copy the environment template to create your .env file
cp env.template .env

# The template includes all required variables with default values:
# - DATABASE_URL: PostgreSQL connection string
# - JWT_SECRET: Secret key for JWT token signing
# - FRONTEND_URL: Frontend application URL for email links
# - GMAIL_EMAIL: Gmail account for sending emails
# - GMAIL_PASSWORD: Gmail app password for SMTP authentication
# - CORS_ORIGIN: Allowed origins for CORS
# - Security settings: Rate limiting, request timeouts
# - Application settings: Port, API prefix, Swagger
# - Logging configuration
# 
# Edit .env file as needed for your environment
```

5. Set up the database schema and seed data:
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed the database with initial data (pricing plans)
npx prisma db seed
```

## Email Configuration

The application uses **Nodemailer** with Gmail SMTP to send transactional emails. This replaces the previous mock email service with real email functionality.

### Email Types
The system sends four types of professional HTML emails:

1. **Email Verification**: Sent during user registration and email changes
2. **Password Reset**: Sent when users request password reset
3. **Welcome Email**: Sent after successful account verification
4. **Team Member Invitation**: Sent when main users invite team members

### Gmail SMTP Setup

#### Prerequisites
- Gmail account for sending emails
- Gmail App Password (not your regular Gmail password)

#### Creating Gmail App Password
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings → Security → 2-Step Verification
3. Generate an "App Password" for "Mail"
4. Use this 16-character app password in your environment variables

#### Environment Variables
```bash
# Gmail SMTP Configuration
GMAIL_EMAIL=your-gmail-account@gmail.com
GMAIL_PASSWORD=your-16-character-app-password

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

#### Email Templates
All emails feature:
- Professional HTML design with Boi na Nuvem branding
- Responsive layout for mobile and desktop
- Portuguese language content for Brazilian users
- Fallback text versions for email clients without HTML support
- Security notices and professional messaging

#### Production Considerations
- Use a dedicated Gmail account for production emails
- Consider using Gmail Workspace for better deliverability
- Monitor email sending limits (Gmail: 500 emails/day for free accounts)
- Set up proper SPF, DKIM, and DMARC records for your domain
- For high-volume applications, consider upgrading to services like SendGrid or AWS SES

#### Troubleshooting Email Issues

**Common Issues:**
1. **"Invalid login" errors**: Ensure you're using an App Password, not your regular Gmail password
2. **"Less secure app access" errors**: App Passwords bypass this requirement
3. **Emails not being sent**: Check Gmail account limits and verify SMTP credentials
4. **Emails going to spam**: Set up proper domain authentication (SPF, DKIM, DMARC)

**Testing Email Configuration:**
```bash
# Test email sending in development
npm run start:dev

# Register a test user and check for verification email
# Check application logs for email sending confirmations
```

**Email Service Logs:**
- Successful sends: `Email sent successfully to user@example.com. Message ID: <message-id>`
- Failed sends: `Failed to send email to user@example.com: <error-details>`

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
npm run test               # Run unit tests (50 tests)
npm run test:integration   # Run integration tests (7 tests)
npm run test:e2e           # Run end-to-end tests (27 tests)
npm run test:all           # Run all test suites (84 tests total)
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:debug         # Run tests in debug mode

# Build
npm run build              # Build for production

# Database
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Run migrations in development
npx prisma migrate deploy  # Run migrations in production
npx prisma db seed         # Seed database with initial data
npx prisma studio          # Open Prisma Studio (database GUI)
```

### Code Quality Tools

The project uses several tools to maintain code quality:

- **ESLint**: Linting with TypeScript support and strict rules
- **Prettier**: Code formatting with consistent style
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters on staged files only

Pre-commit hooks automatically run:
- Code formatting check
- Linting with auto-fix
- TypeScript type checking

## API Documentation

### Swagger/OpenAPI
When `ENABLE_SWAGGER=true`, interactive API documentation is available at:
- **Development**: `http://localhost:3000/api-docs`
- **Production**: Disabled by default for security

The documentation includes:
- Complete API endpoint documentation with authentication
- Request/response schemas for all endpoints
- Interactive testing interface with JWT bearer token support
- Authentication examples and flows
- Plans API with filtering options
- User management and team member operations
- Company registration and management endpoints

### Authentication Endpoints

#### Company Registration & Authentication
- `POST /auth/register/company` - Register company with main user
- `POST /auth/login` - User login (returns JWT access & refresh tokens)
- `POST /auth/refresh` - Refresh access token using refresh token
- `POST /auth/logout` - Logout and invalidate refresh token

#### Email Verification & Password Management
- `POST /auth/verify-email` - Verify email with verification token
- `POST /auth/resend-verification` - Resend email verification
- `POST /auth/forgot-password` - Request password reset email
- `POST /auth/reset-password` - Reset password with reset token
- `POST /auth/change-password` - Change password (authenticated)

#### User Management
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update current user profile
- `GET /users` - List team members (main user only)
- `POST /users` - Create team member (main user only)
- `PUT /users/:id` - Update team member (main user only)
- `PUT /users/:id/permissions` - Update user permissions (main user only)
- `DELETE /users/:id` - Deactivate user (main user only)

#### Company Management
- `GET /companies/:id` - Get company details (authenticated)
- `PUT /companies/:id` - Update company details (main user only)

### Core Endpoints

#### Health Checks
- `GET /health` - Application health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

#### Metrics
- `GET /metrics` - Prometheus metrics (Prometheus format)

#### Application
- `GET /` - Basic application info and status

#### Plans Management
- `GET /plans` - Get all pricing plans (supports filtering by status)
  - Query parameters:
    - `status`: Filter by plan status (`active`, `inactive`, `all`) - defaults to `active`

#### Subscription Management
- `GET /subscriptions/company/:companyId` - Get company subscriptions (authenticated)
- `GET /subscriptions/company/:companyId/current` - Get current active subscription
- `POST /subscriptions` - Create new subscription (main user only)
- `PUT /subscriptions/:id` - Update subscription (main user only)
- `DELETE /subscriptions/:id` - Cancel subscription (main user only)

#### Payment Management
- `GET /payments/company/:companyId` - Get company payment history (authenticated)
- `GET /payments/:id` - Get specific payment details (authenticated)
- `POST /payments` - Create payment record (main user only)
- `PUT /payments/:id` - Update payment status (main user only)

## Trial System

### Overview
The Boinanuvem platform includes a comprehensive trial system that provides new companies with a 14-day free trial period to evaluate the platform before committing to a paid subscription.

### Trial Features
- **Automatic Trial Activation**: New companies automatically receive a 14-day trial upon registration
- **Trial Status Tracking**: Real-time monitoring of trial status (active, expired, converted)
- **Trial Information API**: Endpoints to check remaining trial days and status
- **Seamless Conversion**: Easy upgrade from trial to paid subscription
- **Grace Period Handling**: Proper handling of trial expiry and account limitations

### Trial Service
The `TrialService` provides comprehensive trial management functionality:

#### Trial Calculation
- Calculates remaining trial days based on company creation date
- Determines trial status (active, expired, converted)
- Handles companies with existing paid subscriptions
- Provides trial information for frontend display

#### Trial Status Types
- **active**: Trial is currently active with remaining days
- **expired**: Trial period has ended without conversion
- **converted**: Company has upgraded to a paid subscription
- **null**: No trial information available

### Trial Integration
- **Company Registration**: Trials are automatically created during company registration
- **Subscription Management**: Trial status affects subscription creation and management
- **Access Control**: Trial status can be used to limit feature access
- **Payment Processing**: Trial conversion triggers payment processing workflows

## Authentication & Authorization

### JWT Token System
- **Access Tokens**: 7-day expiry, used for API authentication
- **Refresh Tokens**: 30-day expiry, used to obtain new access tokens
- **Token Storage**: Refresh tokens stored in database with expiry tracking
- **Token Validation**: Automatic validation on protected routes

### Permission System
The application implements a granular permission system with:

#### Permission Structure
```typescript
{
  "registration": {
    "animals": { "view": true, "add": false, "edit": true, "remove": false },
    "locations": { "view": true, "add": true, "edit": true, "remove": false }
  },
  "records": {
    "health": { "view": true, "add": true, "edit": false, "remove": false },
    "breeding": { "view": true, "add": false, "edit": false, "remove": false }
  },
  "breedings": {
    "planning": { "view": true, "add": false, "edit": false, "remove": false },
    "tracking": { "view": true, "add": true, "edit": true, "remove": false }
  },
  "finances": {
    "expenses": { "view": false, "add": false, "edit": false, "remove": false },
    "revenue": { "view": false, "add": false, "edit": false, "remove": false }
  }
}
```

#### User Roles
- **Main Users**: Company owners with full access to all features and team management
- **Team Members**: Regular users with configurable permissions set by main users

### Route Protection
- **Public Routes**: Company registration, login, password reset
- **Authenticated Routes**: All user and company management endpoints
- **Permission-based Routes**: Team member operations, specific resource access
- **Main User Only Routes**: Team management, company settings, permission updates

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
- **Authentication Throttling**: Additional rate limiting on auth endpoints
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
- Authentication failures and suspicious login attempts

Security events are logged to `logs/security-*.log` and alerts to `logs/error-*.log`.

### Environment-Specific Security
- **Development**: Higher rate limits, detailed errors, Swagger enabled
- **Production**: Lower rate limits, generic errors, Swagger disabled

## Testing Strategy

The application has comprehensive test coverage with **197 tests** across multiple test types:

### Test Coverage Summary
- **Unit Tests**: 152 tests covering services, controllers, and guards
- **Integration Tests**: 7 tests for database operations and business logic
- **E2E Tests**: 33 tests for complete API endpoint workflows
- **Skipped Tests**: 3 tests (conditional or environment-specific)

### Test Categories
- **Authentication Tests**: Login, registration, token management, password operations
- **Authorization Tests**: Permission guards, role-based access control
- **User Management Tests**: Profile management, team member operations
- **Email Service Tests**: Verification emails, password reset emails, welcome emails
- **Plans Service Tests**: Pricing plan retrieval and filtering
- **Subscription Tests**: Subscription lifecycle, trial management, and billing cycles
- **Payment Tests**: Payment processing, status tracking, and transaction management
- **Trial System Tests**: Trial period calculations, expiry handling, and status management
- **Security Tests**: Rate limiting, input validation, CORS protection

### Running Tests
```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test              # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e         # End-to-end tests only

# Test with coverage
npm run test:cov

# Watch mode for development
npm run test:watch
```

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
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/boinanuvem"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key"
FRONTEND_URL="https://yourdomain.com"

# Email Configuration
GMAIL_EMAIL="your-production-email@gmail.com"
GMAIL_PASSWORD="your-gmail-app-password"

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=50
ENABLE_SWAGGER=false

# Optional Security Headers
HSTS_MAX_AGE=31536000
CSP_DIRECTIVES=default-src 'self'

# Optional Application Settings
PORT=3000
NODE_ENV=production
API_PREFIX=api/v1
```

#### Production Considerations
- Set `NODE_ENV=production`
- Configure proper `DATABASE_URL` for production database
- Set a strong, unique `JWT_SECRET` (minimum 32 characters)
- Configure proper CORS origins
- Set correct `FRONTEND_URL` for email links
- Disable Swagger documentation (`ENABLE_SWAGGER=false`)
- Set up log aggregation and monitoring
- Configure reverse proxy (nginx/Apache)
- Implement SSL/TLS termination
- Set up security monitoring alerts
- Run database migrations: `npx prisma migrate deploy`
- Ensure database connection pooling is properly configured
- Configure Gmail SMTP with proper app password
- Set up email monitoring and deliverability tracking

## Project Structure

```
src/
├── auth/                   # Authentication & authorization module
│   ├── decorators/        # Custom decorators (permissions, current user)
│   ├── dto/              # Authentication DTOs (login, register, etc.)
│   ├── guards/           # JWT and permissions guards
│   ├── strategies/       # Passport JWT strategy
│   ├── auth.controller.ts # Authentication endpoints
│   ├── auth.service.ts   # Authentication business logic
│   └── auth.module.ts    # Authentication module configuration
├── companies/             # Company management module
│   ├── dto/              # Company DTOs
│   ├── companies.controller.ts
│   ├── companies.service.ts
│   └── companies.module.ts
├── users/                 # User management module
│   ├── dto/              # User management DTOs
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── email/                 # Email service module
│   ├── email.service.ts  # Nodemailer Gmail SMTP service
│   └── email.module.ts   # Email module configuration
├── common/                # Shared utilities and configurations
│   ├── config/           # Environment and security configuration
│   ├── dto/              # Shared Data Transfer Objects
│   ├── guards/           # Security guards and middleware
│   ├── interceptors/     # Request/response interceptors
│   ├── logger/           # Custom logging service
│   └── services/         # Shared services (Prisma, Trial service, etc.)
├── health/               # Health check module
├── metrics/              # Prometheus metrics module
├── plans/                # Pricing plans management module
│   ├── dto/             # Plans-specific DTOs
│   ├── plans.controller.ts
│   ├── plans.service.ts
│   └── plans.module.ts
├── subscriptions/        # Subscription management module
│   ├── subscriptions.service.ts # Subscription lifecycle management
│   └── subscriptions.service.spec.ts # Subscription tests
├── payments/             # Payment management module
│   ├── payments.service.ts # Payment processing and tracking
│   └── payments.service.spec.ts # Payment tests
├── app.controller.ts     # Main application controller
├── app.module.ts         # Root application module
├── app.service.ts        # Main application service
└── main.ts              # Application bootstrap

prisma/                   # Database schema and migrations
├── migrations/           # Database migration files
├── schema.prisma        # Prisma schema definition (includes auth tables)
└── seed.ts             # Database seeding script

test/                     # End-to-end tests
├── auth.e2e-spec.ts     # Authentication E2E tests (if implemented)
├── app.e2e-spec.ts      # Application E2E tests
├── plans.e2e-spec.ts    # Plans E2E tests
└── security.e2e-spec.ts # Security E2E tests

logs/                     # Application logs (auto-generated)
dist/                     # Compiled JavaScript (auto-generated)
docker-compose.yml        # Docker services configuration
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. The schema includes:

### Authentication Tables

#### Companies
- **id**: Unique identifier (CUID)
- **cnpj**: Brazilian company registration number
- **companyName**: Company name
- **email**: Company contact email
- **phone**: Company phone number
- **address**: Complete address information (street, number, complement, neighborhood, city, state, zipCode)
- **coordinates**: Optional latitude/longitude for location services
- **status**: Company status (active, inactive)
- **trialStartDate/trialEndDate**: Trial period tracking
- **trialStatus**: Trial status (active, expired, converted)
- **createdAt/updatedAt**: Timestamps

#### Users
- **id**: Unique identifier (CUID)
- **email**: User email (unique)
- **name**: User full name
- **phone**: User phone number
- **cpf**: Brazilian individual registration number (optional)
- **password**: Hashed password (bcrypt)
- **address**: Optional complete address information
- **companyId**: Reference to company
- **mainUser**: Boolean flag for company owner
- **status**: User status (pending, active, inactive)
- **emailVerifiedAt**: Timestamp of email verification (nullable)
- **permissions**: JSON object with granular permissions
- **lastAccess**: Last login timestamp
- **createdAt/updatedAt**: Timestamps

#### Authentication Tokens
- **RefreshToken**: JWT refresh tokens with expiry and user association
- **EmailVerification**: Email verification tokens with usage tracking
- **PasswordReset**: Password reset tokens with usage tracking

#### Subscription Management Tables
- **CompanySubscription**: Subscription records linking companies to plans
  - Subscription status (active, cancelled, expired, trial)
  - Billing cycle (monthly, annual)
  - Trial period tracking
  - Start and end dates
- **CompanyPayment**: Payment transaction records
  - Payment amounts and currency (BRL)
  - Payment status (pending, paid, failed, refunded, cancelled)
  - Payment methods (credit_card, pix, bank_transfer, boleto)
  - External payment gateway integration
  - Due dates and payment dates

### Plans Table
Stores pricing plan information for the Boinanuvem platform:
- **id**: Unique identifier (CUID)
- **name**: Plan name (Mínimo, Básico, Padrão, Avançado)
- **description**: Plan description
- **monthlyPrice**: Monthly subscription price
- **annualPrice**: Annual subscription price (with discount)
- **limits**: JSON object containing plan limits (properties, locations, animals, members)
- **features**: Array of included features
- **popular**: Boolean flag for highlighting popular plans
- **status**: Plan status (active/inactive)
- **createdAt/updatedAt**: Timestamps

### Seeded Data
The database comes pre-populated with four pricing plans:
1. **Mínimo**: Entry-level plan (R$ 49,90/month)
2. **Básico**: Small properties plan (R$ 99,00/month)
3. **Padrão**: Growing properties plan (R$ 149,90/month) - Popular
4. **Avançado**: Large farms plan (R$ 249,90/month)

All plans include comprehensive cattle management features with varying limits on properties, locations, animals, and team members.

## Quick Start

For a rapid development setup:

```bash
# Clone and setup
git clone <repository-url>
cd boinanuvem-backend
npm install

# Start database
docker-compose up -d postgres

# Setup database
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3000` with Swagger documentation at `http://localhost:3000/api-docs`.

### Quick Test of Authentication

```bash
# Register a company (creates main user)
curl -X POST http://localhost:3000/api/auth/register/company \
  -H "Content-Type: application/json" \
  -d '{
    "cnpj": "12.345.678/0001-90",
    "companyName": "Test Company",
    "email": "company@test.com",
    "phone": "(11) 99999-9999",
    "street": "Test Street",
    "number": "123",
    "neighborhood": "Test Neighborhood",
    "city": "Test City",
    "state": "SP",
    "zipCode": "12345-678",
    "userName": "Test User",
    "userEmail": "user@test.com",
    "userPhone": "(11) 88888-8888",
    "userPassword": "password123"
  }'

# Note: Check your Gmail account for the verification email
# Click the verification link, then login to get JWT tokens
# The company will automatically receive a 14-day trial period
```

## Contributing & Development

### Development Workflow
1. Create a feature branch from `main`
2. Make changes following the established patterns
3. Write tests for new functionality
4. Ensure all tests pass: `npm run test:all`
5. Run quality checks: `npm run check`
6. Commit changes (pre-commit hooks will run automatically)
7. Create a pull request

### Testing Strategy
- **Unit Tests**: Test individual components, services, and guards
- **Integration Tests**: Test database operations and business logic
- **E2E Tests**: Test complete request/response cycles and authentication flows
- **Security Tests**: Validate security measures and configurations
- **Coverage**: Maintain high test coverage for critical authentication paths

### Code Standards
- Follow TypeScript best practices with strict type checking
- Use NestJS decorators and dependency injection patterns
- Implement proper error handling with custom exceptions
- Add comprehensive logging for debugging and security monitoring
- Document complex business logic and authentication flows
- Follow security-first development principles
- Write tests for all new features and bug fixes

### Authentication Development Guidelines
- Always hash passwords with bcrypt (minimum 12 salt rounds)
- Use JWT tokens with appropriate expiry times
- Implement proper token refresh mechanisms
- Validate all user inputs with class-validator
- Log authentication events for security monitoring
- Test authentication flows thoroughly
- Follow principle of least privilege for permissions

## Support & Resources

- **NestJS Documentation**: [https://docs.nestjs.com](https://docs.nestjs.com)
- **Prisma Documentation**: [https://www.prisma.io/docs](https://www.prisma.io/docs)
- **JWT Best Practices**: [https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- **Security Best Practices**: [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- **TypeScript Handbook**: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)

## License

This project is private and unlicensed. All rights reserved.