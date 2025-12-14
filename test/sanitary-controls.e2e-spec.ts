import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import {
  createTestAnimal,
  createTestInventoryItem,
} from './test-data-factories';

describe('Sanitary Controls Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAnimal: any;
  let testInventoryItem: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Sanitary Controls Test Company',
      email: 'sanitary@testcompany.com',
      cnpj: '11.222.333/0001-15',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });

    testAnimal = await createTestAnimal(context.prisma, {
      code: '001',
      registrationNumber: 'BR-2025-SC0001',
      status: 'active',
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });

    testInventoryItem = await createTestInventoryItem(context.prisma, {
      code: 'MED001',
      name: 'Test Medicine',
      category: 'medicines',
      unit: 'ml',
      minimumStock: 10,
      hasExpiration: false,
      companyId: context.testCompany.id,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /sanitary-controls', () => {
    it('should create a sanitary control record with appliedMedicines array', async () => {
      const createDto = {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
            calculatedDosage: 5.5,
          },
        ],
        observation: 'Test control',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/sanitary-controls')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        animalId: testAnimal.id,
      });
      expect(response.body.id).toBeDefined();
      expect(Array.isArray(response.body.appliedMedicines)).toBe(true);
      expect(response.body.appliedMedicines.length).toBe(1);
      expect(response.body.appliedMedicines[0]).toMatchObject({
        itemId: testInventoryItem.id,
        quantity: 10,
        calculatedDosage: 5.5,
      });
    });

    it('should create a sanitary control record with legacy format (backward compatibility)', async () => {
      const createDto = {
        animalId: testAnimal.id,
        date: '2025-01-16',
        itemId: testInventoryItem.id,
        quantity: 10,
        calculatedDosage: 5.5,
        observation: 'Test control legacy',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/sanitary-controls')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        animalId: testAnimal.id,
      });
      expect(response.body.id).toBeDefined();
      expect(Array.isArray(response.body.appliedMedicines)).toBe(true);
      expect(response.body.appliedMedicines.length).toBe(1);
    });

    it('should create with multiple medicines', async () => {
      const secondItem = await createTestInventoryItem(context.prisma, {
        code: 'MED002',
        name: 'Test Medicine 2',
        category: 'medicines',
        unit: 'ml',
        minimumStock: 10,
        hasExpiration: false,
        companyId: context.testCompany.id,
      });

      const createDto = {
        animalId: testAnimal.id,
        date: '2025-01-17',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
            calculatedDosage: 5.5,
          },
          {
            itemId: secondItem.id,
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/sanitary-controls')
        .send(createDto)
        .expect(201);

      expect(response.body.appliedMedicines.length).toBe(2);
      expect(response.body.appliedMedicines[0].itemId).toBe(
        testInventoryItem.id,
      );
      expect(response.body.appliedMedicines[1].itemId).toBe(secondItem.id);
    });

    it('should create with employees and service providers', async () => {
      const createDto = {
        animalId: testAnimal.id,
        date: '2025-01-18',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
        employeeIds: [context.testEmployees[0].id],
        serviceProviderIds: [context.testServiceProviders[0].id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/sanitary-controls')
        .send(createDto)
        .expect(201);

      expect(response.body.employeeIds).toContain(context.testEmployees[0].id);
      expect(response.body.serviceProviderIds).toContain(
        context.testServiceProviders[0].id,
      );
    });

    it('should return 404 if animal not found', async () => {
      const createDto = {
        animalId: 'non-existent-id',
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/sanitary-controls')
        .send(createDto)
        .expect(404);
    });
  });

  describe('GET /sanitary-controls', () => {
    it('should return all sanitary control records for company', async () => {
      const control = await context.prisma.sanitaryControl.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          itemId: testInventoryItem.id,
          companyId: context.testCompany.id,
        },
      });

      // Create junction table record
      await context.prisma.sanitaryControlItem.create({
        data: {
          sanitaryControlId: control.id,
          itemId: testInventoryItem.id,
          quantity: 10,
          calculatedDosage: 5.5,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/sanitary-controls')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(response.body[0].appliedMedicines)).toBe(true);
    });
  });

  describe('GET /sanitary-controls/:id', () => {
    it('should return sanitary control record by ID', async () => {
      const control = await context.prisma.sanitaryControl.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          itemId: testInventoryItem.id,
          companyId: context.testCompany.id,
        },
      });

      // Create junction table record
      await context.prisma.sanitaryControlItem.create({
        data: {
          sanitaryControlId: control.id,
          itemId: testInventoryItem.id,
          quantity: 10,
          calculatedDosage: 5.5,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/sanitary-controls/${control.id}`)
        .expect(200);

      expect(response.body.id).toBe(control.id);
      expect(Array.isArray(response.body.appliedMedicines)).toBe(true);
    });
  });

  describe('GET /sanitary-controls/animal/:animalId', () => {
    it('should return sanitary control records for animal', async () => {
      const control = await context.prisma.sanitaryControl.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          itemId: testInventoryItem.id,
          companyId: context.testCompany.id,
        },
      });

      // Create junction table record
      await context.prisma.sanitaryControlItem.create({
        data: {
          sanitaryControlId: control.id,
          itemId: testInventoryItem.id,
          quantity: 10,
          calculatedDosage: 5.5,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/sanitary-controls/animal/${testAnimal.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every((sc: any) => sc.animalId === testAnimal.id),
      ).toBe(true);
      expect(
        response.body.every((sc: any) => Array.isArray(sc.appliedMedicines)),
      ).toBe(true);
    });
  });

  describe('PUT /sanitary-controls/:id', () => {
    it('should update sanitary control record successfully', async () => {
      const control = await context.prisma.sanitaryControl.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          itemId: testInventoryItem.id,
          observation: 'Original observation',
          companyId: context.testCompany.id,
        },
      });

      // Create junction table entry
      await context.prisma.sanitaryControlItem.create({
        data: {
          sanitaryControlId: control.id,
          itemId: testInventoryItem.id,
          quantity: 10,
          calculatedDosage: 5.0,
        },
      });

      const updateDto = {
        observation: 'Updated observation',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/sanitary-controls/${control.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.observation).toBe('Updated observation');
      expect(response.body.appliedMedicines[0].quantity).toBe(20);
    });
  });

  describe('DELETE /sanitary-controls/:id', () => {
    it('should soft delete sanitary control record successfully', async () => {
      const control = await context.prisma.sanitaryControl.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          itemId: testInventoryItem.id,
          companyId: context.testCompany.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/sanitary-controls/${control.id}`)
        .expect(200);

      const deletedControl = await context.prisma.sanitaryControl.findUnique({
        where: { id: control.id },
      });
      expect(deletedControl?.deletedAt).toBeDefined();
    });
  });
});
