import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SecurityLoggingInterceptor } from './security-logging.interceptor';
import { FileLoggerService } from '../logger/file-logger.service';

describe('SecurityLoggingInterceptor', () => {
  let interceptor: SecurityLoggingInterceptor;
  let mockFileLoggerService: Partial<FileLoggerService>;

  beforeEach(async () => {
    mockFileLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityLoggingInterceptor,
        {
          provide: FileLoggerService,
          useValue: mockFileLoggerService,
        },
      ],
    }).compile();

    interceptor = module.get<SecurityLoggingInterceptor>(
      SecurityLoggingInterceptor,
    );
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    let mockExecutionContext: Partial<ExecutionContext>;
    let mockCallHandler: Partial<CallHandler>;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: '/health', // Security-relevant endpoint
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'en-US',
          'accept-encoding': 'gzip',
        },
      };

      mockResponse = {
        statusCode: 200,
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      };

      mockCallHandler = {
        handle: jest.fn(),
      };
    });

    it('should log successful security-related requests', () => {
      const loggerSpy = jest.spyOn(mockFileLoggerService, 'log');
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of('success'));

      const result$ = interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result$.subscribe();

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle errors with nullish coalescing', () => {
      const loggerSpy = jest.spyOn(mockFileLoggerService, 'error');
      const error = new Error();
      error.message = undefined as any; // Test nullish coalescing
      error.stack = null as any; // Test nullish coalescing

      mockResponse.statusCode = undefined; // Test nullish coalescing

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(() => error),
      );

      const result$ = interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      try {
        result$.subscribe();
      } catch {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle requests with missing headers using nullish coalescing', () => {
      const loggerSpy = jest.spyOn(mockFileLoggerService, 'log');

      // Test nullish coalescing for headers
      mockRequest.url = '/metrics'; // Security-relevant endpoint
      mockRequest.headers = {
        'user-agent': undefined,
        'accept-language': null,
        'accept-encoding': '',
      };

      (mockCallHandler.handle as jest.Mock).mockReturnValue(of('success'));

      const result$ = interceptor.intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result$.subscribe();

      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
