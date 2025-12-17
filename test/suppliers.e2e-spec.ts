import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestCompany } from './test-utils';

describe('Suppliers Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Suppliers Test Company',
      email: 'suppliers@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });

    // Create a test property
    // Property is already created by setupE2ETest with createProperty: true

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
          registration: {
            supplier: { view: true, add: false, edit: false, remove: false },
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

  describe('POST /suppliers', () => {
    const createSupplierDto = {
      code: '001',
      name: 'Fornecedor de Ração LTDA',
      cpf: '123.456.789-00',
      status: 'active',
      propertyIds: [], // Will be set in each test
    };

    it('should create a supplier successfully (main user)', async () => {
      const dto = {
        ...createSupplierDto,
        propertyIds: [context.testProperty.id],
      };
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/suppliers')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        status: dto.status,
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create a supplier with optional fields', async () => {
      const dto = {
        ...createSupplierDto,
        code: '002',
        cpf: undefined,
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
        propertyIds: [context.testProperty.id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/suppliers')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      });
    });

    it('should fail when both cpf and cnpj are provided', async () => {
      const dto = {
        ...createSupplierDto,
        code: 'BOTH-001',
        cpf: '123.456.789-00',
        cnpj: '12.345.678/0001-90',
        propertyIds: [context.testProperty.id],
      };
      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/suppliers')
        .send(dto)
        .expect(400);
    });

    it('should fail when neither cpf nor cnpj is provided', async () => {
      const dto = {
        ...createSupplierDto,
        code: 'NONE-001',
        cpf: undefined,
        cnpj: undefined,
        propertyIds: [context.testProperty.id],
      };
      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/suppliers')
        .send(dto)
        .expect(400);
    });

    it('should fail without add permission', async () => {
      const dto = {
        ...createSupplierDto,
        propertyIds: [context.testProperty.id],
      };
      await request(context.app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      // Clean up any existing supplier with this code first
      await context.prisma.supplier.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const dto = {
        ...createSupplierDto,
        propertyIds: [context.testProperty.id],
      };

      // Create first supplier
      await request(context.app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(context.app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should allow same code for different companies', async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Clean up any existing supplier with this code in first company
      await context.prisma.supplier.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      // Clean up any existing property with this code in other company
      await context.prisma.property.deleteMany({
        where: {
          companyId: otherTestData.company.id,
          code: '001',
        },
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

      const dto1 = {
        ...createSupplierDto,
        propertyIds: [context.testProperty.id],
      };
      const dto2 = {
        ...createSupplierDto,
        propertyIds: [otherProperty.id],
      };

      // Create supplier in first company
      await request(context.app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto1)
        .expect(201);

      // Login as other company user
      await context.prisma.user.update({
        where: { id: otherTestData.user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const otherLoginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherTestData.user.email,
          password: 'password123',
        })
        .expect(200);

      const otherToken = otherLoginResponse.body.access_token;

      // Create supplier with same code in second company (should succeed)
      await request(context.app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should validate required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate propertyIds requirement', async () => {
      await request(context.app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createSupplierDto,
          code: '004',
          propertyIds: [], // Empty array
        })
        .expect(400);
    });

    it('should validate status enum', async () => {
      await request(context.app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createSupplierDto,
          code: '005',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
          status: 'invalid_status',
        })
        .expect(400);
    });
  });

  describe('GET /suppliers', () => {
    let supplierIds: string[] = [];

    beforeEach(async () => {
      // Clean up any existing suppliers with these codes first
      await context.prisma.supplier.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['001', '002', '003'] },
        },
      });

      // Create test suppliers
      const supplier1 = await context.prisma.supplier.create({
        data: {
          code: '001',
          name: 'Supplier 1',
          status: 'active',
          companyId: context.testCompany.id,
          cpf: '12345678900',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      const supplier2 = await context.prisma.supplier.create({
        data: {
          code: '002',
          name: 'Supplier 2',
          status: 'active',
          companyId: context.testCompany.id,
          cpf: '12345678900',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      const supplier3 = await context.prisma.supplier.create({
        data: {
          code: '003',
          name: 'Deleted Supplier',
          status: 'active',
          companyId: context.testCompany.id,
          cpf: '12345678900',
          deletedAt: new Date(), // Soft deleted
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      supplierIds = [supplier1.id, supplier2.id, supplier3.id];
    });

    afterEach(async () => {
      if (supplierIds.length > 0) {
        await context.prisma.supplier.deleteMany({
          where: { id: { in: supplierIds } },
        });
        supplierIds = [];
      }
    });

    it('should return all suppliers for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/suppliers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should exclude soft-deleted suppliers', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/suppliers')
        .expect(200);

      const codes = response.body.map((s: any) => s.code);
      expect(codes).not.toContain('003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              supplier: { view: false, add: false, edit: false, remove: false },
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
        .get('/suppliers')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /suppliers/:id', () => {
    let supplierId: string;

    beforeEach(async () => {
      const supplier = await context.prisma.supplier.create({
        data: {
          code: '001',
          name: 'Test Supplier',
          status: 'active',
          companyId: context.testCompany.id,
          cpf: '12345678900',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      supplierId = supplier.id;
    });

    afterEach(async () => {
      if (supplierId) {
        await context.prisma.supplier.deleteMany({
          where: { id: supplierId },
        });
      }
    });

    it('should return a supplier by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: supplierId,
        code: '001',
        name: 'Test Supplier',
      });
    });

    it('should return 404 for non-existent supplier', async () => {
      await request(context.app.getHttpServer())
        .get('/suppliers/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted supplier', async () => {
      // Soft delete the supplier
      await context.prisma.supplier.update({
        where: { id: supplierId },
        data: { deletedAt: new Date() },
      });

      await request(context.app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /suppliers/:id', () => {
    let supplierId: string;

    beforeEach(async () => {
      const supplier = await context.prisma.supplier.create({
        data: {
          code: '001',
          name: 'Test Supplier',
          status: 'active',
          companyId: context.testCompany.id,
          cpf: '12345678900',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      supplierId = supplier.id;
    });

    afterEach(async () => {
      if (supplierId) {
        await context.prisma.supplier.deleteMany({
          where: { id: supplierId },
        });
      }
    });

    it('should update a supplier', async () => {
      const updateDto = {
        name: 'Updated Supplier Name',
        status: 'inactive',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: supplierId,
        name: 'Updated Supplier Name',
        status: 'inactive',
      });
    });

    it('should fail without edit permission', async () => {
      await request(context.app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should fail with duplicate code', async () => {
      // Create another supplier
      await context.prisma.supplier.create({
        data: {
          code: '002',
          name: 'Other Supplier',
          status: 'active',
          companyId: context.testCompany.id,
          cpf: '12345678900',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      // Try to update with duplicate code
      await request(context.app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '002' })
        .expect(409);
    });

    it('should fail when updating to have both CPF and CNPJ', async () => {
      await request(context.app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          cpf: '123.456.789-00',
          cnpj: '12.345.678/0001-90',
        })
        .expect(400);
    });

    it('should fail when updating to have neither CPF nor CNPJ', async () => {
      await request(context.app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          cpf: null,
          cnpj: null,
        })
        .expect(400);
    });

    it('should update successfully when changing from CPF to CNPJ', async () => {
      const response = await request(context.app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          cpf: null,
          cnpj: '12.345.678/0001-90',
        })
        .expect(200);

      expect(response.body.cpf).toBeUndefined();
      expect(response.body.cnpj).toBe('12345678000190');
    });
  });

  describe('DELETE /suppliers/:id', () => {
    let supplierId: string;

    beforeEach(async () => {
      const supplier = await context.prisma.supplier.create({
        data: {
          code: '001',
          name: 'Test Supplier',
          status: 'active',
          companyId: context.testCompany.id,
          cpf: '12345678900',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      supplierId = supplier.id;
    });

    afterEach(async () => {
      if (supplierId) {
        await context.prisma.supplier.deleteMany({
          where: { id: supplierId },
        });
      }
    });

    it('should soft delete a supplier', async () => {
      const response = await request(context.app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Supplier deleted successfully',
      });

      // Verify soft delete
      const deletedSupplier = await context.prisma.supplier.findUnique({
        where: { id: supplierId },
      });
      expect(deletedSupplier?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(context.app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((s: any) => s.id === supplierId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent supplier', async () => {
      await request(context.app.getHttpServer())
        .delete('/suppliers/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let supplierId: string;

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

      // Clean up any existing supplier with this code in first company
      await context.prisma.supplier.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      // Create supplier for first company
      const supplier = await context.prisma.supplier.create({
        data: {
          code: '001',
          name: 'First Company Supplier',
          status: 'active',
          companyId: context.testCompany.id,
          cpf: '12345678900',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      supplierId = supplier.id;
    });

    it('should not allow access to other company suppliers', async () => {
      await request(context.app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company suppliers', async () => {
      await request(context.app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow delete of other company suppliers', async () => {
      await request(context.app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
