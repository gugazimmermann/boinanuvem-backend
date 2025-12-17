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

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const env = process.env.NODE_ENV ?? 'development';
    const isProduction = env === 'production';

    // Try to preserve Nest's built-in HttpException response body when available.
    const httpBody = isHttpException ? exception.getResponse() : undefined;

    let message: string | string[] = 'Internal server error';
    if (!isProduction) {
      if (isHttpException) {
        // Nest may return string or object for getResponse()
        if (typeof httpBody === 'string') {
          message = httpBody;
        } else if (httpBody && typeof httpBody === 'object') {
          const m = (httpBody as Record<string, unknown>).message;
          if (typeof m === 'string' || Array.isArray(m)) {
            message = m as string | string[];
          } else {
            message = exception.message || 'Request failed';
          }
        } else {
          message = exception.message || 'Request failed';
        }
      } else if (exception instanceof Error) {
        message = exception.message || 'Internal server error';
      }
    }

    const payload: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (request.requestId) {
      payload.requestId = request.requestId;
      response.setHeader('x-request-id', request.requestId);
    }

    // Include stack trace only in non-production for easier local debugging.
    if (!isProduction && exception instanceof Error && exception.stack) {
      payload.stack = exception.stack;
    }

    response.status(status).json(payload);
  }
}
