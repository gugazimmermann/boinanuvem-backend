import 'reflect-metadata';
import { validate, Environment, EnvironmentVariables } from './env.validation';

describe('Environment Validation', () => {
  describe('validate function', () => {
    it('should validate a complete valid configuration', () => {
      const config = {
        NODE_ENV: 'production',
        PORT: '3001',
        ENABLE_SWAGGER: 'false',
        CORS_ORIGIN: 'https://example.com',
        RATE_LIMIT_TTL: '30000',
        RATE_LIMIT_MAX: '50',
        LOG_LEVEL: 'info',
        LOG_FILE_ENABLED: 'false',
        API_PREFIX: 'v1',
        REQUEST_TIMEOUT: '60000',
        MAX_REQUEST_SIZE: '5mb',
        HSTS_MAX_AGE: '86400',
        CSP_DIRECTIVES: "default-src 'self'; script-src 'self'",
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      const result = validate(config);

      expect(result).toBeInstanceOf(EnvironmentVariables);
      expect(result.NODE_ENV).toBe(Environment.Production);
      expect(result.PORT).toBe(3001);
      expect(result.ENABLE_SWAGGER).toBe(false);
      expect(result.CORS_ORIGIN).toBe('https://example.com');
      expect(result.RATE_LIMIT_TTL).toBe(30000);
      expect(result.RATE_LIMIT_MAX).toBe(50);
      expect(result.LOG_LEVEL).toBe('info');
      expect(result.LOG_FILE_ENABLED).toBe(false);
      expect(result.API_PREFIX).toBe('v1');
      expect(result.REQUEST_TIMEOUT).toBe(60000);
      expect(result.MAX_REQUEST_SIZE).toBe('5mb');
      expect(result.HSTS_MAX_AGE).toBe(86400);
      expect(result.DATABASE_URL).toBe(
        'postgresql://user:pass@localhost:5432/db',
      );
      expect(result.JWT_SECRET).toBe('super-secret-jwt-key');
      expect(result.FRONTEND_URL).toBe('https://frontend.example.com');
      expect(result.GMAIL_EMAIL).toBe('test@gmail.com');
      expect(result.GMAIL_PASSWORD).toBe('gmail-app-password');
    });

    it('should use default values for optional fields', () => {
      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      const result = validate(config);

      expect(result.NODE_ENV).toBe(Environment.Development);
      expect(result.PORT).toBe(3000);
      expect(result.ENABLE_SWAGGER).toBe(true);
      expect(result.CORS_ORIGIN).toBe('http://localhost:3000');
      expect(result.RATE_LIMIT_TTL).toBe(60000);
      expect(result.RATE_LIMIT_MAX).toBe(100);
      expect(result.LOG_LEVEL).toBe('debug');
      expect(result.LOG_FILE_ENABLED).toBe(true);
      expect(result.API_PREFIX).toBe('api');
      expect(result.REQUEST_TIMEOUT).toBe(30000);
      expect(result.MAX_REQUEST_SIZE).toBe('10mb');
      expect(result.HSTS_MAX_AGE).toBe(31536000);
      expect(result.CSP_DIRECTIVES).toBe("default-src 'self'");
    });

    it('should throw error for missing required fields', () => {
      const config = {
        NODE_ENV: 'development',
        PORT: '3000',
        // Missing required fields
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should throw error for invalid NODE_ENV', () => {
      const config = {
        NODE_ENV: 'invalid-env',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should throw error for invalid PORT range', () => {
      const config = {
        PORT: '0', // Below minimum
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should throw error for PORT above maximum', () => {
      const config = {
        PORT: '70000', // Above maximum
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should transform string boolean values correctly', () => {
      const config = {
        ENABLE_SWAGGER: 'true',
        LOG_FILE_ENABLED: 'false',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      const result = validate(config);

      expect(result.ENABLE_SWAGGER).toBe(false);
      expect(result.LOG_FILE_ENABLED).toBe(false);
    });

    it('should handle non-true string values as false for booleans', () => {
      const config = {
        ENABLE_SWAGGER: 'false',
        LOG_FILE_ENABLED: 'anything-else',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      const result = validate(config);

      expect(result.ENABLE_SWAGGER).toBe(false);
      expect(result.LOG_FILE_ENABLED).toBe(false);
    });

    it('should validate RATE_LIMIT_TTL minimum value', () => {
      const config = {
        RATE_LIMIT_TTL: '500', // Below minimum
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should validate RATE_LIMIT_MAX range', () => {
      const config = {
        RATE_LIMIT_MAX: '0', // Below minimum
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should validate RATE_LIMIT_MAX maximum value', () => {
      const config = {
        RATE_LIMIT_MAX: '2000', // Above maximum
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should validate REQUEST_TIMEOUT range', () => {
      const config = {
        REQUEST_TIMEOUT: '500', // Below minimum
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should validate REQUEST_TIMEOUT maximum value', () => {
      const config = {
        REQUEST_TIMEOUT: '400000', // Above maximum
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should validate HSTS_MAX_AGE minimum value', () => {
      const config = {
        HSTS_MAX_AGE: '-1', // Below minimum
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      expect(() => validate(config)).toThrow('Configuration validation error');
    });

    it('should handle all valid NODE_ENV values', () => {
      const environments = ['development', 'production', 'test'];

      environments.forEach((env) => {
        const config = {
          NODE_ENV: env,
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          JWT_SECRET: 'super-secret-jwt-key',
          FRONTEND_URL: 'https://frontend.example.com',
          GMAIL_EMAIL: 'test@gmail.com',
          GMAIL_PASSWORD: 'gmail-app-password',
        };

        const result = validate(config);
        expect(result.NODE_ENV).toBe(env);
      });
    });

    it('should transform numeric strings to numbers', () => {
      const config = {
        PORT: '8080',
        RATE_LIMIT_TTL: '45000',
        RATE_LIMIT_MAX: '200',
        REQUEST_TIMEOUT: '120000',
        HSTS_MAX_AGE: '604800',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'super-secret-jwt-key',
        FRONTEND_URL: 'https://frontend.example.com',
        GMAIL_EMAIL: 'test@gmail.com',
        GMAIL_PASSWORD: 'gmail-app-password',
      };

      const result = validate(config);

      expect(typeof result.PORT).toBe('number');
      expect(typeof result.RATE_LIMIT_TTL).toBe('number');
      expect(typeof result.RATE_LIMIT_MAX).toBe('number');
      expect(typeof result.REQUEST_TIMEOUT).toBe('number');
      expect(typeof result.HSTS_MAX_AGE).toBe('number');

      expect(result.PORT).toBe(8080);
      expect(result.RATE_LIMIT_TTL).toBe(45000);
      expect(result.RATE_LIMIT_MAX).toBe(200);
      expect(result.REQUEST_TIMEOUT).toBe(120000);
      expect(result.HSTS_MAX_AGE).toBe(604800);
    });
  });

  describe('Environment enum', () => {
    it('should have correct environment values', () => {
      expect(Environment.Development).toBe('development');
      expect(Environment.Production).toBe('production');
      expect(Environment.Test).toBe('test');
    });
  });

  describe('EnvironmentVariables class', () => {
    it('should have correct default values', () => {
      const env = new EnvironmentVariables();

      expect(env.NODE_ENV).toBe(Environment.Development);
      expect(env.PORT).toBe(3000);
      expect(env.ENABLE_SWAGGER).toBe(true);
      expect(env.CORS_ORIGIN).toBe('http://localhost:3000');
      expect(env.RATE_LIMIT_TTL).toBe(60000);
      expect(env.RATE_LIMIT_MAX).toBe(100);
      expect(env.LOG_LEVEL).toBe('debug');
      expect(env.LOG_FILE_ENABLED).toBe(true);
      expect(env.API_PREFIX).toBe('api');
      expect(env.REQUEST_TIMEOUT).toBe(30000);
      expect(env.MAX_REQUEST_SIZE).toBe('10mb');
      expect(env.HSTS_MAX_AGE).toBe(31536000);
      expect(env.CSP_DIRECTIVES).toBe("default-src 'self'");
    });
  });
});
