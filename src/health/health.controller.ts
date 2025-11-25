import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HealthCheckResponseDto } from '../common/dto/health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Comprehensive health check',
    description:
      'Performs comprehensive health checks including memory heap, RSS, and disk storage validation',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check passed - all systems operational',
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Health check failed - one or more systems are down',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        info: { type: 'object' },
        error: {
          type: 'object',
          properties: {
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'down' },
                message: {
                  type: 'string',
                  example: 'Used heap exceeds the threshold',
                },
              },
            },
          },
        },
        details: { type: 'object' },
      },
    },
  })
  check() {
    this.logger.debug('Performing comprehensive health check');
    try {
      const result = this.health.check([
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
        () =>
          this.disk.checkStorage('storage', {
            path: '/',
            thresholdPercent: 0.9,
          }),
      ]);
      this.logger.debug('Health check completed successfully');
      return result;
    } catch (error) {
      this.logger.error(
        'Health check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Simple liveness check to determine if the application is running and responsive',
  })
  @ApiResponse({
    status: 200,
    description: 'Liveness check passed - application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Liveness check failed - application is not responsive',
  })
  checkLiveness() {
    this.logger.debug('Performing liveness check');
    try {
      const result = this.health.check([
        () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
      ]);
      this.logger.debug('Liveness check completed successfully');
      return result;
    } catch (error) {
      this.logger.error(
        'Liveness check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Comprehensive readiness check to determine if the application is ready to serve traffic',
  })
  @ApiResponse({
    status: 200,
    description:
      'Readiness check passed - application is ready to serve traffic',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            memory_rss: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            storage: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            memory_rss: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            storage: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description:
      'Readiness check failed - application is not ready to serve traffic',
  })
  checkReadiness() {
    this.logger.debug('Performing readiness check');
    try {
      const result = this.health.check([
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
        () =>
          this.disk.checkStorage('storage', {
            path: '/',
            thresholdPercent: 0.9,
          }),
      ]);
      this.logger.debug('Readiness check completed successfully');
      return result;
    } catch (error) {
      this.logger.error(
        'Readiness check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
