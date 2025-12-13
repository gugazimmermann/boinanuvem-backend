import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestCompany } from './test-utils';

describe('Births Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Births Test Company',
      email: 'births@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });

    // Create a regular user with limited permissions
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    const regularUser = await context.prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'regular@testcompany.com',
        phone: '(47) 88888-8888',
        password: hashedPassword,
        companyId: context.testCompany.id,
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

    const regularLoginResponse = await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      })
      .expect(200);

    context.authToken = regularLoginResponse.body.access_token;
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /births', () => {
    const createBirthDto = {
      code: '001',
      registrationNumber: 'BR-2020-FJ0001',
      propertyId: '', // Will be set in each test
      birthDate: '2020-01-15',
    };

    it('should create a birth record and animal successfully', async () => {
      const dto = { ...createBirthDto, propertyId: context.testProperty.id };
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/births')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        birthDate: expect.stringMatching(/^2020-01-15/),
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.animalId).toBeDefined();
      expect(response.body.createdAt).toBeDefined();

      // Verify animal was created
      const animal = await context.prisma.animal.findUnique({
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
        propertyId: context.testProperty.id,
        breed: 'nelore',
        gender: 'male',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/births')
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
        propertyId: context.testProperty.id,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/births')
        .send(dto)
        .expect(201);

      // When no parents, purity should default to PO
      expect(response.body.purity).toBeDefined();
    });

    it('should create birth with mother and father', async () => {
      // Create mother and father animals
      const mother = await context.prisma.animal.create({
        data: {
          code: 'MOTHER-001',
          registrationNumber: 'BR-2019-MJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const father = await context.prisma.animal.create({
        data: {
          code: 'FATHER-001',
          registrationNumber: 'BR-2018-MJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      // Create birth records for parents
      await context.prisma.birth.create({
        data: {
          animalId: mother.id,
          birthDate: new Date('2019-01-15'),
          breed: 'nelore',
          gender: 'female',
          purity: 'po',
          companyId: context.testCompany.id,
        },
      });

      await context.prisma.birth.create({
        data: {
          animalId: father.id,
          birthDate: new Date('2018-01-15'),
          breed: 'nelore',
          gender: 'male',
          purity: 'po',
          companyId: context.testCompany.id,
        },
      });

      const dto = {
        ...createBirthDto,
        code: '004',
        registrationNumber: 'BR-2020-FJ0004',
        propertyId: context.testProperty.id,
        motherId: mother.id,
        fatherId: father.id,
        breed: 'nelore',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/births')
        .send(dto)
        .expect(201);

      expect(response.body.motherId).toBe(mother.id);
      expect(response.body.fatherId).toBe(father.id);
      // Same breed PO + PO = PO
      expect(response.body.purity).toBe('po');
    });

    it('should fail without add permission', async () => {
      const dto = { ...createBirthDto, propertyId: context.testProperty.id };
      await request(context.app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate animal code', async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const dto = { ...createBirthDto, propertyId: context.testProperty.id };

      // Create first birth
      await request(context.app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(context.app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should fail if property does not exist', async () => {
      const dto = {
        ...createBirthDto,
        propertyId: 'non-existent-property-id',
      };
      await request(context.app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should fail if mother does not belong to company', async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      const otherProperty = await context.prisma.property.create({
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

      const otherMother = await context.prisma.animal.create({
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
        propertyId: context.testProperty.id,
        motherId: otherMother.id,
      };

      await request(context.app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should validate required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '006' }) // Missing required fields
        .expect(400);
    });

    it('should validate birth date format', async () => {
      await request(context.app.getHttpServer())
        .post('/births')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createBirthDto,
          code: '007',
          registrationNumber: 'BR-2020-FJ0007',
          propertyId: context.testProperty.id,
          birthDate: 'invalid-date',
        })
        .expect(400);
    });
  });

  describe('GET /births', () => {
    let birthId2: string;
    let animalIds: string[] = [];

    beforeEach(async () => {
      // Clean up any existing births and animals with these codes first
      await context.prisma.birth.deleteMany({
        where: { companyId: context.testCompany.id },
      });
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['GET-001', 'GET-002'] },
        },
      });

      // Create test animals and births
      const animal1 = await context.prisma.animal.create({
        data: {
          code: 'GET-001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      await context.prisma.birth.create({
        data: {
          animalId: animal1.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });

      const animal2 = await context.prisma.animal.create({
        data: {
          code: 'GET-002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const birth2 = await context.prisma.birth.create({
        data: {
          animalId: animal2.id,
          birthDate: new Date('2020-02-20'),
          breed: 'angus',
          gender: 'female',
          companyId: context.testCompany.id,
          deletedAt: new Date(), // Soft deleted
        },
      });
      birthId2 = birth2.id;
      animalIds = [animal1.id, animal2.id];
    });

    afterEach(async () => {
      if (animalIds.length > 0) {
        await context.prisma.animal.deleteMany({
          where: { id: { in: animalIds } },
        });
        animalIds = [];
      }
    });

    it('should return all births for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/births')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('animalId');
      expect(response.body[0]).toHaveProperty('birthDate');
    });

    it('should exclude soft-deleted births', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/births')
        .expect(200);

      const ids = response.body.map((b: any) => b.id);
      expect(ids).not.toContain(birthId2);
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
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

      const newToken = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'regular@testcompany.com',
          password: 'password123',
        })
        .then((res) => res.body.access_token);

      await request(context.app.getHttpServer())
        .get('/births')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /births/:id', () => {
    let birthId: string;
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;

      const birth = await context.prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });
      birthId = birth.id;
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should return a birth by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
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
      await request(context.app.getHttpServer())
        .get('/births/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted birth', async () => {
      // Soft delete the birth
      await context.prisma.birth.update({
        where: { id: birthId },
        data: { deletedAt: new Date() },
      });

      await request(context.app.getHttpServer())
        .get(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('GET /births/animal/:animalId', () => {
    let birthId: string;
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;

      const birth = await context.prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should return a birth by animal id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/births/animal/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: birthId,
        animalId: animalId,
        birthDate: expect.stringMatching(/^2020-01-15/),
      });
    });

    it('should return 404 for animal without birth record', async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'BIRTH-404-002',
        },
      });

      const animalWithoutBirth = await context.prisma.animal.create({
        data: {
          code: 'BIRTH-404-002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      await request(context.app.getHttpServer())
        .get(`/births/animal/${animalWithoutBirth.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for animal from different company', async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      const otherProperty = await context.prisma.property.create({
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

      const otherAnimal = await context.prisma.animal.create({
        data: {
          code: 'OTHER-001',
          registrationNumber: 'BR-2020-OTHER',
          status: 'active',
          companyId: otherTestData.company.id,
          propertyId: otherProperty.id,
        },
      });

      await request(context.app.getHttpServer())
        .get(`/births/animal/${otherAnimal.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /births/:id', () => {
    let birthId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const birth = await context.prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should update a birth record', async () => {
      const updateDto = {
        breed: 'angus',
        gender: 'female',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
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

      const response = await request(context.app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.birthDate).toMatch(/^2020-02-20/);
    });

    it('should update mother and father', async () => {
      // Clean up any existing animals with these codes first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['BIRTH-MOTHER-001', 'BIRTH-FATHER-001'] },
        },
      });

      // Create mother and father animals
      const mother = await context.prisma.animal.create({
        data: {
          code: 'BIRTH-MOTHER-001',
          registrationNumber: 'BR-2019-MJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const father = await context.prisma.animal.create({
        data: {
          code: 'BIRTH-FATHER-001',
          registrationNumber: 'BR-2018-MJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const updateDto = {
        motherId: mother.id,
        fatherId: father.id,
      };

      const response = await request(context.app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.motherId).toBe(mother.id);
      expect(response.body.fatherId).toBe(father.id);
    });

    it('should fail without edit permission', async () => {
      await request(context.app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ breed: 'angus' })
        .expect(403);
    });

    it('should fail if mother does not belong to company', async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      const otherProperty = await context.prisma.property.create({
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

      const otherMother = await context.prisma.animal.create({
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

      await request(context.app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('DELETE /births/:id', () => {
    let birthId: string;
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const birth = await context.prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });
      birthId = birth.id;
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should soft delete a birth record', async () => {
      const response = await request(context.app.getHttpServer())
        .delete(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Birth record deleted successfully',
      });

      // Verify soft delete
      const deletedBirth = await context.prisma.birth.findUnique({
        where: { id: birthId },
      });
      expect(deletedBirth?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(context.app.getHttpServer())
        .get('/births')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((b: any) => b.id === birthId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/births/${birthId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent birth', async () => {
      await request(context.app.getHttpServer())
        .delete('/births/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let birthId: string;

    beforeEach(async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      otherUser = otherTestData.user;

      await context.prisma.user.update({
        where: { id: otherUser.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const loginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherUser.email,
          password: 'password123',
        })
        .expect(200);

      otherToken = loginResponse.body.access_token;

      // Clean up any existing animal with this code in first company
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      // Create birth for first company
      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const birth = await context.prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should not allow access to other company births', async () => {
      await request(context.app.getHttpServer())
        .get(`/births/${birthId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company births', async () => {
      await request(context.app.getHttpServer())
        .put(`/births/${birthId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ breed: 'angus' })
        .expect(404);
    });

    it('should not allow delete of other company births', async () => {
      await request(context.app.getHttpServer())
        .delete(`/births/${birthId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
