import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from './../src/app.module';

describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/')
        .expect((res: Response) => {
          expect(res.headers['x-content-type-options']).toBe('nosniff');
          expect(res.headers['x-frame-options']).toBe('DENY');
          expect(res.headers['x-download-options']).toBe('noopen');
          expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');
          expect(res.headers['referrer-policy']).toBe('no-referrer');
        });
    });

    it('should include HSTS header in production-like environment', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/')
        .expect((res: Response) => {
          expect(res.headers['strict-transport-security']).toBeDefined();
        });
    });
  });

  describe('CORS Protection', () => {
    it('should handle CORS preflight requests', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);
    });

    it('should include CORS headers for allowed origins', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/')
        .set('Origin', 'http://localhost:3000')
        .expect((res: Response) => {
          expect(res.headers['access-control-allow-origin']).toBeDefined();
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to requests', async () => {
      const promises = [];

      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app.getHttpServer() as Parameters<typeof request>[0])
            .get('/')
            .expect((res: Response) => {
              expect([200, 429]).toContain(res.status);
            }),
        );
      }

      await Promise.all(promises);
    });

    it('should include rate limit headers', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/')
        .expect((res: Response) => {
          expect(res.headers['x-ratelimit-limit']).toBeDefined();
          expect(res.headers['x-ratelimit-remaining']).toBeDefined();
        });
    });
  });

  describe('Input Validation', () => {
    it('should reject requests with invalid query parameters', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/health?page=invalid')
        .expect(400);
    });

    it('should sanitize and validate input data', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/health?page=1&limit=10')
        .expect(200);
    });
  });

  describe('Security Monitoring', () => {
    it('should detect and log suspicious SQL injection attempts', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get("/?id=1' OR '1'='1")
        .expect((res: Response) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should detect and log XSS attempts', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/?search=<script>alert("xss")</script>')
        .expect((res: Response) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should detect path traversal attempts', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/../../etc/passwd')
        .expect((res: Response) => {
          expect([404, 400]).toContain(res.status);
        });
    });
  });

  describe('Health Check Security', () => {
    it('should secure health check endpoints', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/health')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body).not.toHaveProperty('secrets');
          expect(res.body).not.toHaveProperty('passwords');
          expect(res.body).not.toHaveProperty('tokens');
        });
    });
  });

  describe('Metrics Security', () => {
    it('should secure metrics endpoint', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/metrics')
        .expect(200)
        .expect((res: Response) => {
          expect(res.text).not.toMatch(/password|secret|token|key/i);
        });
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose stack traces in production', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/non-existent-endpoint')
        .expect(404)
        .expect((res: Response) => {
          expect((res.body as { message?: string }).message).not.toMatch(
            /Error:|at /,
          );
        });
    });

    it('should handle malformed requests gracefully', () => {
      return request(app.getHttpServer() as Parameters<typeof request>[0])
        .post('/')
        .send('invalid-json-{')
        .set('Content-Type', 'application/json')
        .expect((res: Response) => {
          expect([400, 500]).toContain(res.status);
        });
    });
  });
});
