import {
  setupE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Locations Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Locations Test Company',
      email: 'locations@testcompany.com',
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
            location: { view: true, add: false, edit: false, remove: false },
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
    await cleanupTestData(prisma);
    await app.close();
  });

  describe('POST /locations', () => {
    const createLocationDto = {
      code: '001',
      name: 'Pasto Norte',
      locationType: 'pasture',
      area: { value: 28.5, type: 'hectares' },
      status: 'active',
      propertyId: '', // Will be set in each test
    };

    it('should create a location successfully (main user)', async () => {
      const dto = { ...createLocationDto, propertyId: testProperty.id };
      const response = authenticatedRequest(context.app, context.mainUserToken)
        .post('/locations')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        locationType: dto.locationType,
        status: dto.status,
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create a location with different location types', async () => {
      const locationTypes = ['barn', 'storage', 'corral', 'silo'];

      for (const locationType of locationTypes) {
        const dto = {
          ...createLocationDto,
          code: `00${locationTypes.indexOf(locationType) + 2}`,
          locationType,
          propertyId: context.testProperty.id,
        };

        const response = await request(app.getHttpServer())
          .post('/locations')
          .set('Authorization', `Bearer ${mainUserToken}`)
          .send(dto)
          .expect(201);

        expect(response.body.locationType).toBe(locationType);
      }
    });

    it('should fail without add permission', async () => {
      const dto = { ...createLocationDto, propertyId: testProperty.id };
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same property', async () => {
      const dto = { ...createLocationDto, propertyId: testProperty.id };

      // Create first location
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should allow same code for different properties', async () => {
      // Create another property
      const otherProperty = await prisma.property.create({
        data: {
          code: '002',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const dto1 = { ...createLocationDto, propertyId: testProperty.id };
      const dto2 = { ...createLocationDto, propertyId: otherProperty.id };

      // Create location in first property
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto1)
        .expect(201);

      // Create location with same code in second property (should succeed)
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should fail if property does not exist', async () => {
      const dto = {
        ...createLocationDto,
        propertyId: 'non-existent-property-id',
      };
      await request(app.getHttpServer())
        .post('/locations')
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

      const dto = { ...createLocationDto, propertyId: otherProperty.id };
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate location type enum', async () => {
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createLocationDto,
          code: '004',
          propertyId: context.testProperty.id,
          locationType: 'invalid_type',
        })
        .expect(400);
    });

    it('should validate area type enum', async () => {
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createLocationDto,
          code: '005',
          propertyId: context.testProperty.id,
          area: { value: 100, type: 'invalid_type' },
        })
        .expect(400);
    });

    it('should transform area.value from string to number', async () => {
      // This test verifies that @Type(() => Number) decorator works correctly
      // When JSON is parsed, numbers can come as strings, and they should be transformed
      const dto = {
        ...createLocationDto,
        code: '006',
        propertyId: context.testProperty.id,
        area: { value: '42.5' as any, type: 'hectares' }, // Send as string
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .post('/locations')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        locationType: dto.locationType,
        status: dto.status,
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      // Verify the area was stored correctly (value should be a number)
      expect(response.body.area).toBeDefined();
      expect(typeof response.body.area.value).toBe('number');
      expect(response.body.area.value).toBe(42.5);
    });

    it('should reject invalid area.value (non-numeric string)', async () => {
      const dto = {
        ...createLocationDto,
        code: '007',
        propertyId: context.testProperty.id,
        area: { value: 'not-a-number' as any, type: 'hectares' },
      };

      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('GET /locations', () => {
    beforeEach(async () => {
      // Create test locations
      await context.prisma.location.createMany({
        data: [
          {
            code: '001',
            name: 'Location 1',
            locationType: 'pasture',
            area: { value: 28.5, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
          },
          {
            code: '002',
            name: 'Location 2',
            locationType: 'barn',
            area: { value: 15.0, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
          },
          {
            code: '003',
            name: 'Deleted Location',
            locationType: 'storage',
            area: { value: 10.0, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
            deletedAt: new Date(), // Soft deleted
          },
        ],
      });
    });

    it('should return all locations for company', async () => {
      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get('/locations')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('locationType');
    });

    it('should exclude soft-deleted locations', async () => {
      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get('/locations')
        .expect(200);

      const codes = response.body.map((l: any) => l.code);
      expect(codes).not.toContain('003');
    });

    it('should filter by propertyId when provided', async () => {
      // Create another property with locations
      const otherProperty = await prisma.property.create({
        data: {
          code: '002',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      await context.prisma.location.create({
        data: {
          code: '004',
          name: 'Other Property Location',
          locationType: 'pasture',
          area: { value: 30.0, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: otherProperty.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/locations?propertyId=${testProperty.id}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body.length).toBe(2);
      response.body.forEach((location: any) => {
        expect(location.propertyId).toBe(testProperty.id);
      });
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              location: { view: false, add: false, edit: false, remove: false },
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
        .get('/locations')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /locations/:id', () => {
    let locationId: string;

    beforeEach(async () => {
      const location = await prisma.location.create({
        data: {
          code: '001',
          name: 'Test Location',
          locationType: 'pasture',
          area: { value: 28.5, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      locationId = location.id;
    });

    it('should return a location by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: locationId,
        code: '001',
        name: 'Test Location',
        locationType: 'pasture',
      });
    });

    it('should return 404 for non-existent location', async () => {
      await request(app.getHttpServer())
        .get('/locations/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted location', async () => {
      // Soft delete the location
      await context.prisma.location.update({
        where: { id: locationId },
        data: { deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .get(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /locations/:id', () => {
    let locationId: string;

    beforeEach(async () => {
      const location = await prisma.location.create({
        data: {
          code: '001',
          name: 'Test Location',
          locationType: 'pasture',
          area: { value: 28.5, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      locationId = location.id;
    });

    it('should update a location', async () => {
      const updateDto = {
        name: 'Updated Location Name',
        status: 'inactive',
      };

      const response = await request(app.getHttpServer())
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: locationId,
        name: 'Updated Location Name',
        status: 'inactive',
      });
    });

    it('should update location type', async () => {
      const updateDto = {
        locationType: 'barn',
      };

      const response = await request(app.getHttpServer())
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.locationType).toBe('barn');
    });

    it('should fail without edit permission', async () => {
      await request(app.getHttpServer())
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should fail with duplicate code in same property', async () => {
      // Create another location
      await context.prisma.location.create({
        data: {
          code: '002',
          name: 'Other Location',
          locationType: 'barn',
          area: { value: 15.0, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      // Try to update with duplicate code
      await request(app.getHttpServer())
        .put(`/locations/${locationId}`)
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
          companyId: context.testCompany.id,
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
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.propertyId).toBe(otherProperty.id);
    });

    it('should transform area.value from string to number when updating', async () => {
      // This test verifies that @Type(() => Number) decorator works correctly for updates
      const updateDto = {
        area: { value: '50.75' as any, type: 'hectares' }, // Send as string
      };

      const response = await request(app.getHttpServer())
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.area).toBeDefined();
      expect(typeof response.body.area.value).toBe('number');
      expect(response.body.area.value).toBe(50.75);
    });

    it('should update location with all fields including area transformation', async () => {
      // Comprehensive test for editing location with all fields
      const updateDto = {
        name: 'Updated Location Name',
        code: 'UPD-001',
        locationType: 'barn',
        status: 'inactive',
        area: { value: '75.25' as any, type: 'square_meters' }, // Send as string
      };

      const response = await request(app.getHttpServer())
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: locationId,
        name: 'Updated Location Name',
        code: 'UPD-001',
        locationType: 'barn',
        status: 'inactive',
      });
      expect(response.body.area).toBeDefined();
      expect(typeof response.body.area.value).toBe('number');
      expect(response.body.area.value).toBe(75.25);
      expect(response.body.area.type).toBe('square_meters');
    });

    it('should reject invalid area.value when updating', async () => {
      const updateDto = {
        area: { value: 'invalid-number' as any, type: 'hectares' },
      };

      await request(app.getHttpServer())
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(400);
    });
  });

  describe('DELETE /locations/:id', () => {
    let locationId: string;

    beforeEach(async () => {
      const location = await prisma.location.create({
        data: {
          code: '001',
          name: 'Test Location',
          locationType: 'pasture',
          area: { value: 28.5, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      locationId = location.id;
    });

    it('should soft delete a location', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Location deleted successfully',
      });

      // Verify soft delete
      const deletedLocation = await prisma.location.findUnique({
        where: { id: locationId },
      });
      expect(deletedLocation?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(app.getHttpServer())
        .get('/locations')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((l: any) => l.id === locationId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(app.getHttpServer())
        .delete(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent location', async () => {
      await request(app.getHttpServer())
        .delete('/locations/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let locationId: string;

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

      await context.prisma.user.update({
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

      // Create location for first company
      const location = await prisma.location.create({
        data: {
          code: '001',
          name: 'First Company Location',
          locationType: 'pasture',
          area: { value: 28.5, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      locationId = location.id;
    });

    it('should not allow access to other company locations', async () => {
      await request(app.getHttpServer())
        .get(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company locations', async () => {
      await request(app.getHttpServer())
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow delete of other company locations', async () => {
      await request(app.getHttpServer())
        .delete(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
