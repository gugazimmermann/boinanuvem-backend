import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  let metricsService: jest.Mocked<MetricsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const mockMetricsService = {
      incrementHttpRequestsInProgress: jest.fn(),
      incrementHttpRequests: jest.fn(),
      observeHttpRequestDuration: jest.fn(),
      decrementHttpRequestsInProgress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsMiddleware,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    middleware = module.get<MetricsMiddleware>(MetricsMiddleware);
    metricsService = module.get(MetricsService);

    mockRequest = {
      method: 'GET',
      url: '/api/animals',
      headers: {
        host: 'localhost:3000',
      },
    };

    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          // Store callback to call later
          (mockResponse as any)._finishCallback = callback;
        }
        return mockResponse as Response;
      }),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should call next and register finish event handler', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(
        metricsService.incrementHttpRequestsInProgress,
      ).toHaveBeenCalledWith('GET', '/api/animals');
      expect(mockResponse.on).toHaveBeenCalledWith(
        'finish',
        expect.any(Function),
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle response finish event', () => {
      const startTime = Date.now();
      jest.spyOn(Date, 'now').mockReturnValueOnce(startTime);
      jest.spyOn(Date, 'now').mockReturnValueOnce(startTime + 500);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Get the finish callback
      const finishCallback = (mockResponse.on as jest.Mock).mock.calls[0][1];
      finishCallback();

      expect(metricsService.incrementHttpRequests).toHaveBeenCalledWith(
        'GET',
        '/api/animals',
        200,
      );
      expect(metricsService.observeHttpRequestDuration).toHaveBeenCalledWith(
        'GET',
        '/api/animals',
        200,
        0.5,
      );
      expect(
        metricsService.decrementHttpRequestsInProgress,
      ).toHaveBeenCalledWith('GET', '/api/animals');
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        jest.clearAllMocks();
        mockRequest.method = method;

        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(
          metricsService.incrementHttpRequestsInProgress,
        ).toHaveBeenCalledWith(method, expect.any(String));
      });
    });

    it('should handle different status codes', () => {
      const statusCodes = [200, 201, 400, 404, 500];

      statusCodes.forEach((statusCode) => {
        jest.clearAllMocks();
        mockResponse.statusCode = statusCode;

        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        const finishCallback = (mockResponse.on as jest.Mock).mock.calls[0][1];
        finishCallback();

        expect(metricsService.incrementHttpRequests).toHaveBeenCalledWith(
          'GET',
          expect.any(String),
          statusCode,
        );
        expect(metricsService.observeHttpRequestDuration).toHaveBeenCalledWith(
          'GET',
          expect.any(String),
          statusCode,
          expect.any(Number),
        );
      });
    });

    it('should calculate duration correctly', () => {
      const startTime = 1000000;
      const endTime = 1000500; // 500ms later

      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const finishCallback = (mockResponse.on as jest.Mock).mock.calls[0][1];
      finishCallback();

      expect(metricsService.observeHttpRequestDuration).toHaveBeenCalledWith(
        'GET',
        expect.any(String),
        200,
        0.5,
      );
    });
  });

  describe('getRoute', () => {
    it('should extract route from req.route.path when available', () => {
      const requestWithRoute = {
        ...mockRequest,
        route: {
          path: '/api/animals/:id',
        },
      };

      const route = (middleware as any).getRoute(requestWithRoute as Request);

      expect(route).toBe('/api/animals/:id');
    });

    it('should extract route from URL pathname when req.route is not available', () => {
      const requestWithoutRoute = {
        ...mockRequest,
        url: '/api/animals',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithoutRoute as Request,
      );

      expect(route).toBe('/api/animals');
    });

    it('should handle request with route object but no path property', () => {
      const requestWithRouteNoPath = {
        ...mockRequest,
        route: {},
        url: '/api/animals',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithRouteNoPath as Request,
      );

      expect(route).toBe('/api/animals');
    });

    it('should handle request without route property', () => {
      const requestWithoutRoute = {
        ...mockRequest,
        url: '/api/births',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithoutRoute as Request,
      );

      expect(route).toBe('/api/births');
    });

    it('should handle route path that is not a string', () => {
      const requestWithNonStringPath = {
        ...mockRequest,
        route: {
          path: 123,
        },
        url: '/api/animals',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithNonStringPath as Request,
      );

      expect(route).toBe('/api/animals');
    });

    it('should handle URL with query parameters', () => {
      const requestWithQuery = {
        ...mockRequest,
        url: '/api/animals?page=1&limit=10',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(requestWithQuery as Request);

      expect(route).toBe('/api/animals');
    });

    it('should handle URL with hash', () => {
      const requestWithHash = {
        ...mockRequest,
        url: '/api/animals#section',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(requestWithHash as Request);

      expect(route).toBe('/api/animals');
    });

    it('should handle empty URL', () => {
      const requestWithEmptyUrl = {
        ...mockRequest,
        url: '',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithEmptyUrl as Request,
      );

      expect(route).toBe('/');
    });

    it('should handle request with route.path as empty string', () => {
      const requestWithEmptyRoutePath = {
        ...mockRequest,
        route: {
          path: '',
        },
        url: '/api/animals',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithEmptyRoutePath as Request,
      );

      expect(route).toBe('');
    });

    it('should handle request where route is not an object', () => {
      const requestWithNonObjectRoute = {
        ...mockRequest,
        route: 'not-an-object',
        url: '/api/animals',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithNonObjectRoute as Request,
      );

      expect(route).toBe('/api/animals');
    });

    it('should handle request where route is null', () => {
      const requestWithNullRoute = {
        ...mockRequest,
        route: null,
        url: '/api/animals',
        headers: {
          host: 'localhost:3000',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithNullRoute as Request,
      );

      expect(route).toBe('/api/animals');
    });

    it('should handle complex route path', () => {
      const requestWithComplexRoute = {
        ...mockRequest,
        route: {
          path: '/api/animals/:id/births',
        },
      };

      const route = (middleware as any).getRoute(
        requestWithComplexRoute as Request,
      );

      expect(route).toBe('/api/animals/:id/births');
    });
  });

  describe('integration', () => {
    it('should handle complete request lifecycle', () => {
      const startTime = 1000000;
      const endTime = 1000123; // 123ms later

      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      const request = {
        method: 'POST',
        url: '/api/animals',
        headers: { host: 'localhost:3000' },
        route: {
          path: '/api/animals',
        },
      } as Request;

      const response = {
        statusCode: 201,
        on: jest.fn((event: string, callback: () => void) => {
          if (event === 'finish') {
            setTimeout(callback, 0);
          }
          return response as Response;
        }),
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(request, response, next);

      expect(
        metricsService.incrementHttpRequestsInProgress,
      ).toHaveBeenCalledWith('POST', '/api/animals');
      expect(next).toHaveBeenCalled();

      // Simulate finish event
      const finishCallback = (response.on as jest.Mock).mock.calls[0][1];
      finishCallback();

      expect(metricsService.incrementHttpRequests).toHaveBeenCalledWith(
        'POST',
        '/api/animals',
        201,
      );
      expect(metricsService.observeHttpRequestDuration).toHaveBeenCalledWith(
        'POST',
        '/api/animals',
        201,
        expect.closeTo(0.123, 2),
      );
      expect(
        metricsService.decrementHttpRequestsInProgress,
      ).toHaveBeenCalledWith('POST', '/api/animals');
    });
  });
});
