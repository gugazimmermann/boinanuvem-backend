import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Deaths Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAnimals: any[];

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Deaths Test Company',
      email: 'deaths@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createAnimals: 2,
      createRegularUser: true,
      regularUserPermissions: {
        records: {
          deaths: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
        },
      },
    });

    // Clean up any existing animals with these codes first
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
        code: { in: ['DEATH-001', 'DEATH-002'] },
      },
    });

    // Create animals individually to avoid code conflicts
    testAnimals = [];
    testAnimals[0] = await context.prisma.animal.create({
      data: {
        code: 'DEATH-001',
        registrationNumber: 'BR-2020-DT0001',
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      },
    });
    testAnimals[1] = await context.prisma.animal.create({
      data: {
        code: 'DEATH-002',
        registrationNumber: 'BR-2020-DT0002',
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /deaths', () => {
    const createDeathDto = {
      animalId: '',
      date: '2020-01-15',
      cause: 'Disease',
      observation: 'Test death',
    };

    it('should create a death successfully', async () => {
      const dto = {
        ...createDeathDto,
        animalId: testAnimals[0].id,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/deaths')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        animalId: testAnimals[0].id,
        deathDate: expect.stringMatching(/^2020-01-15/),
        cause: 'Disease',
        observation: 'Test death',
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();

      // Verify animal status changed to inactive
      const animal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(animal?.status).toBe('inactive');
    });

    it('should fail without add permission', async () => {
      const dto = {
        ...createDeathDto,
        animalId: testAnimals[0].id,
      };

      await request(context.app.getHttpServer())
        .post('/deaths')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail if animal already has active death', async () => {
      // Clean up any existing death for this animal first
      await context.prisma.death.deleteMany({
        where: {
          animalId: testAnimals[0].id,
          companyId: context.testCompany.id,
        },
      });

      // Create first death
      await context.prisma.death.create({
        data: {
          animalId: testAnimals[0].id,
          deathDate: new Date('2020-01-10'),
          cause: 'First cause',
          companyId: context.testCompany.id,
        },
      });

      const dto = {
        ...createDeathDto,
        animalId: testAnimals[0].id,
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/deaths')
        .send(dto)
        .expect(409);
    });

    it('should fail if animal not found', async () => {
      const dto = {
        ...createDeathDto,
        animalId: 'non-existent-animal',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/deaths')
        .send(dto)
        .expect(404);
    });

    it('should validate required fields', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/deaths')
        .send({ animalId: testAnimals[0].id })
        .expect(400);
    });
  });

  describe('GET /deaths', () => {
    let deathId: string;

    beforeEach(async () => {
      // Clean up any existing deaths for these animals first
      await context.prisma.death.deleteMany({
        where: {
          companyId: context.testCompany.id,
          animalId: { in: [testAnimals[0].id, testAnimals[1].id] },
        },
      });

      const death = await context.prisma.death.create({
        data: {
          animalId: testAnimals[0].id,
          deathDate: new Date('2020-01-15'),
          cause: 'Disease',
          companyId: context.testCompany.id,
        },
      });
      deathId = death.id;

      await context.prisma.death.create({
        data: {
          animalId: testAnimals[1].id,
          deathDate: new Date('2020-02-20'),
          cause: 'Accident',
          companyId: context.testCompany.id,
          deletedAt: new Date(),
        },
      });
    });

    it('should return all deaths for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/deaths')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('deathDate');
    });

    it('should exclude soft-deleted deaths', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/deaths')
        .expect(200);

      const ids = response.body.map((d: any) => d.id);
      expect(ids).toContain(deathId);
      expect(response.body.length).toBe(1);
    });

    it('should fail without view permission', async () => {
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            records: {
              deaths: {
                view: false,
                add: false,
                edit: false,
                remove: false,
              },
            },
          },
        },
      });

      const newToken = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'regular@testcompany.com',
          password: 'password123',
        })
        .then((res) => res.body.access_token);

      await authenticatedRequest(context.app, newToken)
        .get('/deaths')
        .expect(403);
    });
  });

  describe('GET /deaths/:id', () => {
    let deathId: string;

    beforeEach(async () => {
      // Clean up any existing death for this animal first
      await context.prisma.death.deleteMany({
        where: {
          animalId: testAnimals[0].id,
          companyId: context.testCompany.id,
        },
      });

      const death = await context.prisma.death.create({
        data: {
          animalId: testAnimals[0].id,
          deathDate: new Date('2020-01-15'),
          cause: 'Disease',
          companyId: context.testCompany.id,
        },
      });
      deathId = death.id;
    });

    it('should return death by ID', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/deaths/${deathId}`)
        .expect(200);

      expect(response.body.id).toBe(deathId);
      expect(response.body.companyId).toBe(context.testCompany.id);
    });

    it('should fail if death not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/deaths/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /deaths/animal/:animalId', () => {
    it('should return death for animal', async () => {
      // Clean up any existing death for this animal first
      await context.prisma.death.deleteMany({
        where: {
          animalId: testAnimals[0].id,
          companyId: context.testCompany.id,
        },
      });

      const death = await context.prisma.death.create({
        data: {
          animalId: testAnimals[0].id,
          deathDate: new Date('2020-01-15'),
          cause: 'Disease',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/deaths/animal/${testAnimals[0].id}`)
        .expect(200);

      expect(response.body.animalId).toBe(testAnimals[0].id);
      expect(response.body.id).toBe(death.id);
    });
  });

  describe('PUT /deaths/:id', () => {
    let deathId: string;

    beforeEach(async () => {
      // Clean up any existing death for this animal first
      await context.prisma.death.deleteMany({
        where: {
          animalId: testAnimals[0].id,
          companyId: context.testCompany.id,
        },
      });

      const death = await context.prisma.death.create({
        data: {
          animalId: testAnimals[0].id,
          deathDate: new Date('2020-01-15'),
          cause: 'Disease',
          companyId: context.testCompany.id,
        },
      });
      deathId = death.id;
    });

    it('should update death successfully', async () => {
      const updateDto = {
        cause: 'Updated cause',
        observation: 'Updated observation',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/deaths/${deathId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.cause).toBe('Updated cause');
      expect(response.body.observation).toBe('Updated observation');
    });

    it('should fail without edit permission', async () => {
      const updateDto = {
        cause: 'Updated cause',
      };

      await request(context.app.getHttpServer())
        .put(`/deaths/${deathId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('DELETE /deaths/:id', () => {
    let deathId: string;

    beforeEach(async () => {
      // Clean up any existing death for this animal first
      await context.prisma.death.deleteMany({
        where: {
          animalId: testAnimals[0].id,
          companyId: context.testCompany.id,
        },
      });

      const death = await context.prisma.death.create({
        data: {
          animalId: testAnimals[0].id,
          deathDate: new Date('2020-01-15'),
          cause: 'Disease',
          companyId: context.testCompany.id,
        },
      });
      deathId = death.id;

      await context.prisma.animal.update({
        where: { id: testAnimals[0].id },
        data: { status: 'inactive' },
      });
    });

    it('should soft delete death and restore animal status', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/deaths/${deathId}`)
        .expect(200);

      const death = await context.prisma.death.findUnique({
        where: { id: deathId },
      });
      expect(death?.deletedAt).toBeDefined();

      const animal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(animal?.status).toBe('active');
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/deaths/${deathId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });
  });
});
