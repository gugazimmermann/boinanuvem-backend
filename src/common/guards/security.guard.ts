import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly logger = new Logger(SecurityGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.isBlacklisted(request)) {
      this.logger.warn(`Blocked request from blacklisted IP: ${request.ip}`);
      return false;
    }

    if (this.hasInvalidHeaders(request)) {
      this.logger.warn(
        `Blocked request with invalid headers from: ${request.ip}`,
      );
      return false;
    }

    return true;
  }

  private isBlacklisted(request: Request): boolean {
    // Load blacklisted IPs from environment variable
    const blacklistedIPs: string[] =
      process.env.BLACKLISTED_IPS?.split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0) ?? [];

    return request.ip ? blacklistedIPs.includes(request.ip) : false;
  }

  private hasInvalidHeaders(request: Request): boolean {
    const { headers } = request;

    const suspiciousPatterns = [/sqlmap/i, /nikto/i, /burp/i, /zap/i];

    const userAgent = headers['user-agent'] ?? '';
    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }
}
