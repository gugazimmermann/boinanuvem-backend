import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: jest.Mocked<MetricsService>;

  const mockPrometheusMetrics = `# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.123456

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total 0.098765

# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 29360128

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 15728640

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status_code="200"} 42

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 10
http_request_duration_seconds_bucket{le="0.5"} 25
http_request_duration_seconds_bucket{le="1"} 40
http_request_duration_seconds_bucket{le="+Inf"} 42
http_request_duration_seconds_sum 15.5
http_request_duration_seconds_count 42`;

  beforeEach(async () => {
    const mockMetricsService = {
      getMetrics: jest.fn(),
      incrementHttpRequests: jest.fn(),
      recordHttpDuration: jest.fn(),
      incrementUserRegistrations: jest.fn(),
      incrementCompanyRegistrations: jest.fn(),
      incrementSubscriptions: jest.fn(),
      recordPaymentAmount: jest.fn(),
      incrementEmailsSent: jest.fn(),
      incrementAuthAttempts: jest.fn(),
      recordDatabaseQueryDuration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        Logger,
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return Prometheus metrics successfully', async () => {
      metricsService.getMetrics.mockResolvedValue(mockPrometheusMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(mockPrometheusMetrics);
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should return metrics in proper Prometheus format', async () => {
      metricsService.getMetrics.mockResolvedValue(mockPrometheusMetrics);

      const result = await controller.getMetrics();

      // Check that the result contains Prometheus format elements
      expect(result).toContain('# HELP');
      expect(result).toContain('# TYPE');
      expect(result).toContain('process_cpu_user_seconds_total');
      expect(result).toContain('nodejs_heap_size_total_bytes');
      expect(result).toContain('http_requests_total');
    });

    it('should handle empty metrics response', async () => {
      metricsService.getMetrics.mockResolvedValue('');

      const result = await controller.getMetrics();

      expect(result).toBe('');
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should log debug messages during successful metrics retrieval', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();
      metricsService.getMetrics.mockResolvedValue(mockPrometheusMetrics);

      await controller.getMetrics();

      expect(loggerSpy).toHaveBeenCalledWith('Fetching Prometheus metrics');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Successfully retrieved Prometheus metrics',
      );

      loggerSpy.mockRestore();
    });

    it('should handle metrics service errors', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const error = new Error('Metrics service error');
      metricsService.getMetrics.mockRejectedValue(error);

      await expect(controller.getMetrics()).rejects.toThrow(
        'Metrics service error',
      );
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to retrieve metrics',
        error.stack,
      );

      loggerSpy.mockRestore();
    });

    it('should log error messages when metrics retrieval fails', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const error = new Error('Metrics service error');
      metricsService.getMetrics.mockRejectedValue(error);

      try {
        await controller.getMetrics();
      } catch {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to retrieve metrics',
        error.stack,
      );

      loggerSpy.mockRestore();
    });

    it('should handle non-Error objects', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const nonError = 'String error';
      metricsService.getMetrics.mockRejectedValue(nonError);

      try {
        await controller.getMetrics();
      } catch {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to retrieve metrics',
        'String error',
      );

      loggerSpy.mockRestore();
    });

    it('should handle metrics service timeout', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      metricsService.getMetrics.mockRejectedValue(timeoutError);

      await expect(controller.getMetrics()).rejects.toThrow('Request timeout');
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to retrieve metrics',
        timeoutError.stack,
      );

      loggerSpy.mockRestore();
    });

    it('should handle large metrics response', async () => {
      const largeMetrics = mockPrometheusMetrics.repeat(100);
      metricsService.getMetrics.mockResolvedValue(largeMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(largeMetrics);
      expect(result.length).toBeGreaterThan(mockPrometheusMetrics.length);
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle metrics with special characters', async () => {
      const specialMetrics = `# HELP test_metric Test metric with special chars
# TYPE test_metric gauge
test_metric{label="value with spaces and symbols: !@#$%"} 123.45`;

      metricsService.getMetrics.mockResolvedValue(specialMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(specialMetrics);
      expect(result).toContain('!@#$%');
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent metrics requests', async () => {
      metricsService.getMetrics.mockResolvedValue(mockPrometheusMetrics);

      const promises = Array(5)
        .fill(null)
        .map(() => controller.getMetrics());
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBe(mockPrometheusMetrics);
      });
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(5);
    });
  });

  describe('error scenarios', () => {
    it('should propagate service errors without modification', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const customError = new Error('Custom metrics error');
      customError.name = 'CustomError';
      metricsService.getMetrics.mockRejectedValue(customError);

      await expect(controller.getMetrics()).rejects.toThrow(customError);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to retrieve metrics',
        customError.stack,
      );

      loggerSpy.mockRestore();
    });

    it('should handle undefined metrics response', async () => {
      metricsService.getMetrics.mockResolvedValue(undefined as any);

      const result = await controller.getMetrics();

      expect(result).toBeUndefined();
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle null metrics response', async () => {
      metricsService.getMetrics.mockResolvedValue(null as any);

      const result = await controller.getMetrics();

      expect(result).toBeNull();
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('logging behavior', () => {
    it('should not log sensitive information in debug messages', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();
      metricsService.getMetrics.mockResolvedValue(mockPrometheusMetrics);

      await controller.getMetrics();

      const debugCalls = loggerSpy.mock.calls;
      debugCalls.forEach((call) => {
        expect(call[0]).not.toContain('password');
        expect(call[0]).not.toContain('secret');
        expect(call[0]).not.toContain('token');
      });

      loggerSpy.mockRestore();
    });

    it('should log appropriate level messages', async () => {
      const debugSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      metricsService.getMetrics.mockResolvedValue(mockPrometheusMetrics);

      await controller.getMetrics();

      expect(debugSpy).toHaveBeenCalledTimes(2);
      expect(errorSpy).not.toHaveBeenCalled();

      debugSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
