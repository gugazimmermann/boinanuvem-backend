import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { EmailService } from '../src/email/email.service';
import { createTestCompany, cleanupTestData } from './test-utils';

describe('Animals Management Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompany: any;
  let testUser: any;
  let testProperty: any;
  let authToken: string;
  let mainUserToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendEmailVerification: jest.fn().mockResolvedValue(undefined),
        sendPasswordReset: jest.fn().mockResolvedValue(undefined),
        sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
        sendTeamMemberInvitation: jest.fn().mockResolvedValue(undefined),
        sendEmail: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(async () => {
    await cleanupTestData(prisma);

    // Create test company with main user
    const testData = await createTestCompany(prisma, {
      companyName: 'Animals Test Company',
      email: 'animals@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
    });

    testCompany = testData.company;
    testUser = testData.user;

    // Activate the user for testing
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      })
      .expect(200);

    mainUserToken = loginResponse.body.access_token;

    // Create a test property
    testProperty = await prisma.property.create({
      data: {
        code: '001',
        name: 'Test Property',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        companyId: testCompany.id,
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88395-000',
      },
    });

    // Create a regular user with limited permissions
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    const regularUser = await prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'regular@testcompany.com',
        phone: '(47) 88888-8888',
        password: hashedPassword,
        companyId: testCompany.id,
        mainUser: false,
        status: 'active',
        emailVerifiedAt: new Date(),
        permissions: {
          registration: {
            animals: { view: true, add: false, edit: false, remove: false },
          },
        },
      },
    });

    const regularLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      })
      .expect(200);

    authToken = regularLoginResponse.body.access_token;
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  describe('POST /animals', () => {
    const createAnimalDto = {
      code: '001',
      registrationNumber: 'BR-2020-FJ0001',
      status: 'active',
      propertyId: '', // Will be set in each test
    };

    it('should create an animal successfully (main user)', async () => {
      const dto = { ...createAnimalDto, propertyId: testProperty.id };
      const response = await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        registrationNumber: dto.registrationNumber,
        status: dto.status,
        companyId: testCompany.id,
        propertyId: testProperty.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create an animal with acquisition date', async () => {
      const dto = {
        ...createAnimalDto,
        code: '002',
        registrationNumber: 'BR-2020-FJ0002',
        propertyId: testProperty.id,
        acquisitionDate: '2020-01-15',
      };

      const response = await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.acquisitionDate).toMatch(/^2020-01-15/);
    });

    it('should fail without add permission', async () => {
      const dto = { ...createAnimalDto, propertyId: testProperty.id };
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      const dto = { ...createAnimalDto, propertyId: testProperty.id };

      // Create first animal
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should allow same code for different companies', async () => {
      // Create another company
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      const otherProperty = await prisma.property.create({
        data: {
          code: '001',
          name: 'Other Company Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: otherTestData.company.id,
          street: 'Other Street',
          number: '123',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const dto1 = { ...createAnimalDto, propertyId: testProperty.id };
      const dto2 = {
        ...createAnimalDto,
        propertyId: otherProperty.id,
      };

      // Create animal in first company
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto1)
        .expect(201);

      // Activate other company user
      await prisma.user.update({
        where: { id: otherTestData.user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const otherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherTestData.user.email,
          password: 'password123',
        })
        .expect(200);

      const otherToken = otherLoginResponse.body.access_token;

      // Create animal with same code in second company (should succeed)
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should fail if property does not exist', async () => {
      const dto = {
        ...createAnimalDto,
        propertyId: 'non-existent-property-id',
      };
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should fail if property belongs to different company', async () => {
      // Create another company
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      const otherProperty = await prisma.property.create({
        data: {
          code: '001',
          name: 'Other Company Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: otherTestData.company.id,
          street: 'Other Street',
          number: '123',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const dto = { ...createAnimalDto, propertyId: otherProperty.id };
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate status enum', async () => {
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createAnimalDto,
          code: '004',
          propertyId: testProperty.id,
          status: 'invalid_status',
        })
        .expect(400);
    });

    it('should validate code is not empty', async () => {
      await request(app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createAnimalDto,
          code: '',
          propertyId: testProperty.id,
        })
        .expect(400);
    });
  });

  describe('GET /animals', () => {
    beforeEach(async () => {
      // Create test animals
      await prisma.animal.createMany({
        data: [
          {
            code: '001',
            registrationNumber: 'BR-2020-FJ0001',
            status: 'active',
            companyId: testCompany.id,
            propertyId: testProperty.id,
          },
          {
            code: '002',
            registrationNumber: 'BR-2020-FJ0002',
            status: 'active',
            companyId: testCompany.id,
            propertyId: testProperty.id,
          },
          {
            code: '003',
            registrationNumber: 'BR-2020-FJ0003',
            status: 'inactive',
            companyId: testCompany.id,
            propertyId: testProperty.id,
            deletedAt: new Date(), // Soft deleted
          },
        ],
      });
    });

    it('should return all animals for company', async () => {
      const response = await request(app.getHttpServer())
        .get('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('registrationNumber');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should exclude soft-deleted animals', async () => {
      const response = await request(app.getHttpServer())
        .get('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      const codes = response.body.map((a: any) => a.code);
      expect(codes).not.toContain('003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              animals: {
                view: false,
                add: false,
                edit: false,
                remove: false,
              },
            },
          },
        },
      });

      const newToken = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'regular@testcompany.com',
          password: 'password123',
        })
        .then((res) => res.body.access_token);

      await request(app.getHttpServer())
        .get('/animals')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /animals/:id', () => {
    let animalId: string;

    beforeEach(async () => {
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });
      animalId = animal.id;
    });

    it('should return an animal by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: animalId,
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        status: 'active',
      });
    });

    it('should return 404 for non-existent animal', async () => {
      await request(app.getHttpServer())
        .get('/animals/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted animal', async () => {
      // Soft delete the animal
      await prisma.animal.update({
        where: { id: animalId },
        data: { deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .get(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /animals/:id', () => {
    let animalId: string;

    beforeEach(async () => {
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });
      animalId = animal.id;
    });

    it('should update an animal', async () => {
      const updateDto = {
        registrationNumber: 'BR-2020-FJ0001-UPDATED',
        status: 'inactive',
      };

      const response = await request(app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: animalId,
        registrationNumber: 'BR-2020-FJ0001-UPDATED',
        status: 'inactive',
      });
    });

    it('should update animal code', async () => {
      const updateDto = {
        code: '001-UPDATED',
      };

      const response = await request(app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.code).toBe('001-UPDATED');
    });

    it('should fail without edit permission', async () => {
      await request(app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ registrationNumber: 'UPDATED' })
        .expect(403);
    });

    it('should fail with duplicate code in same company', async () => {
      // Create another animal
      await prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      // Try to update with duplicate code
      await request(app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ code: '002' })
        .expect(409);
    });

    it('should allow updating propertyId to valid property', async () => {
      // Create another property
      const otherProperty = await prisma.property.create({
        data: {
          code: '002',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: testCompany.id,
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const updateDto = {
        propertyId: otherProperty.id,
      };

      const response = await request(app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.propertyId).toBe(otherProperty.id);
    });

    it('should update acquisition date', async () => {
      const updateDto = {
        acquisitionDate: '2021-05-20',
      };

      const response = await request(app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.acquisitionDate).toMatch(/^2021-05-20/);
    });

    it('should clear acquisition date when set to null', async () => {
      // First set an acquisition date
      await prisma.animal.update({
        where: { id: animalId },
        data: { acquisitionDate: new Date('2020-01-15') },
      });

      const updateDto = {
        acquisitionDate: null,
      };

      const response = await request(app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.acquisitionDate).toBeUndefined();
    });
  });

  describe('DELETE /animals/:id', () => {
    let animalId: string;

    beforeEach(async () => {
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });
      animalId = animal.id;
    });

    it('should soft delete an animal', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Animal deleted successfully',
      });

      // Verify soft delete
      const deletedAnimal = await prisma.animal.findUnique({
        where: { id: animalId },
      });
      expect(deletedAnimal?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(app.getHttpServer())
        .get('/animals')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((a: any) => a.id === animalId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(app.getHttpServer())
        .delete(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent animal', async () => {
      await request(app.getHttpServer())
        .delete('/animals/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let animalId: string;

    beforeEach(async () => {
      // Create another company
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      otherUser = otherTestData.user;

      await prisma.user.update({
        where: { id: otherUser.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherUser.email,
          password: 'password123',
        })
        .expect(200);

      otherToken = loginResponse.body.access_token;

      // Create animal for first company
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });
      animalId = animal.id;
    });

    it('should not allow access to other company animals', async () => {
      await request(app.getHttpServer())
        .get(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company animals', async () => {
      await request(app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ registrationNumber: 'HACKED' })
        .expect(404);
    });

    it('should not allow delete of other company animals', async () => {
      await request(app.getHttpServer())
        .delete(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
