import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsMiddleware } from './metrics.middleware';
import { AppController } from '../app.controller';
import { HealthController } from '../health/health.controller';

@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .forRoutes(AppController, HealthController, MetricsController);
  }
}
