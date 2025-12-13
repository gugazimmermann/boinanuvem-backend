import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Sales Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAnimals: any[];

  beforeEach(async () => {
    context = await setupE2ETest({
      companyName: 'Sales Test Company',
      email: 'sales@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createBuyer: true,
      createAnimals: 2,
      createRegularUser: true,
      regularUserPermissions: {
        records: {
          sales: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
        },
      },
    });
    testAnimals = context.testAnimals;
  });

  afterEach(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /sales', () => {
    const createSaleDto = {
      propertyId: '',
      buyerId: '',
      saleDate: '2020-01-15',
      saleType: 'slaughterhouse',
      pricingMode: 'individual',
      paymentMethod: 'cash_flow',
      totalPrice: 10000.0,
      saleItems: [
        {
          animalId: '',
          price: 5000.0,
          weight: 350.0,
          carcassWeight: 280.0,
        },
        {
          animalId: '',
          price: 5000.0,
          weight: 380.0,
        },
      ],
    };

    it('should create a sale with items successfully', async () => {
      const dto = {
        ...createSaleDto,
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
            carcassWeight: 280.0,
          },
          {
            animalId: testAnimals[1].id,
            price: 5000.0,
            weight: 380.0,
          },
        ],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/sales')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: expect.stringMatching(/^2020-01-15/),
        saleType: 'slaughterhouse',
        pricingMode: 'individual',
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.saleItems).toBeDefined();
      expect(response.body.saleItems.length).toBe(2);

      // Verify animals status changed to sold
      const animals = await context.prisma.animal.findMany({
        where: {
          id: { in: testAnimals.map((a) => a.id) },
        },
      });
      animals.forEach((animal) => {
        expect(animal.status).toBe('sold');
      });
    });

    it('should create sale with fees', async () => {
      const dto = {
        ...createSaleDto,
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        fees: [
          { id: 'fee-001', name: 'Transportation', amount: 500.0 },
          { id: 'fee-002', name: 'Insurance', amount: 200.0 },
        ],
        transportationFee: 300.0,
        additionalFees: 150.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 10000.0,
            weight: 350.0,
          },
        ],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/sales')
        .send(dto)
        .expect(201);

      expect(response.body.fees).toBeDefined();
      expect(Array.isArray(response.body.fees)).toBe(true);
      expect(response.body.fees.length).toBe(2);
      expect(response.body.transportationFee).toBe(300.0);
      expect(response.body.additionalFees).toBe(150.0);
    });

    it('should fail without add permission', async () => {
      const dto = {
        ...createSaleDto,
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await authenticatedRequest(context.app, context.authToken!)
        .post('/sales')
        .send(dto)
        .expect(403);
    });

    it('should fail if animal is already sold', async () => {
      await context.prisma.animal.update({
        where: { id: testAnimals[0].id },
        data: { status: 'sold' },
      });

      const dto = {
        ...createSaleDto,
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/sales')
        .send(dto)
        .expect(400);
    });

    it('should fail if property not found', async () => {
      const dto = {
        ...createSaleDto,
        propertyId: 'non-existent-property',
        buyerId: context.testBuyer.id,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/sales')
        .send(dto)
        .expect(404);
    });

    it('should validate required fields', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/sales')
        .send({ propertyId: context.testProperty.id })
        .expect(400);
    });

    it('should validate at least one sale item', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/sales')
        .send({
          ...createSaleDto,
          propertyId: context.testProperty.id,
          buyerId: context.testBuyer.id,
          saleItems: [],
        })
        .expect(400);
    });
  });

  describe('GET /sales', () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await context.prisma.sale.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          buyerId: context.testBuyer.id,
          saleDate: new Date('2020-01-15'),
          saleType: 'slaughterhouse',
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      saleId = sale.id;

      await context.prisma.saleItem.create({
        data: {
          saleId: sale.id,
          animalId: testAnimals[0].id,
          price: 10000.0,
          weight: 350.0,
        },
      });

      const softDeletedSale = await context.prisma.sale.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          buyerId: context.testBuyer.id,
          saleDate: new Date('2020-02-20'),
          saleType: 'other_farm',
          pricingMode: 'total',
          paymentMethod: 'accounts_receivable',
          totalPrice: 15000.0,
          deletedAt: new Date(),
        },
      });

      await context.prisma.saleItem.create({
        data: {
          saleId: softDeletedSale.id,
          animalId: testAnimals[1].id,
          price: 15000.0,
          weight: 400.0,
        },
      });
    });

    it('should return all sales for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/sales')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('saleDate');
      expect(response.body[0]).toHaveProperty('saleItems');
    });

    it('should exclude soft-deleted sales', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/sales')
        .expect(200);

      const ids = response.body.map((s: any) => s.id);
      expect(ids).toContain(saleId);
      expect(response.body.length).toBe(1);
    });

    it('should fail without view permission', async () => {
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            records: {
              sales: {
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
        .get('/sales')
        .expect(403);
    });
  });

  describe('GET /sales/:id', () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await context.prisma.sale.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          buyerId: context.testBuyer.id,
          saleDate: new Date('2020-01-15'),
          saleType: 'slaughterhouse',
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      saleId = sale.id;

      await context.prisma.saleItem.create({
        data: {
          saleId: sale.id,
          animalId: testAnimals[0].id,
          price: 10000.0,
          weight: 350.0,
        },
      });
    });

    it('should return sale by ID', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/sales/${saleId}`)
        .expect(200);

      expect(response.body.id).toBe(saleId);
      expect(response.body.companyId).toBe(context.testCompany.id);
      expect(response.body.saleItems).toBeDefined();
    });

    it('should fail if sale not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/sales/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /sales/animal/:animalId', () => {
    it('should return sales for animal', async () => {
      const sale = await context.prisma.sale.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          buyerId: context.testBuyer.id,
          saleDate: new Date('2020-01-15'),
          saleType: 'slaughterhouse',
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });

      await context.prisma.saleItem.create({
        data: {
          saleId: sale.id,
          animalId: testAnimals[0].id,
          price: 10000.0,
          weight: 350.0,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/sales/animal/${testAnimals[0].id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.some((s: any) =>
          s.saleItems.some((item: any) => item.animalId === testAnimals[0].id),
        ),
      ).toBe(true);
    });
  });

  describe('PUT /sales/:id', () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await context.prisma.sale.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          buyerId: context.testBuyer.id,
          saleDate: new Date('2020-01-15'),
          saleType: 'slaughterhouse',
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      saleId = sale.id;

      await context.prisma.saleItem.create({
        data: {
          saleId: sale.id,
          animalId: testAnimals[0].id,
          price: 10000.0,
          weight: 350.0,
        },
      });

      await context.prisma.animal.update({
        where: { id: testAnimals[0].id },
        data: { status: 'sold' },
      });
    });

    it('should update sale successfully', async () => {
      const updateDto = {
        totalPrice: 12000.0,
        observation: 'Updated sale',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/sales/${saleId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.totalPrice).toBe(12000.0);
      expect(response.body.observation).toBe('Updated sale');
    });

    it('should fail without edit permission', async () => {
      const updateDto = {
        totalPrice: 12000.0,
      };

      await authenticatedRequest(context.app, context.authToken!)
        .put(`/sales/${saleId}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('DELETE /sales/:id', () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await context.prisma.sale.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          buyerId: context.testBuyer.id,
          saleDate: new Date('2020-01-15'),
          saleType: 'slaughterhouse',
          pricingMode: 'individual',
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      saleId = sale.id;

      await context.prisma.saleItem.create({
        data: {
          saleId: sale.id,
          animalId: testAnimals[0].id,
          price: 10000.0,
          weight: 350.0,
        },
      });

      await context.prisma.animal.update({
        where: { id: testAnimals[0].id },
        data: { status: 'sold' },
      });
    });

    it('should soft delete sale and restore animal status', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/sales/${saleId}`)
        .expect(200);

      const sale = await context.prisma.sale.findUnique({
        where: { id: saleId },
      });
      expect(sale?.deletedAt).toBeDefined();

      const animal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(animal?.status).toBe('active');
    });

    it('should fail without remove permission', async () => {
      await authenticatedRequest(context.app, context.authToken!)
        .delete(`/sales/${saleId}`)
        .expect(403);
    });
  });
});
