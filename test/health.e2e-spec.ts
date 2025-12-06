import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health Check Endpoints (e2e)', () => {
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

  describe('GET /health', () => {
    it('should return comprehensive health check status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');

      // Check that health indicators are present
      expect(response.body.info || response.body.details).toHaveProperty(
        'memory_heap',
      );
      expect(response.body.info || response.body.details).toHaveProperty(
        'memory_rss',
      );
      expect(response.body.info || response.body.details).toHaveProperty(
        'storage',
      );
    });

    it('should return health status without authentication', async () => {
      // Health endpoint should be accessible without auth
      await request(app.getHttpServer()).get('/health').expect(200);
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness probe status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');

      // Liveness check should include memory_heap
      expect(response.body.info || response.body.details).toHaveProperty(
        'memory_heap',
      );
    });

    it('should return liveness status without authentication', async () => {
      // Liveness endpoint should be accessible without auth
      await request(app.getHttpServer()).get('/health/live').expect(200);
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness probe status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');

      // Readiness check should include memory_heap, memory_rss, and storage
      expect(response.body.info || response.body.details).toHaveProperty(
        'memory_heap',
      );
      expect(response.body.info || response.body.details).toHaveProperty(
        'memory_rss',
      );
      expect(response.body.info || response.body.details).toHaveProperty(
        'storage',
      );
    });

    it('should return readiness status without authentication', async () => {
      // Readiness endpoint should be accessible without auth
      await request(app.getHttpServer()).get('/health/ready').expect(200);
    });
  });
});
