import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { FileLoggerService } from '../logger/file-logger.service';

@Injectable()
export class SecurityLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityLoggingInterceptor.name);

  constructor(private readonly fileLogger: FileLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] ?? '';
    const startTime = Date.now();

    const fingerprint = this.generateFingerprint(request);

    this.detectSuspiciousActivity(request);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          if (this.isSecurityRelevant(request, statusCode)) {
            const securityLog = {
              event: 'request_success',
              method,
              url,
              statusCode,
              ip,
              userAgent,
              fingerprint,
              duration: `${duration}ms`,
              timestamp: new Date().toISOString(),
            };

            this.fileLogger.log(securityLog, 'SECURITY');
          }
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          const errorMessage = error.message ?? 'Unknown error';
          const errorStack = error.stack ?? '';

          const securityErrorLog = {
            event: 'request_failure',
            method,
            url,
            statusCode: statusCode ?? 500,
            ip,
            userAgent,
            fingerprint,
            duration: `${duration}ms`,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          };

          this.fileLogger.error(securityErrorLog, errorStack, 'SECURITY');

          if (this.isPotentialThreat(error, statusCode)) {
            this.logSecurityAlert(request, error);
          }
        },
      }),
      catchError((error) => {
        throw error;
      }),
    );
  }

  private generateFingerprint(request: Request): string {
    const { ip, headers } = request;
    const userAgent = headers['user-agent'] ?? '';
    const acceptLanguage = headers['accept-language'] ?? '';
    const acceptEncoding = headers['accept-encoding'] ?? '';

    const fingerprint = Buffer.from(
      `${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`,
    )
      .toString('base64')
      .substring(0, 16);

    return fingerprint;
  }

  private detectSuspiciousActivity(request: Request): void {
    const { url, headers } = request;
    const userAgent = headers['user-agent'] ?? '';

    if (this.containsSqlInjectionPatterns(url)) {
      this.logSecurityAlert(
        request,
        new Error('Potential SQL injection attempt'),
      );
    }

    if (this.containsXssPatterns(url)) {
      this.logSecurityAlert(request, new Error('Potential XSS attempt'));
    }

    if (this.isSuspiciousUserAgent(userAgent)) {
      this.logSecurityAlert(
        request,
        new Error('Suspicious user agent detected'),
      );
    }

    if (this.containsPathTraversalPatterns(url)) {
      this.logSecurityAlert(
        request,
        new Error('Potential path traversal attempt'),
      );
    }
  }

  private containsSqlInjectionPatterns(url: string): boolean {
    // Use non-backtracking patterns to prevent ReDoS attacks
    // Patterns use [^\s]* instead of .* to limit backtracking
    // Avoid nested quantifiers that can cause catastrophic backtracking
    const sqlPatterns = [
      /\bunion\s+\bselect/i,
      /\bselect\s+[^\s]+\s+from/i,
      /\binsert\s+into/i,
      /\bdelete\s+from/i,
      /\bdrop\s+table/i,
      // Fixed: ReDoS-safe pattern - checks for quote-or-quote injection pattern
      // Uses bounded quantifiers {0,50} to prevent exponential backtracking
      // Matches patterns like: 'value' or 'value'=
      /'[^'\s]{0,50}\s+or\s+[^'\s]{0,50}'[^=]{0,50}=/i,
      /--/,
      /\bor\s+1\s*=\s*1\b/i,
    ];

    return sqlPatterns.some((pattern) => pattern.test(url));
  }

  private containsXssPatterns(url: string): boolean {
    // Use non-backtracking patterns to prevent ReDoS attacks
    // Bounded quantifiers prevent exponential backtracking
    const xssPatterns = [
      /<script[^>]{0,200}>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]{0,200}>/i,
      /<object[^>]{0,200}>/i,
      /<embed[^>]{0,200}>/i,
    ];

    return xssPatterns.some((pattern) => pattern.test(decodeURIComponent(url)));
  }

  private containsPathTraversalPatterns(url: string): boolean {
    const traversalPatterns = [/\.\.\//, /\.\.\\/, /%2e%2e%2f/i, /%2e%2e%5c/i];

    return traversalPatterns.some((pattern) => pattern.test(url));
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /burp/i,
      /zap/i,
      /acunetix/i,
      /nessus/i,
      /openvas/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  private isSecurityRelevant(request: Request, statusCode: number): boolean {
    const securityEndpoints = ['/health', '/metrics', '/api-docs'];
    const securityStatusCodes = [401, 403, 404, 429, 500];

    return (
      securityEndpoints.some((endpoint) => request.url.includes(endpoint)) ||
      securityStatusCodes.includes(statusCode)
    );
  }

  private isPotentialThreat(error: Error, statusCode: number): boolean {
    const threatStatusCodes = [400, 401, 403, 404, 429];
    const threatErrors = [
      'ValidationError',
      'UnauthorizedException',
      'ForbiddenException',
    ];

    return (
      threatStatusCodes.includes(statusCode) ||
      threatErrors.some((errorType) =>
        error.constructor.name.includes(errorType),
      )
    );
  }

  private logSecurityAlert(request: Request, error: Error): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] ?? '';

    const alertLog = {
      event: 'security_alert',
      alert_type: error.message,
      method,
      url,
      ip,
      userAgent,
      fingerprint: this.generateFingerprint(request),
      headers: this.sanitizeHeaders(
        headers as Record<string, string | string[]>,
      ),
      timestamp: new Date().toISOString(),
    };

    this.fileLogger.error(alertLog, error.stack, 'SECURITY_ALERT');
    this.logger.warn(
      `Security Alert: ${error.message} from ${ip} - ${method} ${url}`,
    );
  }

  private sanitizeHeaders(
    headers: Record<string, string | string[]>,
  ): Record<string, string | string[]> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
