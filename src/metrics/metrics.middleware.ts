import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const method = req.method;
    const route = this.getRoute(req);

    this.metricsService.incrementHttpRequestsInProgress(method, route);

    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = res.statusCode;

      this.metricsService.incrementHttpRequests(method, route, statusCode);
      this.metricsService.observeHttpRequestDuration(
        method,
        route,
        statusCode,
        duration,
      );
      this.metricsService.decrementHttpRequestsInProgress(method, route);
    });

    next();
  }

  private getRoute(req: Request): string {
    // Check if request has a route with path property
    if (
      'route' in req &&
      req.route &&
      typeof req.route === 'object' &&
      'path' in req.route
    ) {
      const routePath = (req.route as { path: unknown }).path;
      if (typeof routePath === 'string') {
        return routePath;
      }
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.pathname;
  }
}
