import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { FileLoggerService } from '../logger/file-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly fileLogger: FileLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] ?? '';
    const startTime = Date.now();

    const requestId = this.generateRequestId();

    (request as Request & { requestId: string }).requestId = requestId;

    const requestLog = {
      message: 'Incoming request',
      requestId,
      method,
      url,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    this.fileLogger.log(requestLog, 'HTTP');

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          const completedLog = {
            message: 'Request completed',
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          };

          this.fileLogger.log(completedLog, 'HTTP');
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          const errorMessage = error.message ?? 'Unknown error';
          const errorStack = error.stack ?? '';

          const errorLog = {
            message: 'Request failed',
            requestId,
            method,
            url,
            statusCode: statusCode ?? 500,
            duration: `${duration}ms`,
            error: errorMessage,
            stack: errorStack,
            timestamp: new Date().toISOString(),
          };

          // Only log to console in non-test environments
          if (process.env.NODE_ENV !== 'test') {
            this.logger.error(`HTTP ${method} ${url} failed: ${errorMessage}`);
          }
          this.fileLogger.error(errorLog, errorStack, 'HTTP');
        },
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
