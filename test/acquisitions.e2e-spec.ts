import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestSupplier } from './test-data-factories';
import { createTestCompany } from './test-utils';

describe('Acquisitions Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testSupplier: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Acquisitions Test Company',
      email: 'acquisitions@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });

    testSupplier = await createTestSupplier(context.prisma, {
      code: '001',
      name: 'Test Supplier',
      companyId: context.testCompany.id,
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
            acquisitions: {
              view: true,
              add: false,
              edit: false,
              remove: false,
            },
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

  describe('POST /acquisitions', () => {
    const createAcquisitionDto = {
      propertyId: '', // Will be set in each test
      supplierId: '', // Will be set in each test
      acquisitionDate: '2020-01-15',
      pricingMode: 'individual',
      paymentMethod: 'cash_flow',
      totalPrice: 10000.0,
      acquisitionItems: [
        {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          price: 5000.0,
          weight: 350.0,
        },
        {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          price: 5000.0,
          weight: 380.0,
        },
      ],
    };

    it('should create an acquisition with items successfully', async () => {
      const dto = {
        ...createAcquisitionDto,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/acquisitions')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
        acquisitionDate: expect.stringMatching(/^2020-01-15/),
        pricingMode: 'individual',
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.acquisitionItems).toBeDefined();
      expect(response.body.acquisitionItems.length).toBe(2);

      // Verify animals were created
      const animals = await context.prisma.animal.findMany({
        where: {
          code: { in: ['001', '002'] },
          companyId: context.testCompany.id,
        },
      });
      expect(animals.length).toBe(2);
    });

    it('should create acquisition with TOTAL pricing mode', async () => {
      const dto = {
        ...createAcquisitionDto,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
        pricingMode: 'total',
        totalPrice: 15000.0,
        acquisitionItems: [
          {
            code: '003',
            registrationNumber: 'BR-2020-FJ0003',
            price: 0, // Price ignored in TOTAL mode
            weight: 350.0,
          },
          {
            code: '004',
            registrationNumber: 'BR-2020-FJ0004',
            price: 0, // Price ignored in TOTAL mode
            weight: 380.0,
          },
        ],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/acquisitions')
        .send(dto)
        .expect(201);

      expect(response.body.pricingMode).toBe('total');
      expect(response.body.totalPrice).toBe(15000.0);

      // In TOTAL mode, price per animal should be totalPrice / itemCount
      const item1 = response.body.acquisitionItems.find(
        (item: any) => item.animalId && item.price === 7500.0,
      );
      expect(item1).toBeDefined();
    });

    it('should create acquisition with fees', async () => {
      const dto = {
        ...createAcquisitionDto,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
        fees: [
          { id: 'fee-001', name: 'Transportation', amount: 500.0 },
          { id: 'fee-002', name: 'Insurance', amount: 200.0 },
        ],
        transportationFee: 300.0,
        handlingFee: 150.0,
        acquisitionItems: [
          {
            code: '005',
            registrationNumber: 'BR-2020-FJ0005',
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/acquisitions')
        .send(dto)
        .expect(201);

      expect(response.body.fees).toBeDefined();
      expect(response.body.transportationFee).toBe(300.0);
      expect(response.body.handlingFee).toBe(150.0);
    });

    it('should create acquisition with existing animals', async () => {
      // Create existing animals
      const animal1 = await context.prisma.animal.create({
        data: {
          code: 'EXISTING-001',
          registrationNumber: 'BR-2019-EX0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const animal2 = await context.prisma.animal.create({
        data: {
          code: 'EXISTING-002',
          registrationNumber: 'BR-2019-EX0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const dto = {
        ...createAcquisitionDto,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
        acquisitionItems: [
          {
            animalId: animal1.id,
            price: 5000.0,
            weight: 350.0,
          },
          {
            animalId: animal2.id,
            price: 5000.0,
            weight: 380.0,
          },
        ],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/acquisitions')
        .send(dto)
        .expect(201);

      expect(response.body.acquisitionItems.length).toBe(2);
      expect(
        response.body.acquisitionItems.some(
          (item: any) => item.animalId === animal1.id,
        ),
      ).toBe(true);
      expect(
        response.body.acquisitionItems.some(
          (item: any) => item.animalId === animal2.id,
        ),
      ).toBe(true);
    });

    it('should calculate cost per arroba correctly', async () => {
      const dto = {
        ...createAcquisitionDto,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
        acquisitionItems: [
          {
            code: '006',
            registrationNumber: 'BR-2020-FJ0006',
            price: 5000.0,
            weight: 300.0, // 10 arrobas (300kg / 30kg per arroba)
          },
        ],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/acquisitions')
        .send(dto)
        .expect(201);

      const item = response.body.acquisitionItems[0];
      expect(item.costPerArroba).toBe(500.0); // 5000 / 10 arrobas
    });

    it('should fail without add permission', async () => {
      const dto = {
        ...createAcquisitionDto,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
      };
      await request(context.app.getHttpServer())
        .post('/acquisitions')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail if property does not exist', async () => {
      const dto = {
        ...createAcquisitionDto,
        propertyId: 'non-existent-property-id',
        supplierId: testSupplier.id,
      };
      await request(context.app.getHttpServer())
        .post('/acquisitions')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should fail if supplier does not exist', async () => {
      const dto = {
        ...createAcquisitionDto,
        propertyId: context.testProperty.id,
        supplierId: 'non-existent-supplier-id',
      };
      await request(context.app.getHttpServer())
        .post('/acquisitions')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should fail with duplicate animal code', async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      // Create animal with code 001
      await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const dto = {
        ...createAcquisitionDto,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
        acquisitionItems: [
          {
            code: '001', // Duplicate code
            registrationNumber: 'BR-2020-FJ0001-DUP',
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await request(context.app.getHttpServer())
        .post('/acquisitions')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/acquisitions')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ propertyId: context.testProperty.id }) // Missing required fields
        .expect(400);
    });

    it('should validate pricing mode enum', async () => {
      await request(context.app.getHttpServer())
        .post('/acquisitions')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createAcquisitionDto,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          pricingMode: 'invalid_mode',
        })
        .expect(400);
    });

    it('should validate at least one acquisition item', async () => {
      await request(context.app.getHttpServer())
        .post('/acquisitions')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createAcquisitionDto,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          acquisitionItems: [],
        })
        .expect(400);
    });
  });

  describe('GET /acquisitions', () => {
    let acquisitionId2: string;
    let animalIds: string[] = [];

    beforeEach(async () => {
      // Clean up any existing acquisitions and animals first
      await context.prisma.acquisition.deleteMany({
        where: { companyId: context.testCompany.id },
      });
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['001', '002'] },
        },
      });

      // Create test acquisitions
      const acquisition1 = await context.prisma.acquisition.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });

      const animal1 = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalIds.push(animal1.id);

      await context.prisma.acquisitionItem.create({
        data: {
          acquisitionId: acquisition1.id,
          animalId: animal1.id,
          price: 5000.0,
          weight: 350.0,
          costPerArroba: 500.0,
        },
      });

      const acquisition2 = await context.prisma.acquisition.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-02-20'),
          pricingMode: 'total',
          paymentMethod: 'accounts_payable',
          totalPrice: 15000.0,
          deletedAt: new Date(), // Soft deleted
        },
      });
      acquisitionId2 = acquisition2.id;
    });

    afterEach(async () => {
      if (animalIds.length > 0) {
        await context.prisma.animal.deleteMany({
          where: { id: { in: animalIds } },
        });
        animalIds = [];
      }
    });

    it('should return all acquisitions for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/acquisitions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('acquisitionDate');
      expect(response.body[0]).toHaveProperty('acquisitionItems');
    });

    it('should exclude soft-deleted acquisitions', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/acquisitions')
        .expect(200);

      const ids = response.body.map((a: any) => a.id);
      expect(ids).not.toContain(acquisitionId2);
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            records: {
              acquisitions: {
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
        .get('/acquisitions')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /acquisitions/:id', () => {
    let acquisitionId: string;
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const acquisition = await context.prisma.acquisition.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      acquisitionId = acquisition.id;

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      await context.prisma.acquisitionItem.create({
        data: {
          acquisitionId: acquisition.id,
          animalId: animal.id,
          price: 5000.0,
          weight: 350.0,
          costPerArroba: 500.0,
        },
      });
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should return an acquisition by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: acquisitionId,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
        pricingMode: 'individual',
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
      });
      expect(response.body.acquisitionItems).toBeDefined();
      expect(response.body.acquisitionItems.length).toBe(1);
    });

    it('should return 404 for non-existent acquisition', async () => {
      await request(context.app.getHttpServer())
        .get('/acquisitions/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted acquisition', async () => {
      // Soft delete the acquisition
      await context.prisma.acquisition.update({
        where: { id: acquisitionId },
        data: { deletedAt: new Date() },
      });

      await request(context.app.getHttpServer())
        .get(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('GET /acquisitions/animal/:animalId', () => {
    let acquisitionId: string;
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const acquisition = await context.prisma.acquisition.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      acquisitionId = acquisition.id;

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

      await context.prisma.acquisitionItem.create({
        data: {
          acquisitionId: acquisition.id,
          animalId: animal.id,
          price: 5000.0,
          weight: 350.0,
          costPerArroba: 500.0,
        },
      });
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should return an acquisition by animal id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/acquisitions/animal/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: acquisitionId,
        propertyId: context.testProperty.id,
        supplierId: testSupplier.id,
      });
    });

    it('should return 404 for animal without acquisition record', async () => {
      const animalWithoutAcquisition = await context.prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      await request(context.app.getHttpServer())
        .get(`/acquisitions/animal/${animalWithoutAcquisition.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for animal from different company', async () => {
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
        .get(`/acquisitions/animal/${otherAnimal.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /acquisitions/:id', () => {
    let acquisitionId: string;
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const acquisition = await context.prisma.acquisition.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      acquisitionId = acquisition.id;

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

      await context.prisma.acquisitionItem.create({
        data: {
          acquisitionId: acquisition.id,
          animalId: animal.id,
          price: 5000.0,
          weight: 350.0,
          costPerArroba: 500.0,
        },
      });
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should update an acquisition', async () => {
      const updateDto = {
        totalPrice: 12000.0,
        observation: 'Updated observation',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: acquisitionId,
        totalPrice: 12000.0,
        observation: 'Updated observation',
      });
    });

    it('should update acquisition items', async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'ACQ-UPDATE-002',
        },
      });

      const newAnimal = await context.prisma.animal.create({
        data: {
          code: 'ACQ-UPDATE-002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const updateDto = {
        totalPrice: 15000.0,
        acquisitionItems: [
          {
            animalId: animalId,
            price: 8000.0,
            weight: 400.0,
          },
          {
            animalId: newAnimal.id,
            price: 7000.0,
            weight: 380.0,
          },
        ],
      };

      const response = await request(context.app.getHttpServer())
        .put(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.acquisitionItems.length).toBe(2);
      expect(response.body.totalPrice).toBe(15000.0);
    });

    it('should fail without edit permission', async () => {
      await request(context.app.getHttpServer())
        .put(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ totalPrice: 12000.0 })
        .expect(403);
    });

    it('should fail if property does not belong to company', async () => {
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

      const updateDto = {
        propertyId: otherProperty.id,
      };

      await request(context.app.getHttpServer())
        .put(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('DELETE /acquisitions/:id', () => {
    let acquisitionId: string;
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const acquisition = await context.prisma.acquisition.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      acquisitionId = acquisition.id;

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      await context.prisma.acquisitionItem.create({
        data: {
          acquisitionId: acquisition.id,
          animalId: animal.id,
          price: 5000.0,
          weight: 350.0,
          costPerArroba: 500.0,
        },
      });
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should soft delete an acquisition', async () => {
      const response = await request(context.app.getHttpServer())
        .delete(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Acquisition record deleted successfully',
      });

      // Verify soft delete
      const deletedAcquisition = await context.prisma.acquisition.findUnique({
        where: { id: acquisitionId },
      });
      expect(deletedAcquisition?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(context.app.getHttpServer())
        .get('/acquisitions')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((a: any) => a.id === acquisitionId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent acquisition', async () => {
      await request(context.app.getHttpServer())
        .delete('/acquisitions/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let acquisitionId: string;

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

      // Create acquisition for first company
      const acquisition = await context.prisma.acquisition.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      acquisitionId = acquisition.id;
    });

    it('should not allow access to other company acquisitions', async () => {
      await request(context.app.getHttpServer())
        .get(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company acquisitions', async () => {
      await request(context.app.getHttpServer())
        .put(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ totalPrice: 20000.0 })
        .expect(404);
    });

    it('should not allow delete of other company acquisitions', async () => {
      await request(context.app.getHttpServer())
        .delete(`/acquisitions/${acquisitionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
