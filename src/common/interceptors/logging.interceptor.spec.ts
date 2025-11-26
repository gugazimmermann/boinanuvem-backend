import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { FileLoggerService } from '../logger/file-logger.service';
import { Observable, of, throwError } from 'rxjs';
import { Request, Response } from 'express';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let fileLoggerService: jest.Mocked<FileLoggerService>;
  let loggerSpy: jest.SpyInstance;

  const mockFileLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        { provide: FileLoggerService, useValue: mockFileLoggerService },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    fileLoggerService = module.get(FileLoggerService);
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockContext: ExecutionContext;
    let mockCallHandler: CallHandler;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: '/api/test',
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0 (Test Browser)',
        },
      };

      mockResponse = {
        statusCode: 200,
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest as Request,
          getResponse: () => mockResponse as Response,
        }),
      } as ExecutionContext;

      mockCallHandler = {
        handle: () => of('test response'),
      };
    });

    it('should log incoming request and successful completion', (done) => {
      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: (data) => {
          expect(data).toBe('test response');

          // Check that request was logged
          expect(fileLoggerService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Incoming request',
              method: 'GET',
              url: '/api/test',
              ip: '192.168.1.1',
              userAgent: 'Mozilla/5.0 (Test Browser)',
              requestId: expect.stringMatching(/^req_\d+_[a-z0-9]{9}$/),
            }),
            'HTTP',
          );

          // Check that completion was logged
          expect(fileLoggerService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request completed',
              method: 'GET',
              url: '/api/test',
              statusCode: 200,
              duration: expect.stringMatching(/^\d+ms$/),
              requestId: expect.stringMatching(/^req_\d+_[a-z0-9]{9}$/),
            }),
            'HTTP',
          );

          done();
        },
        error: done,
      });
    });

    it('should handle requests without user-agent header', (done) => {
      mockRequest.headers = {};

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          expect(fileLoggerService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              userAgent: '',
            }),
            'HTTP',
          );
          done();
        },
        error: done,
      });
    });

    it('should log errors when request fails', (done) => {
      const testError = new Error('Test error message');
      testError.stack = 'Error: Test error message\n    at test.js:1:1';

      // Set response status to undefined to trigger default 500
      mockResponse.statusCode = undefined;

      mockCallHandler = {
        handle: () => throwError(() => testError),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach next'));
        },
        error: (error) => {
          expect(error).toBe(testError);

          // Check that error was logged
          expect(fileLoggerService.error).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request failed',
              method: 'GET',
              url: '/api/test',
              statusCode: 500, // Default when no status code is set
              duration: expect.stringMatching(/^\d+ms$/),
              error: 'Test error message',
              stack: 'Error: Test error message\n    at test.js:1:1',
              requestId: expect.stringMatching(/^req_\d+_[a-z0-9]{9}$/),
            }),
            'Error: Test error message\n    at test.js:1:1',
            'HTTP',
          );

          done();
        },
      });
    });

    it('should handle errors without stack trace', (done) => {
      const testError = new Error('Test error message');
      delete testError.stack;

      mockCallHandler = {
        handle: () => throwError(() => testError),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach next'));
        },
        error: () => {
          expect(fileLoggerService.error).toHaveBeenCalledWith(
            expect.objectContaining({
              stack: '',
            }),
            '',
            'HTTP',
          );
          done();
        },
      });
    });

    it('should handle errors without message', (done) => {
      const testError = {} as Error;

      mockCallHandler = {
        handle: () => throwError(() => testError),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach next'));
        },
        error: () => {
          expect(fileLoggerService.error).toHaveBeenCalledWith(
            expect.objectContaining({
              error: 'Unknown error',
            }),
            '',
            'HTTP',
          );
          done();
        },
      });
    });

    it('should use response status code when available for errors', (done) => {
      mockResponse.statusCode = 404;
      const testError = new Error('Not found');

      mockCallHandler = {
        handle: () => throwError(() => testError),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach next'));
        },
        error: () => {
          expect(fileLoggerService.error).toHaveBeenCalledWith(
            expect.objectContaining({
              statusCode: 404,
            }),
            expect.any(String),
            'HTTP',
          );
          done();
        },
      });
    });

    it('should not log to console in test environment', (done) => {
      process.env.NODE_ENV = 'test';
      const testError = new Error('Test error');

      mockCallHandler = {
        handle: () => throwError(() => testError),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach next'));
        },
        error: () => {
          expect(loggerSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should log to console in non-test environment', (done) => {
      process.env.NODE_ENV = 'development';
      const testError = new Error('Test error');

      mockCallHandler = {
        handle: () => throwError(() => testError),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          done(new Error('Should not reach next'));
        },
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'HTTP GET /api/test failed: Test error',
          );
          done();
        },
      });
    });

    it('should add requestId to request object', (done) => {
      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          const requestWithId = mockRequest as Request & { requestId: string };
          expect(requestWithId.requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
          done();
        },
        error: done,
      });
    });

    it('should generate unique request IDs', () => {
      const id1 = (interceptor as any).generateRequestId();
      const id2 = (interceptor as any).generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });

    it('should measure request duration accurately', (done) => {
      const startTime = Date.now();

      // Mock a slow response
      mockCallHandler = {
        handle: () =>
          new Observable((subscriber) => {
            setTimeout(() => {
              subscriber.next('delayed response');
              subscriber.complete();
            }, 100);
          }),
      };

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        next: () => {
          const endTime = Date.now();
          const actualDuration = endTime - startTime;

          expect(fileLoggerService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              duration: expect.stringMatching(/^\d+ms$/),
            }),
            'HTTP',
          );

          // Extract duration from the logged call
          const logCall = fileLoggerService.log.mock.calls.find(
            (call) => call[0].message === 'Request completed',
          );
          const loggedDuration = parseInt(
            logCall[0].duration.replace('ms', ''),
          );

          // Duration should be approximately correct (within 50ms tolerance)
          expect(loggedDuration).toBeGreaterThanOrEqual(90);
          expect(loggedDuration).toBeLessThanOrEqual(actualDuration + 50);

          done();
        },
        error: done,
      });
    });
  });
});
