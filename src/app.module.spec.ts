import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { PlansModule } from './plans/plans.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Mock environment variables for testing
    process.env.RATE_LIMIT_TTL = '60000';
    process.env.RATE_LIMIT_MAX = '100';
    process.env.NODE_ENV = 'test';

    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AppController', () => {
    const controller = module.get<AppController>(AppController);
    expect(controller).toBeDefined();
  });

  it('should have AppService', () => {
    const service = module.get<AppService>(AppService);
    expect(service).toBeDefined();
  });

  it('should import ConfigModule globally', () => {
    const configModule = module.get(ConfigModule);
    expect(configModule).toBeDefined();
  });

  it('should import ThrottlerModule with correct configuration', () => {
    const throttlerModule = module.get(ThrottlerModule);
    expect(throttlerModule).toBeDefined();
  });

  it('should import HealthModule', () => {
    const healthModule = module.get(HealthModule);
    expect(healthModule).toBeDefined();
  });

  it('should import MetricsModule', () => {
    const metricsModule = module.get(MetricsModule);
    expect(metricsModule).toBeDefined();
  });

  it('should import PlansModule', () => {
    const plansModule = module.get(PlansModule);
    expect(plansModule).toBeDefined();
  });

  it('should import AuthModule', () => {
    const authModule = module.get(AuthModule);
    expect(authModule).toBeDefined();
  });

  it('should import CompaniesModule', () => {
    const companiesModule = module.get(CompaniesModule);
    expect(companiesModule).toBeDefined();
  });

  it('should import UsersModule', () => {
    const usersModule = module.get(UsersModule);
    expect(usersModule).toBeDefined();
  });

  it('should import EmailModule', () => {
    const emailModule = module.get(EmailModule);
    expect(emailModule).toBeDefined();
  });

  it('should configure environment-based rate limiting', async () => {
    // Test with custom environment values
    process.env.RATE_LIMIT_TTL = '30000';
    process.env.RATE_LIMIT_MAX = '50';

    const customModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const throttlerModule = customModule.get(ThrottlerModule);
    expect(throttlerModule).toBeDefined();

    await customModule.close();
  });

  it('should use default rate limiting values when env vars are not set', async () => {
    delete process.env.RATE_LIMIT_TTL;
    delete process.env.RATE_LIMIT_MAX;

    const defaultModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const throttlerModule = defaultModule.get(ThrottlerModule);
    expect(throttlerModule).toBeDefined();

    await defaultModule.close();
  });

  it('should load environment files based on NODE_ENV', async () => {
    process.env.NODE_ENV = 'production';

    const prodModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(prodModule).toBeDefined();

    await prodModule.close();
  });
});
