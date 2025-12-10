import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { EmailService } from '../src/email/email.service';
import { createTestCompany, cleanupTestData } from './test-utils';

describe('Births Management Flow (e2e)', () => {
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
      companyName: 'Births Test Company',
      email: 'births@testcompany.com',
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
          records: {
            births: { view: true, add: false, edit: false, remove: false },
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

  describe('POST /births', () => {
    const createBirthDto = {
      code: '001',
      registrationNumber: 'BR-2020-FJ0001',
      propertyId: '', // Will be set in each test
      birthDate: '2020-01-15',
    };

    it('should create a birth record and animal successfully', async () => {
      const dto = { ...createBirthDto, propertyId: testProperty.id };
      const response = await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        birthDate: expect.stringMatching(/^2020-01-15/),
        companyId: testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.animalId).toBeDefined();
      expect(response.body.createdAt).toBeDefined();

      // Verify animal was created
      const animal = await prisma.animal.findUnique({
        where: { id: response.body.animalId },
      });
      expect(animal).toBeDefined();
      expect(animal?.code).toBe('001');
      expect(animal?.registrationNumber).toBe('BR-2020-FJ0001');
    });

    it('should create birth with breed and gender', async () => {
      const dto = {
        ...createBirthDto,
        code: '002',
        registrationNumber: 'BR-2020-FJ0002',
        propertyId: testProperty.id,
        breed: 'nelore',
        gender: 'male',
      };

      const response = await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.breed).toBe('nelore');
      expect(response.body.gender).toBe('male');
    });

    it('should calculate purity automatically when not provided', async () => {
      const dto = {
        ...createBirthDto,
        code: '003',
        registrationNumber: 'BR-2020-FJ0003',
        propertyId: testProperty.id,
      };

      const response = await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      // When no parents, purity should default to PO
      expect(response.body.purity).toBeDefined();
    });

    it('should create birth with mother and father', async () => {
      // Create mother and father animals
      const mother = await prisma.animal.create({
        data: {
          code: 'MOTHER-001',
          registrationNumber: 'BR-2019-MJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const father = await prisma.animal.create({
        data: {
          code: 'FATHER-001',
          registrationNumber: 'BR-2018-MJ0002',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      // Create birth records for parents
      await prisma.birth.create({
        data: {
          animalId: mother.id,
          birthDate: new Date('2019-01-15'),
          breed: 'nelore',
          gender: 'female',
          purity: 'po',
          companyId: testCompany.id,
        },
      });

      await prisma.birth.create({
        data: {
          animalId: father.id,
          birthDate: new Date('2018-01-15'),
          breed: 'nelore',
          gender: 'male',
          purity: 'po',
          companyId: testCompany.id,
        },
      });

      const dto = {
        ...createBirthDto,
        code: '004',
        registrationNumber: 'BR-2020-FJ0004',
        propertyId: testProperty.id,
        motherId: mother.id,
        fatherId: father.id,
        breed: 'nelore',
      };

      const response = await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.motherId).toBe(mother.id);
      expect(response.body.fatherId).toBe(father.id);
      // Same breed PO + PO = PO
      expect(response.body.purity).toBe('po');
    });

    it('should fail without add permission', async () => {
      const dto = { ...createBirthDto, propertyId: testProperty.id };
      await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate animal code', async () => {
      const dto = { ...createBirthDto, propertyId: testProperty.id };

      // Create first birth
      await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should fail if property does not exist', async () => {
      const dto = {
        ...createBirthDto,
        propertyId: 'non-existent-property-id',
      };
      await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should fail if mother does not belong to company', async () => {
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

      const otherMother = await prisma.animal.create({
        data: {
          code: 'OTHER-MOTHER',
          registrationNumber: 'BR-2019-OTHER',
          status: 'active',
          companyId: otherTestData.company.id,
          propertyId: otherProperty.id,
        },
      });

      const dto = {
        ...createBirthDto,
        code: '005',
        registrationNumber: 'BR-2020-FJ0005',
        propertyId: testProperty.id,
        motherId: otherMother.id,
      };

      await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ code: '006' }) // Missing required fields
        .expect(400);
    });

    it('should validate birth date format', async () => {
      await request(app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createBirthDto,
          code: '007',
          registrationNumber: 'BR-2020-FJ0007',
          propertyId: testProperty.id,
          birthDate: 'invalid-date',
        })
        .expect(400);
    });
  });

  describe('GET /births', () => {
    let birthId2: string;

    beforeEach(async () => {
      // Create test animals and births
      const animal1 = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      await prisma.birth.create({
        data: {
          animalId: animal1.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: testCompany.id,
        },
      });

      const animal2 = await prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const birth2 = await prisma.birth.create({
        data: {
          animalId: animal2.id,
          birthDate: new Date('2020-02-20'),
          breed: 'angus',
          gender: 'female',
          companyId: testCompany.id,
          deletedAt: new Date(), // Soft deleted
        },
      });
      birthId2 = birth2.id;
    });

    it('should return all births for company', async () => {
      const response = await request(app.getHttpServer())
        .get('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('animalId');
      expect(response.body[0]).toHaveProperty('birthDate');
    });

    it('should exclude soft-deleted births', async () => {
      const response = await request(app.getHttpServer())
        .get('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      const ids = response.body.map((b: any) => b.id);
      expect(ids).not.toContain(birthId2);
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            records: {
              births: {
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
        .get('/births')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /births/:id', () => {
    let birthId: string;
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

      const birth = await prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should return a birth by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/births/${birthId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: birthId,
        animalId: animalId,
        birthDate: expect.stringMatching(/^2020-01-15/),
        breed: 'nelore',
        gender: 'male',
      });
    });

    it('should return 404 for non-existent birth', async () => {
      await request(app.getHttpServer())
        .get('/births/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted birth', async () => {
      // Soft delete the birth
      await prisma.birth.update({
        where: { id: birthId },
        data: { deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .get(`/births/${birthId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('GET /births/animal/:animalId', () => {
    let birthId: string;
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

      const birth = await prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should return a birth by animal id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/births/animal/${animalId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: birthId,
        animalId: animalId,
        birthDate: expect.stringMatching(/^2020-01-15/),
      });
    });

    it('should return 404 for animal without birth record', async () => {
      const animalWithoutBirth = await prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      await request(app.getHttpServer())
        .get(`/births/animal/${animalWithoutBirth.id}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for animal from different company', async () => {
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

      const otherAnimal = await prisma.animal.create({
        data: {
          code: 'OTHER-001',
          registrationNumber: 'BR-2020-OTHER',
          status: 'active',
          companyId: otherTestData.company.id,
          propertyId: otherProperty.id,
        },
      });

      await request(app.getHttpServer())
        .get(`/births/animal/${otherAnimal.id}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /births/:id', () => {
    let birthId: string;

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

      const birth = await prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should update a birth record', async () => {
      const updateDto = {
        breed: 'angus',
        gender: 'female',
      };

      const response = await request(app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: birthId,
        breed: 'angus',
        gender: 'female',
      });
    });

    it('should update birth date', async () => {
      const updateDto = {
        birthDate: '2020-02-20',
      };

      const response = await request(app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.birthDate).toMatch(/^2020-02-20/);
    });

    it('should update mother and father', async () => {
      // Create mother and father animals
      const mother = await prisma.animal.create({
        data: {
          code: 'MOTHER-001',
          registrationNumber: 'BR-2019-MJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const father = await prisma.animal.create({
        data: {
          code: 'FATHER-001',
          registrationNumber: 'BR-2018-MJ0002',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const updateDto = {
        motherId: mother.id,
        fatherId: father.id,
      };

      const response = await request(app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.motherId).toBe(mother.id);
      expect(response.body.fatherId).toBe(father.id);
    });

    it('should fail without edit permission', async () => {
      await request(app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ breed: 'angus' })
        .expect(403);
    });

    it('should fail if mother does not belong to company', async () => {
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

      const otherMother = await prisma.animal.create({
        data: {
          code: 'OTHER-MOTHER',
          registrationNumber: 'BR-2019-OTHER',
          status: 'active',
          companyId: otherTestData.company.id,
          propertyId: otherProperty.id,
        },
      });

      const updateDto = {
        motherId: otherMother.id,
      };

      await request(app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('DELETE /births/:id', () => {
    let birthId: string;

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

      const birth = await prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should soft delete a birth record', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/births/${birthId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Birth record deleted successfully',
      });

      // Verify soft delete
      const deletedBirth = await prisma.birth.findUnique({
        where: { id: birthId },
      });
      expect(deletedBirth?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(app.getHttpServer())
        .get('/births')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((b: any) => b.id === birthId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(app.getHttpServer())
        .delete(`/births/${birthId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent birth', async () => {
      await request(app.getHttpServer())
        .delete('/births/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let birthId: string;

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

      // Create birth for first company
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const birth = await prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should not allow access to other company births', async () => {
      await request(app.getHttpServer())
        .get(`/births/${birthId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company births', async () => {
      await request(app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ breed: 'angus' })
        .expect(404);
    });

    it('should not allow delete of other company births', async () => {
      await request(app.getHttpServer())
        .delete(`/births/${birthId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
