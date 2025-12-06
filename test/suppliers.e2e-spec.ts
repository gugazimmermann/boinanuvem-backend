import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { EmailService } from '../src/email/email.service';
import { createTestCompany, cleanupTestData } from './test-utils';

describe('Suppliers Management Flow (e2e)', () => {
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
      companyName: 'Suppliers Test Company',
      email: 'suppliers@testcompany.com',
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
            supplier: { view: true, add: false, edit: false, remove: false },
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

  describe('POST /suppliers', () => {
    const createSupplierDto = {
      code: '001',
      name: 'Fornecedor de Ração LTDA',
      status: 'active',
      propertyIds: [], // Will be set in each test
    };

    it('should create a supplier successfully (main user)', async () => {
      const dto = { ...createSupplierDto, propertyIds: [testProperty.id] };
      const response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        status: dto.status,
        companyId: testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create a supplier with optional fields', async () => {
      const dto = {
        ...createSupplierDto,
        code: '002',
        cpf: '123.456.789-00',
        cnpj: '12.345.678/0001-90',
        email: 'contato@fornecedor.com',
        phone: '(47) 99999-9999',
        street: 'Rua das Flores',
        number: '123',
        complement: 'Galpão 1',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        propertyIds: [testProperty.id],
      };

      const response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      });
    });

    it('should fail without add permission', async () => {
      const dto = { ...createSupplierDto, propertyIds: [testProperty.id] };
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      const dto = { ...createSupplierDto, propertyIds: [testProperty.id] };

      // Create first supplier
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/suppliers')
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

      const dto1 = { ...createSupplierDto, propertyIds: [testProperty.id] };
      const dto2 = {
        ...createSupplierDto,
        propertyIds: [otherProperty.id],
      };

      // Create supplier in first company
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto1)
        .expect(201);

      // Login as other company user
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

      // Create supplier with same code in second company (should succeed)
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate propertyIds requirement', async () => {
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createSupplierDto,
          code: '004',
          propertyIds: [], // Empty array
        })
        .expect(400);
    });

    it('should validate status enum', async () => {
      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createSupplierDto,
          code: '005',
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
          status: 'invalid_status',
        })
        .expect(400);
    });
  });

  describe('GET /suppliers', () => {
    beforeEach(async () => {
      // Create test suppliers
      await prisma.supplier.create({
        data: {
          code: '001',
          name: 'Supplier 1',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });

      await prisma.supplier.create({
        data: {
          code: '002',
          name: 'Supplier 2',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });

      await prisma.supplier.create({
        data: {
          code: '003',
          name: 'Deleted Supplier',
          status: 'active',
          companyId: testCompany.id,
          deletedAt: new Date(), // Soft deleted
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
    });

    it('should return all suppliers for company', async () => {
      const response = await request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should exclude soft-deleted suppliers', async () => {
      const response = await request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      const codes = response.body.map((s: any) => s.code);
      expect(codes).not.toContain('003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              supplier: { view: false, add: false, edit: false, remove: false },
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
        .get('/suppliers')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /suppliers/:id', () => {
    let supplierId: string;

    beforeEach(async () => {
      const supplier = await prisma.supplier.create({
        data: {
          code: '001',
          name: 'Test Supplier',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
      supplierId = supplier.id;
    });

    it('should return a supplier by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: supplierId,
        code: '001',
        name: 'Test Supplier',
      });
    });

    it('should return 404 for non-existent supplier', async () => {
      await request(app.getHttpServer())
        .get('/suppliers/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted supplier', async () => {
      // Soft delete the supplier
      await prisma.supplier.update({
        where: { id: supplierId },
        data: { deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /suppliers/:id', () => {
    let supplierId: string;

    beforeEach(async () => {
      const supplier = await prisma.supplier.create({
        data: {
          code: '001',
          name: 'Test Supplier',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
      supplierId = supplier.id;
    });

    it('should update a supplier', async () => {
      const updateDto = {
        name: 'Updated Supplier Name',
        status: 'inactive',
      };

      const response = await request(app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: supplierId,
        name: 'Updated Supplier Name',
        status: 'inactive',
      });
    });

    it('should fail without edit permission', async () => {
      await request(app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should fail with duplicate code', async () => {
      // Create another supplier
      await prisma.supplier.create({
        data: {
          code: '002',
          name: 'Other Supplier',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });

      // Try to update with duplicate code
      await request(app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ code: '002' })
        .expect(409);
    });
  });

  describe('DELETE /suppliers/:id', () => {
    let supplierId: string;

    beforeEach(async () => {
      const supplier = await prisma.supplier.create({
        data: {
          code: '001',
          name: 'Test Supplier',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
      supplierId = supplier.id;
    });

    it('should soft delete a supplier', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Supplier deleted successfully',
      });

      // Verify soft delete
      const deletedSupplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
      });
      expect(deletedSupplier?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((s: any) => s.id === supplierId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent supplier', async () => {
      await request(app.getHttpServer())
        .delete('/suppliers/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let supplierId: string;

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

      // Create supplier for first company
      const supplier = await prisma.supplier.create({
        data: {
          code: '001',
          name: 'First Company Supplier',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
      supplierId = supplier.id;
    });

    it('should not allow access to other company suppliers', async () => {
      await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company suppliers', async () => {
      await request(app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow delete of other company suppliers', async () => {
      await request(app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
