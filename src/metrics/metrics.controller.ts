import { Controller, Get, Header, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description:
      'Returns application metrics in Prometheus format for monitoring and observability',
  })
  @ApiProduces('text/plain')
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics returned successfully',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: `# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.123456

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total 0.098765

# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.222221

# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
# TYPE process_start_time_seconds gauge
process_start_time_seconds 1700000000

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 50331648

# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 29360128

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 15728640`,
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error while retrieving metrics',
  })
  async getMetrics(): Promise<string> {
    this.logger.debug('Fetching Prometheus metrics');
    try {
      const metrics = await this.metricsService.getMetrics();
      this.logger.debug('Successfully retrieved Prometheus metrics');
      return metrics;
    } catch (error) {
      this.logger.error(
        'Failed to retrieve metrics',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
