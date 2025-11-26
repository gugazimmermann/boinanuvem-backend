import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import * as promClient from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Clear all metrics before each test
    promClient.register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
    promClient.register.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with proper logging', () => {
    // The service is already created in beforeEach, so we need to create a new one to test initialization
    const newLoggerSpy = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation();

    new MetricsService();

    expect(newLoggerSpy).toHaveBeenCalledWith('Initializing MetricsService');
    expect(newLoggerSpy).toHaveBeenCalledWith(
      'MetricsService initialized successfully',
    );

    newLoggerSpy.mockRestore();
  });

  describe('getRegistry', () => {
    it('should return the prometheus registry', () => {
      const registry = service.getRegistry();
      expect(registry).toBeInstanceOf(promClient.Registry);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics as string', async () => {
      const metrics = await service.getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('boinanuvem_');
    });

    it('should log debug information during metrics collection', async () => {
      await service.getMetrics();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Collecting metrics from registry',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Collected \d+ lines of metrics/),
      );
    });

    it('should handle errors during metrics collection', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const registryMock = jest
        .spyOn(service.getRegistry(), 'metrics')
        .mockRejectedValue(new Error('Registry error'));

      await expect(service.getMetrics()).rejects.toThrow('Registry error');
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to collect metrics',
        expect.any(String),
      );

      errorSpy.mockRestore();
      registryMock.mockRestore();
    });
  });

  describe('incrementHttpRequests', () => {
    it('should increment HTTP request counter', () => {
      const method = 'GET';
      const route = '/api/test';
      const statusCode = 200;

      service.incrementHttpRequests(method, route, statusCode);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Incrementing HTTP request counter: ${method} ${route} ${statusCode}`,
      );
    });

    it('should handle different HTTP methods and status codes', () => {
      service.incrementHttpRequests('POST', '/api/users', 201);
      service.incrementHttpRequests('PUT', '/api/users/1', 200);
      service.incrementHttpRequests('DELETE', '/api/users/1', 204);

      // Verify all calls were logged
      expect(loggerSpy).toHaveBeenCalledWith(
        'Incrementing HTTP request counter: POST /api/users 201',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Incrementing HTTP request counter: PUT /api/users/1 200',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Incrementing HTTP request counter: DELETE /api/users/1 204',
      );
    });
  });

  describe('observeHttpRequestDuration', () => {
    it('should observe HTTP request duration', () => {
      const method = 'GET';
      const route = '/api/test';
      const statusCode = 200;
      const duration = 0.5;

      // Should not throw
      expect(() => {
        service.observeHttpRequestDuration(method, route, statusCode, duration);
      }).not.toThrow();
    });

    it('should handle various duration values', () => {
      service.observeHttpRequestDuration('GET', '/fast', 200, 0.1);
      service.observeHttpRequestDuration('POST', '/slow', 200, 5.0);
      service.observeHttpRequestDuration('PUT', '/timeout', 500, 10.0);

      // Should not throw for any duration
      expect(true).toBe(true);
    });
  });

  describe('incrementHttpRequestsInProgress', () => {
    it('should increment requests in progress counter', () => {
      const method = 'GET';
      const route = '/api/test';

      expect(() => {
        service.incrementHttpRequestsInProgress(method, route);
      }).not.toThrow();
    });
  });

  describe('decrementHttpRequestsInProgress', () => {
    it('should decrement requests in progress counter', () => {
      const method = 'GET';
      const route = '/api/test';

      expect(() => {
        service.decrementHttpRequestsInProgress(method, route);
      }).not.toThrow();
    });
  });

  describe('createCustomCounter', () => {
    it('should create a custom counter with default labels', () => {
      const counter = service.createCustomCounter(
        'test_counter',
        'Test counter',
      );

      expect(counter).toBeInstanceOf(promClient.Counter);
      expect(counter.name).toBe('boinanuvem_test_counter');
    });

    it('should create a custom counter with custom labels', () => {
      const counter = service.createCustomCounter(
        'labeled_counter',
        'Counter with labels',
        ['label1', 'label2'],
      );

      expect(counter).toBeInstanceOf(promClient.Counter);
      expect(counter.name).toBe('boinanuvem_labeled_counter');
    });

    it('should register counter in the service registry', async () => {
      service.createCustomCounter('registry_counter', 'Registry test');

      const metrics = await service.getMetrics();
      expect(metrics).toContain('boinanuvem_registry_counter');
    });
  });

  describe('createCustomGauge', () => {
    it('should create a custom gauge with default labels', () => {
      const gauge = service.createCustomGauge('test_gauge', 'Test gauge');

      expect(gauge).toBeInstanceOf(promClient.Gauge);
      expect(gauge.name).toBe('boinanuvem_test_gauge');
    });

    it('should create a custom gauge with custom labels', () => {
      const gauge = service.createCustomGauge(
        'labeled_gauge',
        'Gauge with labels',
        ['label1', 'label2'],
      );

      expect(gauge).toBeInstanceOf(promClient.Gauge);
      expect(gauge.name).toBe('boinanuvem_labeled_gauge');
    });

    it('should register gauge in the service registry', async () => {
      const gauge = service.createCustomGauge(
        'registry_gauge',
        'Registry test',
      );
      gauge.set(42);

      const metrics = await service.getMetrics();
      expect(metrics).toContain('boinanuvem_registry_gauge');
    });
  });

  describe('createCustomHistogram', () => {
    it('should create a custom histogram with default configuration', () => {
      const histogram = service.createCustomHistogram(
        'test_histogram',
        'Test histogram',
      );

      expect(histogram).toBeInstanceOf(promClient.Histogram);
      expect(histogram.name).toBe('boinanuvem_test_histogram');
    });

    it('should create a custom histogram with custom labels', () => {
      const histogram = service.createCustomHistogram(
        'labeled_histogram',
        'Histogram with labels',
        ['label1', 'label2'],
      );

      expect(histogram).toBeInstanceOf(promClient.Histogram);
      expect(histogram.name).toBe('boinanuvem_labeled_histogram');
    });

    it('should create a custom histogram with custom buckets', () => {
      const customBuckets = [0.1, 0.5, 1, 2, 5];
      const histogram = service.createCustomHistogram(
        'custom_buckets_histogram',
        'Histogram with custom buckets',
        [],
        customBuckets,
      );

      expect(histogram).toBeInstanceOf(promClient.Histogram);
      expect(histogram.name).toBe('boinanuvem_custom_buckets_histogram');
    });

    it('should register histogram in the service registry', async () => {
      const histogram = service.createCustomHistogram(
        'registry_histogram',
        'Registry test',
      );
      histogram.observe(1.5);

      const metrics = await service.getMetrics();
      expect(metrics).toContain('boinanuvem_registry_histogram');
    });
  });

  describe('integration tests', () => {
    it('should track complete HTTP request lifecycle', async () => {
      const method = 'POST';
      const route = '/api/users';
      const statusCode = 201;
      const duration = 0.75;

      // Simulate request start
      service.incrementHttpRequestsInProgress(method, route);

      // Simulate request completion
      service.incrementHttpRequests(method, route, statusCode);
      service.observeHttpRequestDuration(method, route, statusCode, duration);
      service.decrementHttpRequestsInProgress(method, route);

      const metrics = await service.getMetrics();
      expect(metrics).toContain('boinanuvem_http_requests_total');
      expect(metrics).toContain('boinanuvem_http_request_duration_seconds');
      expect(metrics).toContain('boinanuvem_http_requests_in_progress');
    });

    it('should include application info in metrics', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toContain('boinanuvem_app_info');
      expect(metrics).toContain('version="0.0.1"');
      expect(metrics).toContain('name="boinanuvem-backend"');
    });

    it('should include default Node.js metrics', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toContain('boinanuvem_process_');
      expect(metrics).toContain('boinanuvem_nodejs_');
    });
  });
});
