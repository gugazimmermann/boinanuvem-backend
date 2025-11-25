import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as Express from 'express';
import { AppModule } from './app.module';
import { FileLoggerService } from './common/logger/file-logger.service';

async function bootstrap() {
  const fileLogger = new FileLoggerService();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.useLogger(fileLogger);

  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);

  app.enableShutdownHooks();

  const helmetConfig = configService.get('security.helmet') as {
    contentSecurityPolicy?: boolean | Record<string, unknown>;
    hsts?: boolean | Record<string, unknown>;
  };
  app.use(
    helmet({
      ...(helmetConfig?.contentSecurityPolicy && {
        contentSecurityPolicy: helmetConfig.contentSecurityPolicy,
      }),
      ...(helmetConfig?.hsts && { hsts: helmetConfig.hsts }),
      crossOriginEmbedderPolicy: false,
    }),
  );

  const corsConfig = configService.get('security.cors') as Record<
    string,
    unknown
  >;
  app.enableCors(corsConfig);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  const requestConfig = configService.get('security.request') as {
    timeout: number;
  };
  app.use(
    (
      req: Express.Request & { setTimeout: (timeout: number) => void },
      _res: Express.Response,
      next: () => void,
    ) => {
      req.setTimeout(requestConfig?.timeout || 30000);
      next();
    },
  );

  const apiPrefix = configService.get<string>('API_PREFIX');
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix, {
      exclude: ['/health', '/metrics', '/api-docs'],
    });
  }

  const port = (configService.get('PORT') as number) ?? 3000;

  const environment =
    (configService.get('NODE_ENV') as string) || 'development';
  const enableSwagger =
    (configService.get('ENABLE_SWAGGER') as boolean) &&
    environment !== 'production';

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Boinanuvem Backend API')
      .setDescription(
        'API documentation for Boinanuvem backend service with health checks and metrics',
      )
      .setVersion('1.0')
      .addTag('app', 'Main application endpoints')
      .addTag('health', 'Health check endpoints')
      .addTag('metrics', 'Prometheus metrics endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    const swaggerPath: string =
      environment === 'development' ? 'api-docs' : 'docs';
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: false,
        displayRequestDuration: true,
        filter: true,
        showExtensions: false,
        showCommonExtensions: false,
      },
      customSiteTitle: 'Boinanuvem API Documentation',
      customfavIcon: '/favicon.ico',
      ...(environment === 'production' && {
        customJs: ['/swagger-security.js'],
      }),
      explorer: environment !== 'production',
    });

    logger.log(
      `Swagger documentation available at: http://localhost:${port}/${swaggerPath}`,
    );
  }

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${environment}`);
  logger.log(`Health checks available at: http://localhost:${port}/health`);
  logger.log(`Metrics available at: http://localhost:${port}/metrics`);

  logger.log('Security features enabled:');
  logger.log('- CORS protection: ✓');
  logger.log('- Rate limiting: ✓');
  logger.log('- Input validation: ✓');
  logger.log('- Security headers (Helmet): ✓');
  logger.log('- Request logging: ✓');
  logger.log('- Security monitoring: ✓');
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error starting application:', (error as Error).stack || error);
  process.exit(1);
});
