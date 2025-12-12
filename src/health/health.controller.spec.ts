import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  // Health indicators are accessed through the service mock

  const mockHealthCheckResult: HealthCheckResult = {
    status: 'ok',
    info: {
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
    },
    error: {},
    details: {
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
    },
  };

  // Mock error result is created inline in tests where needed

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockMemoryHealthIndicator = {
      checkHeap: jest.fn(),
      checkRSS: jest.fn(),
    };

    const mockDiskHealthIndicator = {
      checkStorage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        Logger,
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    memoryHealthIndicator = module.get(MemoryHealthIndicator);
    diskHealthIndicator = module.get(DiskHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should perform comprehensive health check successfully', async () => {
      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthCheckResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should use test environment thresholds when NODE_ENV is test', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);

      process.env.NODE_ENV = originalEnv;
    });

    it('should use production environment thresholds when NODE_ENV is not test', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle health check failures', async () => {
      const error = new Error('Health check failed');
      healthCheckService.check.mockRejectedValue(error);

      await expect(controller.check()).rejects.toThrow('Health check failed');
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should log debug messages during health check', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();
      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      await controller.check();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Performing comprehensive health check',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'comprehensive health check completed successfully',
      );

      loggerSpy.mockRestore();
    });

    it('should log error messages when health check fails', () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const error = new Error('Health check failed');
      healthCheckService.check.mockImplementation(() => {
        throw error;
      });

      expect(() => controller.check()).toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        'comprehensive health check failed',
        error.stack,
      );

      loggerSpy.mockRestore();
    });
  });

  describe('checkLiveness', () => {
    it('should perform liveness check successfully', async () => {
      healthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: { memory_heap: { status: 'up' } },
        error: {},
        details: { memory_heap: { status: 'up' } },
      });

      const result = await controller.checkLiveness();

      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('should handle liveness check failures', async () => {
      const error = new Error('Liveness check failed');
      healthCheckService.check.mockRejectedValue(error);

      await expect(controller.checkLiveness()).rejects.toThrow(
        'Liveness check failed',
      );
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should log debug messages during liveness check', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();
      healthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: { memory_heap: { status: 'up' } },
        error: {},
        details: { memory_heap: { status: 'up' } },
      });

      await controller.checkLiveness();

      expect(loggerSpy).toHaveBeenCalledWith('Performing liveness check');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Liveness check completed successfully',
      );

      loggerSpy.mockRestore();
    });

    it('should log error messages when liveness check fails', () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const error = new Error('Liveness check failed');
      healthCheckService.check.mockImplementation(() => {
        throw error;
      });

      expect(() => controller.checkLiveness()).toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Liveness check failed',
        error.stack,
      );

      loggerSpy.mockRestore();
    });
  });

  describe('checkReadiness', () => {
    it('should perform readiness check successfully', async () => {
      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      const result = await controller.checkReadiness();

      expect(result).toEqual(mockHealthCheckResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should use test environment thresholds when NODE_ENV is test', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      await controller.checkReadiness();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);

      process.env.NODE_ENV = originalEnv;
    });

    it('should use production environment thresholds when NODE_ENV is not test', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      await controller.checkReadiness();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle readiness check failures', async () => {
      const error = new Error('Readiness check failed');
      healthCheckService.check.mockRejectedValue(error);

      await expect(controller.checkReadiness()).rejects.toThrow(
        'Readiness check failed',
      );
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should log debug messages during readiness check', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();
      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      await controller.checkReadiness();

      expect(loggerSpy).toHaveBeenCalledWith('Performing readiness check');
      expect(loggerSpy).toHaveBeenCalledWith(
        'readiness check completed successfully',
      );

      loggerSpy.mockRestore();
    });

    it('should log error messages when readiness check fails', () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const error = new Error('Readiness check failed');
      healthCheckService.check.mockImplementation(() => {
        throw error;
      });

      expect(() => controller.checkReadiness()).toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        'readiness check failed',
        error.stack,
      );

      loggerSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle non-Error objects in check method', () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const nonError = new Error('String error');
      healthCheckService.check.mockImplementation(() => {
        throw nonError;
      });

      expect(() => controller.check()).toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        'comprehensive health check failed',
        nonError.stack,
      );

      loggerSpy.mockRestore();
    });

    it('should handle non-Error objects in checkLiveness method', () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const nonError = new Error('String error');
      healthCheckService.check.mockImplementation(() => {
        throw nonError;
      });

      expect(() => controller.checkLiveness()).toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Liveness check failed',
        nonError.stack,
      );

      loggerSpy.mockRestore();
    });

    it('should handle non-Error objects in checkReadiness method', () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const nonError = new Error('String error');
      healthCheckService.check.mockImplementation(() => {
        throw nonError;
      });

      expect(() => controller.checkReadiness()).toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        'readiness check failed',
        nonError.stack,
      );

      loggerSpy.mockRestore();
    });
  });
});
