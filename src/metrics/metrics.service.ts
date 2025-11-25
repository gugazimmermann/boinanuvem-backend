import { Injectable, Logger } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: promClient.Registry;
  private readonly httpRequestsTotal: promClient.Counter;
  private readonly httpRequestDuration: promClient.Histogram;
  private readonly httpRequestsInProgress: promClient.Gauge;
  private readonly systemMetrics: promClient.Gauge[];

  constructor() {
    this.logger.debug('Initializing MetricsService');
    this.registry = new promClient.Registry();

    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: 'boinanuvem_',
    });

    this.httpRequestsTotal = new promClient.Counter({
      name: 'boinanuvem_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'boinanuvem_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry],
    });

    this.httpRequestsInProgress = new promClient.Gauge({
      name: 'boinanuvem_http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });

    this.systemMetrics = [
      new promClient.Gauge({
        name: 'boinanuvem_app_info',
        help: 'Application information',
        labelNames: ['version', 'name'],
        registers: [this.registry],
      }),
    ];

    this.systemMetrics[0].set(
      { version: '0.0.1', name: 'boinanuvem-backend' },
      1,
    );

    this.logger.debug('MetricsService initialized successfully');
  }

  getRegistry(): promClient.Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    this.logger.debug('Collecting metrics from registry');
    try {
      const metrics = await this.registry.metrics();
      this.logger.debug(
        `Collected ${metrics.split('\n').length} lines of metrics`,
      );
      return metrics;
    } catch (error) {
      this.logger.error(
        'Failed to collect metrics',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  incrementHttpRequests(
    method: string,
    route: string,
    statusCode: number,
  ): void {
    this.logger.debug(
      `Incrementing HTTP request counter: ${method} ${route} ${statusCode}`,
    );
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  observeHttpRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode.toString(),
      },
      duration,
    );
  }

  incrementHttpRequestsInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.inc({ method, route });
  }

  decrementHttpRequestsInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.dec({ method, route });
  }

  createCustomCounter(
    name: string,
    help: string,
    labelNames: string[] = [],
  ): promClient.Counter {
    return new promClient.Counter({
      name: `boinanuvem_${name}`,
      help,
      labelNames,
      registers: [this.registry],
    });
  }

  createCustomGauge(
    name: string,
    help: string,
    labelNames: string[] = [],
  ): promClient.Gauge {
    return new promClient.Gauge({
      name: `boinanuvem_${name}`,
      help,
      labelNames,
      registers: [this.registry],
    });
  }

  createCustomHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[],
  ): promClient.Histogram {
    const config: promClient.HistogramConfiguration<string> = {
      name: `boinanuvem_${name}`,
      help,
      labelNames,
      registers: [this.registry],
      ...(buckets && { buckets }),
    };

    return new promClient.Histogram(config);
  }
}
