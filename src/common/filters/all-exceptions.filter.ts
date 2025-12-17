import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Global exception filter that:
 * - Normalizes error responses to JSON
 * - Includes requestId (set by LoggingInterceptor) when available
 * - Avoids leaking details in production
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const status = this.getStatusCode(exception);
    const message = this.getMessage(exception);
    const payload = this.buildPayload(status, message, request);

    if (request.requestId) {
      payload.requestId = request.requestId;
      response.setHeader('x-request-id', request.requestId);
    }

    this.addStackTraceIfNeeded(payload, exception);

    response.status(status).json(payload);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string | string[] {
    const isProduction = this.isProduction();
    if (isProduction) {
      return 'Internal server error';
    }

    if (exception instanceof HttpException) {
      return this.getHttpExceptionMessage(exception);
    }

    if (exception instanceof Error) {
      return exception.message ?? 'Internal server error';
    }

    return 'Internal server error';
  }

  private getHttpExceptionMessage(exception: HttpException): string | string[] {
    const httpBody = exception.getResponse();

    if (typeof httpBody === 'string') {
      return httpBody;
    }

    if (httpBody && typeof httpBody === 'object') {
      const m = (httpBody as Record<string, unknown>).message;
      if (typeof m === 'string' || Array.isArray(m)) {
        return m as string | string[];
      }
    }

    return exception.message ?? 'Request failed';
  }

  private buildPayload(
    status: number,
    message: string | string[],
    request: Request,
  ): Record<string, unknown> {
    return {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  private addStackTraceIfNeeded(
    payload: Record<string, unknown>,
    exception: unknown,
  ): void {
    if (this.isProduction()) {
      return;
    }

    if (exception instanceof Error && exception.stack) {
      payload.stack = exception.stack;
    }
  }

  private isProduction(): boolean {
    const env = process.env.NODE_ENV ?? 'development';
    return env === 'production';
  }
}
