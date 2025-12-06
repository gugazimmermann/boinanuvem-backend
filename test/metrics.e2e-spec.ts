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

      // Check for common process metrics
      expect(metricsText).toMatch(/process_cpu/);
      expect(metricsText).toMatch(/process_start_time/);
      expect(metricsText).toMatch(/process_resident_memory/);
    });

    it('should include Node.js heap metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;

      // Check for Node.js heap metrics
      expect(metricsText).toMatch(/nodejs_heap_size/);
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
