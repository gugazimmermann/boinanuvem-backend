import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreatePaymentDto, UpdatePaymentDto, PaymentStatus } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'main@test.com',
    companyId: 'company-1',
    mainUser: true,
  };

  const mockTeamMember: CurrentUser = {
    id: 'user-2',
    email: 'team@test.com',
    companyId: 'company-1',
    mainUser: false,
  };

  const mockCreatePaymentDto: CreatePaymentDto = {
    companyId: 'company-1',
    subscriptionId: 'sub-1',
    amount: 99.99,
    currency: 'BRL',
    paymentMethod: 'credit_card',
    dueDate: new Date('2025-12-31T00:00:00.000Z'),
    description: 'Monthly subscription payment',
    externalId: 'ext_123456',
  };

  const mockUpdatePaymentDto: UpdatePaymentDto = {
    status: PaymentStatus.PAID,
    paymentDate: new Date('2025-01-15T00:00:00.000Z'),
    paymentMethod: 'pix',
  };

  const mockPayment = {
    id: 'payment-1',
    companyId: 'company-1',
    subscriptionId: 'sub-1',
    amount: new Decimal(99.99),
    currency: 'BRL',
    status: 'pending',
    paymentMethod: 'credit_card',
    dueDate: new Date('2025-12-31T00:00:00.000Z'),
    description: 'Monthly subscription payment',
    externalId: 'ext_123456',
    createdAt: new Date(),
    updatedAt: new Date(),
    subscription: {
      id: 'sub-1',
      plan: { id: 'plan-1', name: 'Avançado' },
    },
  };

  const mockPayments = [mockPayment];

  beforeEach(async () => {
    const mockPaymentsService = {
      getCompanyPayments: jest.fn(),
      getPayment: jest.fn(),
      createPayment: jest.fn(),
      updatePayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCompanyPayments', () => {
    it('should return company payments', async () => {
      paymentsService.getCompanyPayments.mockResolvedValue(mockPayments);

      const result = await controller.getCompanyPayments(
        'company-1',
        mockCurrentUser,
      );

      expect(result).toEqual(mockPayments);
      expect(paymentsService.getCompanyPayments).toHaveBeenCalledWith(
        'company-1',
        'user-1',
      );
    });

    it('should throw ForbiddenException when user does not belong to company', async () => {
      paymentsService.getCompanyPayments.mockRejectedValue(
        new ForbiddenException('Access denied to this company'),
      );

      await expect(
        controller.getCompanyPayments('other-company', mockCurrentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPayment', () => {
    it('should return payment details', async () => {
      paymentsService.getPayment.mockResolvedValue(mockPayment);

      const result = await controller.getPayment('payment-1', mockCurrentUser);

      expect(result).toEqual(mockPayment);
      expect(paymentsService.getPayment).toHaveBeenCalledWith(
        'payment-1',
        'user-1',
      );
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentsService.getPayment.mockRejectedValue(
        new NotFoundException('Payment not found'),
      );

      await expect(
        controller.getPayment('nonexistent-payment', mockCurrentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not belong to payment company', async () => {
      paymentsService.getPayment.mockRejectedValue(
        new ForbiddenException('Access denied to this payment'),
      );

      await expect(
        controller.getPayment('payment-1', mockCurrentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createPayment', () => {
    it('should create payment successfully for main user', async () => {
      const createdPayment = { ...mockPayment, id: 'payment-new' };
      paymentsService.createPayment.mockResolvedValue(createdPayment);

      const result = await controller.createPayment(
        mockCreatePaymentDto,
        mockCurrentUser,
      );

      expect(result).toEqual(createdPayment);
      expect(paymentsService.createPayment).toHaveBeenCalledWith(
        mockCreatePaymentDto,
        'user-1',
      );
    });

    it('should throw ForbiddenException when user is not main user', async () => {
      paymentsService.createPayment.mockRejectedValue(
        new ForbiddenException('Only main users can manage payments'),
      );

      await expect(
        controller.createPayment(mockCreatePaymentDto, mockTeamMember),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user does not belong to company', async () => {
      paymentsService.createPayment.mockRejectedValue(
        new ForbiddenException('Access denied to this company'),
      );

      await expect(
        controller.createPayment(mockCreatePaymentDto, mockCurrentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updatePayment', () => {
    it('should update payment successfully for main user', async () => {
      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
        paymentDate: new Date('2025-01-15T00:00:00.000Z'),
        paymentMethod: 'pix',
      };
      paymentsService.updatePayment.mockResolvedValue(updatedPayment);

      const result = await controller.updatePayment(
        'payment-1',
        mockUpdatePaymentDto,
        mockCurrentUser,
      );

      expect(result).toEqual(updatedPayment);
      expect(paymentsService.updatePayment).toHaveBeenCalledWith(
        'payment-1',
        mockUpdatePaymentDto,
        'user-1',
      );
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentsService.updatePayment.mockRejectedValue(
        new NotFoundException('Payment not found'),
      );

      await expect(
        controller.updatePayment(
          'nonexistent-payment',
          mockUpdatePaymentDto,
          mockCurrentUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not main user', async () => {
      paymentsService.updatePayment.mockRejectedValue(
        new ForbiddenException('Only main users can manage payments'),
      );

      await expect(
        controller.updatePayment(
          'payment-1',
          mockUpdatePaymentDto,
          mockTeamMember,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user does not belong to payment company', async () => {
      paymentsService.updatePayment.mockRejectedValue(
        new ForbiddenException('Access denied to this payment'),
      );

      await expect(
        controller.updatePayment(
          'payment-1',
          mockUpdatePaymentDto,
          mockCurrentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
