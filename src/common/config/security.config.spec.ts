import securityConfig from './security.config';

describe('Security Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use default values with nullish coalescing when env vars are undefined', () => {
    delete process.env.RATE_LIMIT_TTL;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.HSTS_MAX_AGE;
    delete process.env.REQUEST_TIMEOUT;
    delete process.env.MAX_REQUEST_SIZE;
    delete process.env.CORS_ORIGIN;

    const config = securityConfig();

    expect(config.rateLimit.ttl).toBe(60000);
    expect(config.rateLimit.limit).toBe(100);
    expect(config.helmet.hsts.maxAge).toBe(31536000);
    expect(config.request.timeout).toBe(30000);
    expect(config.request.maxSize).toBe('10mb');
    expect(config.cors.origin).toEqual(['http://localhost:3000']);
  });

  it('should use environment values when provided', () => {
    process.env.RATE_LIMIT_TTL = '120000';
    process.env.RATE_LIMIT_MAX = '200';
    process.env.HSTS_MAX_AGE = '63072000';
    process.env.REQUEST_TIMEOUT = '60000';
    process.env.MAX_REQUEST_SIZE = '20mb';
    process.env.CORS_ORIGIN = 'https://example.com,https://app.example.com';

    const config = securityConfig();

    expect(config.rateLimit.ttl).toBe(120000);
    expect(config.rateLimit.limit).toBe(200);
    expect(config.helmet.hsts.maxAge).toBe(63072000);
    expect(config.request.timeout).toBe(60000);
    expect(config.request.maxSize).toBe('20mb');
    expect(config.cors.origin).toEqual([
      'https://example.com',
      'https://app.example.com',
    ]);
  });

  it('should handle empty string environment values with nullish coalescing', () => {
    process.env.RATE_LIMIT_TTL = '';
    process.env.RATE_LIMIT_MAX = '';
    process.env.HSTS_MAX_AGE = '';
    process.env.REQUEST_TIMEOUT = '';
    process.env.MAX_REQUEST_SIZE = '';
    process.env.CORS_ORIGIN = '';

    const config = securityConfig();

    // Empty strings should be preserved by nullish coalescing, but parseInt will return NaN
    // The config should handle this appropriately
    expect(isNaN(config.rateLimit.ttl)).toBe(true);
    expect(isNaN(config.rateLimit.limit)).toBe(true);
    expect(isNaN(config.helmet.hsts.maxAge)).toBe(true);
    expect(isNaN(config.request.timeout)).toBe(true);
    expect(config.request.maxSize).toBe('');
    expect(config.cors.origin).toEqual(['']);
  });

  it('should handle null environment values with nullish coalescing', () => {
    process.env.RATE_LIMIT_TTL = null as any;
    process.env.RATE_LIMIT_MAX = null as any;
    process.env.HSTS_MAX_AGE = null as any;
    process.env.REQUEST_TIMEOUT = null as any;
    process.env.MAX_REQUEST_SIZE = null as any;
    process.env.CORS_ORIGIN = null as any;

    const config = securityConfig();

    expect(config.rateLimit.ttl).toBe(60000);
    expect(config.rateLimit.limit).toBe(100);
    expect(config.helmet.hsts.maxAge).toBe(31536000);
    expect(config.request.timeout).toBe(30000);
    expect(config.request.maxSize).toBe('10mb');
    expect(config.cors.origin).toEqual(['http://localhost:3000']);
  });
});
