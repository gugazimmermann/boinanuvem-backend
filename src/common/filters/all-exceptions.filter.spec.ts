import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import type { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: jest.Mocked<Response>;
  let mockRequest: Request & { requestId?: string };
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Response>;

    mockRequest = {
      url: '/test',
      requestId: 'test-request-id',
    } as Request & { requestId?: string };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle HttpException', () => {
      const exception = new BadRequestException('Bad request');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Bad request',
          path: '/test',
          timestamp: expect.any(String),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle HttpException with array message', () => {
      const exception = new BadRequestException(['Error 1', 'Error 2']);
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: ['Error 1', 'Error 2'],
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle generic Error', () => {
      const exception = new Error('Generic error');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Generic error',
          path: '/test',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle unknown exception type', () => {
      const exception = { some: 'unknown' };
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should include requestId when present', () => {
      const exception = new NotFoundException('Not found');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'x-request-id',
        'test-request-id',
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include requestId when absent', () => {
      const exception = new NotFoundException('Not found');
      mockRequest.requestId = undefined;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          requestId: expect.anything(),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', () => {
      const exception = new Error('Test error');
      exception.stack = 'Error: Test error\n    at test.js:1:1';
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error: Test error\n    at test.js:1:1',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const exception = new Error('Test error');
      exception.stack = 'Error: Test error\n    at test.js:1:1';
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything(),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should return generic message in production for HttpException', () => {
      const exception = new BadRequestException('Bad request');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Internal server error',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should return generic message in production for Error', () => {
      const exception = new Error('Test error');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Custom message', code: 'CUSTOM_ERROR' },
        HttpStatus.BAD_REQUEST,
      );
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Custom message',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle HttpException with non-string, non-array message in object', () => {
      const exception = new HttpException(
        { message: { nested: 'value' }, code: 'CUSTOM_ERROR' },
        HttpStatus.BAD_REQUEST,
      );
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.any(String), // Falls back to exception.message
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Error without message', () => {
      const exception = new Error();
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: expect.any(String), // Error() creates empty string message
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Error without stack', () => {
      const exception = new Error('Test error');
      delete exception.stack;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything(),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('private methods', () => {
    it('getStatusCode should return status from HttpException', () => {
      const exception = new NotFoundException();
      const status = (filter as any).getStatusCode(exception);
      expect(status).toBe(404);
    });

    it('getStatusCode should return 500 for non-HttpException', () => {
      const exception = new Error('Test');
      const status = (filter as any).getStatusCode(exception);
      expect(status).toBe(500);
    });

    it('getMessage should return production message in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const exception = new Error('Test error');
      const message = (filter as any).getMessage(exception);
      expect(message).toBe('Internal server error');
      process.env.NODE_ENV = originalEnv;
    });

    it('getMessage should return error message in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const exception = new Error('Test error');
      const message = (filter as any).getMessage(exception);
      expect(message).toBe('Test error');
      process.env.NODE_ENV = originalEnv;
    });

    it('getHttpExceptionMessage should handle string response', () => {
      const exception = new HttpException('String message', 400);
      const message = (filter as any).getHttpExceptionMessage(exception);
      expect(message).toBe('String message');
    });

    it('getHttpExceptionMessage should handle object with string message', () => {
      const exception = new HttpException({ message: 'Object message' }, 400);
      const message = (filter as any).getHttpExceptionMessage(exception);
      expect(message).toBe('Object message');
    });

    it('getHttpExceptionMessage should handle object with array message', () => {
      const exception = new HttpException(
        { message: ['Error 1', 'Error 2'] },
        400,
      );
      const message = (filter as any).getHttpExceptionMessage(exception);
      expect(message).toEqual(['Error 1', 'Error 2']);
    });

    it('buildPayload should create correct payload structure', () => {
      const payload = (filter as any).buildPayload(400, 'Error', mockRequest);
      expect(payload).toEqual({
        statusCode: 400,
        message: 'Error',
        timestamp: expect.any(String),
        path: '/test',
      });
    });

    it('isProduction should return true in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const isProd = (filter as any).isProduction();
      expect(isProd).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    it('isProduction should return false in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const isProd = (filter as any).isProduction();
      expect(isProd).toBe(false);
      process.env.NODE_ENV = originalEnv;
    });

    it('addStackTraceIfNeeded should add stack in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const exception = new Error('Test');
      exception.stack = 'stack trace';
      const payload: Record<string, unknown> = {};
      (filter as any).addStackTraceIfNeeded(payload, exception);
      expect(payload.stack).toBe('stack trace');
      process.env.NODE_ENV = originalEnv;
    });

    it('addStackTraceIfNeeded should not add stack in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const exception = new Error('Test');
      exception.stack = 'stack trace';
      const payload: Record<string, unknown> = {};
      (filter as any).addStackTraceIfNeeded(payload, exception);
      expect(payload.stack).toBeUndefined();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
