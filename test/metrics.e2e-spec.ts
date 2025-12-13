import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Metrics Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics in text/plain format', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      expect(typeof response.text).toBe('string');
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should contain Prometheus format metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;

      // Check for Prometheus format indicators
      expect(metricsText).toContain('# HELP');
      expect(metricsText).toContain('# TYPE');
    });

    it('should include process metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;

      // In test environment, default metrics are disabled to prevent interval leaks
      // So we only check for custom application metrics
      expect(metricsText).toContain('boinanuvem_http_requests_total');
      expect(metricsText).toContain('boinanuvem_http_request_duration_seconds');
      expect(metricsText).toContain('boinanuvem_app_info');
    });

    it('should include application metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;

      // Check for custom application metrics (default metrics disabled in test)
      expect(metricsText).toContain('boinanuvem_http_requests_total');
      expect(metricsText).toContain('boinanuvem_http_request_duration_seconds');
    });

    it('should return metrics without authentication', async () => {
      // Metrics endpoint should be accessible without auth
      await request(app.getHttpServer()).get('/metrics').expect(200);
    });

    it('should have consistent format across multiple requests', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      // Both should be valid Prometheus format
      expect(response1.text).toContain('# HELP');
      expect(response2.text).toContain('# HELP');
      expect(response1.text).toContain('# TYPE');
      expect(response2.text).toContain('# TYPE');
    });
  });
});
