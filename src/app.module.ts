import { Module, Logger } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { PlansModule } from './plans/plans.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { PaymentsModule } from './payments/payments.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SecurityLoggingInterceptor } from './common/interceptors/security-logging.interceptor';
import { FileLoggerService } from './common/logger/file-logger.service';
import { validate } from './common/config/env.validation';
import securityConfig from './common/config/security.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [securityConfig],
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10),
            limit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
          },
        ],
      }),
    }),
    HealthModule,
    MetricsModule,
    PlansModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    EmailModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Logger,
    FileLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityLoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [Logger, FileLoggerService],
})
export class AppModule {}
