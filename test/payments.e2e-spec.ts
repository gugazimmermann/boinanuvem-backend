import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestPayment } from './test-utils';
import request from 'supertest';

describe('Payments Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let subscription: any;
  let regularUserToken: string;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Payments Test Company',
      email: 'payments@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createRegularUser: true,
    });
    subscription = context.subscription;

    // Login regular user
    const regularLoginResponse = await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: context.regularUser.email,
        password: 'password123',
      })
      .expect(200);

    regularUserToken = regularLoginResponse.body.access_token;
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('GET /payments/company/:companyId', () => {
    beforeEach(async () => {
      // Create test payments
      await createTestPayment(
        context.prisma,
        context.testCompany.id,
        subscription.id,
        {
          amount: 99.0,
          status: 'pending',
        },
      );
      await createTestPayment(prisma, testCompany.id, subscription.id, {
        amount: 149.9,
        status: 'paid',
      });
    });

    it('should return company payments for main user', async () => {
      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get(`/payments/company/${context.testCompany.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should return company payments for non-main user', async () => {
      // Non-main users can view company payments
      const response = authenticatedRequest(context.app, regularUserToken)
        .get(`/payments/company/${context.testCompany.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should fail for different company', async () => {
      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

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

      await authenticatedRequest(context.app, otherToken)
        .get(`/payments/company/${context.testCompany.id}`)
        .expect(403);
    });
  });

  describe('GET /payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await createTestPayment(
        context.prisma,
        context.testCompany.id,
        subscription.id,
        {
          amount: 99.0,
          status: 'pending',
        },
      );
      paymentId = payment.id;
    });

    it('should return payment details for authorized user', async () => {
      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get(`/payments/${paymentId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: paymentId,
        companyId: context.testCompany.id,
        status: 'pending',
      });
      // Amount is returned as string (Decimal type)
      expect(response.body.amount).toBe('99');
    });

    it('should return 403 for different company payment', async () => {
      // Create another company with payment
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      await context.prisma.user.update({
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

      await authenticatedRequest(context.app, otherToken)
        .get(`/payments/${paymentId}`)
        .expect(403);
    });

    it('should return 404 for non-existent payment', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/payments/non-existent-id')
        .expect(404);
    });
  });

  describe('POST /payments', () => {
    const createPaymentDto = {
      companyId: '', // Will be set in each test
      subscriptionId: '', // Will be set in each test
      amount: 99.0,
      currency: 'BRL',
      paymentMethod: 'credit_card',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Monthly subscription payment',
    };

    it('should create a payment successfully (main user)', async () => {
      const dto = {
        ...createPaymentDto,
        companyId: context.testCompany.id,
        subscriptionId: subscription.id,
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .post('/payments')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        companyId: context.testCompany.id,
        currency: dto.currency,
        status: 'pending',
      });
      // Amount is returned as string (Decimal type)
      expect(response.body.amount).toBe('99');
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should fail for non-main user', async () => {
      const dto = {
        ...createPaymentDto,
        companyId: context.testCompany.id,
        subscriptionId: subscription.id,
      };

      await authenticatedRequest(context.app, regularUserToken)
        .post('/payments')
        .send(dto)
        .expect(403);
    });

    it('should validate required fields', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/payments')
        .send({ amount: 99.0 }) // Missing required fields
        .expect(400);
    });

    it('should validate amount is positive', async () => {
      const dto = {
        ...createPaymentDto,
        companyId: context.testCompany.id,
        subscriptionId: subscription.id,
        amount: -10,
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/payments')
        .send(dto)
        .expect(400);
    });
  });

  describe('PUT /payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await createTestPayment(
        context.prisma,
        context.testCompany.id,
        subscription.id,
        {
          amount: 99.0,
          status: 'pending',
        },
      );
      paymentId = payment.id;
    });

    it('should update payment status (main user)', async () => {
      const updateDto = {
        status: 'paid',
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .put(`/payments/${paymentId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: paymentId,
        status: 'paid',
      });
    });

    it('should fail for non-main user', async () => {
      const updateDto = {
        status: 'paid',
      };

      await authenticatedRequest(context.app, regularUserToken)
        .put(`/payments/${paymentId}`)
        .send(updateDto)
        .expect(403);
    });

    it('should return 404 for non-existent payment', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .put('/payments/non-existent-id')
        .send({ status: 'paid' })
        .expect(404);
    });

    it('should return 403 for different company payment', async () => {
      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      await context.prisma.user.update({
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

      await authenticatedRequest(context.app, otherToken)
        .put(`/payments/${paymentId}`)
        .send({ status: 'paid' })
        .expect(403);
    });
  });
});
