import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, Logger } from '@nestjs/common';
import { SecurityGuard } from './security.guard';
import { Request } from 'express';

describe('SecurityGuard', () => {
  let guard: SecurityGuard;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityGuard],
    }).compile();

    guard = module.get<SecurityGuard>(SecurityGuard);
    loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
    delete process.env.BLACKLISTED_IPS;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow requests from non-blacklisted IPs with valid headers', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should block requests from blacklisted IPs', () => {
      process.env.BLACKLISTED_IPS = '192.168.1.100,10.0.0.5';

      const mockRequest = {
        ip: '192.168.1.100',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Blocked request from blacklisted IP: 192.168.1.100',
      );
    });

    it('should allow requests from non-blacklisted IPs when blacklist is configured', () => {
      process.env.BLACKLISTED_IPS = '192.168.1.100,10.0.0.5';

      const mockRequest = {
        ip: '192.168.1.50',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should handle empty blacklist configuration', () => {
      process.env.BLACKLISTED_IPS = '';

      const mockRequest = {
        ip: '192.168.1.100',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should handle undefined blacklist configuration', () => {
      delete process.env.BLACKLISTED_IPS;

      const mockRequest = {
        ip: '192.168.1.100',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should handle requests without IP address', () => {
      process.env.BLACKLISTED_IPS = '192.168.1.100';

      const mockRequest = {
        ip: undefined,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should block requests with suspicious user agents (sqlmap)', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'sqlmap/1.0 (http://sqlmap.org)',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Blocked request with invalid headers from: 192.168.1.1',
      );
    });

    it('should block requests with suspicious user agents (nikto)', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Nikto/2.1.6',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Blocked request with invalid headers from: 192.168.1.1',
      );
    });

    it('should block requests with suspicious user agents (burp)', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Burp Suite)',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Blocked request with invalid headers from: 192.168.1.1',
      );
    });

    it('should block requests with suspicious user agents (zap)', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; OWASP ZAP)',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Blocked request with invalid headers from: 192.168.1.1',
      );
    });

    it('should handle requests without user-agent header', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {},
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive suspicious patterns', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'SQLMAP/1.0 (HTTP://SQLMAP.ORG)',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Blocked request with invalid headers from: 192.168.1.1',
      );
    });

    it('should handle blacklist with whitespace and empty entries', () => {
      process.env.BLACKLISTED_IPS = ' 192.168.1.100 , , 10.0.0.5 , ';

      const mockRequest = {
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Blocked request from blacklisted IP: 192.168.1.100',
      );
    });

    it('should block when both blacklisted IP and suspicious headers are present', () => {
      process.env.BLACKLISTED_IPS = '192.168.1.100';

      const mockRequest = {
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'sqlmap/1.0',
        },
      } as Request;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Blocked request from blacklisted IP: 192.168.1.100',
      );
    });
  });
});
