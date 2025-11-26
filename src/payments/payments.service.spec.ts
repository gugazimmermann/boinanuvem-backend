import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  PaymentsService,
  CreatePaymentDto,
  UpdatePaymentDto,
} from './payments.service';
import { PrismaService } from '../common/services/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: MockPrismaService;

  interface MockPrismaService {
    user: {
      findUnique: jest.Mock;
    };
    companySubscription: {
      findUnique: jest.Mock;
    };
    companyPayment: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
  }

  const mockPrismaService: MockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    companySubscription: {
      findUnique: jest.fn(),
    },
    companyPayment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompanyPayments', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
    };

    const mockPayments = [
      {
        id: 'payment-1',
        companyId: 'company-1',
        amount: new Decimal(99.99),
        status: 'paid',
        subscription: {
          id: 'sub-1',
          plan: { id: 'plan-1', name: 'Avançado' },
        },
      },
      {
        id: 'payment-2',
        companyId: 'company-1',
        amount: new Decimal(149.9),
        status: 'pending',
        subscription: null,
      },
    ];

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.getCompanyPayments('company-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return company payments with default limit', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companyPayment.findMany.mockResolvedValue(mockPayments);

      const result = await service.getCompanyPayments('company-1', 'user-1');

      expect(result).toEqual(mockPayments);
      expect(prismaService.companyPayment.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should return company payments with custom limit', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companyPayment.findMany.mockResolvedValue(mockPayments);

      await service.getCompanyPayments('company-1', 'user-1', 10);

      expect(prismaService.companyPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getPayment', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
    };

    const mockPayment = {
      id: 'payment-1',
      companyId: 'company-1',
      amount: new Decimal(99.99),
      status: 'paid',
      company: { id: 'company-1' },
      subscription: {
        id: 'sub-1',
        plan: { id: 'plan-1', name: 'Avançado' },
      },
    };

    it('should throw NotFoundException if payment not found', async () => {
      prismaService.companyPayment.findUnique.mockResolvedValue(null);

      await expect(service.getPayment('payment-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.companyPayment.findUnique.mockResolvedValue(mockPayment);
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(service.getPayment('payment-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return payment with full details', async () => {
      prismaService.companyPayment.findUnique.mockResolvedValue(mockPayment);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getPayment('payment-1', 'user-1');

      expect(result).toEqual(mockPayment);
      expect(prismaService.companyPayment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        include: {
          company: true,
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });
    });
  });

  describe('createPayment', () => {
    const createDto: CreatePaymentDto = {
      companyId: 'company-1',
      subscriptionId: 'sub-1',
      amount: 99.99,
      currency: 'BRL',
      paymentMethod: 'credit_card',
      dueDate: new Date('2025-02-01'),
      description: 'Monthly subscription',
    };

    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
    };

    const mockCreatedPayment = {
      id: 'payment-1',
      ...createDto,
      amount: new Decimal(createDto.amount),
      status: 'pending',
      subscription: {
        id: 'sub-1',
        plan: { id: 'plan-1', name: 'Avançado' },
      },
    };

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(service.createPayment(createDto, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user is not main user', async () => {
      const nonMainUser = { ...mockUser, mainUser: false };
      prismaService.user.findUnique.mockResolvedValue(nonMainUser);

      await expect(service.createPayment(createDto, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if subscription does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(null);

      await expect(service.createPayment(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if subscription does not belong to company', async () => {
      const otherSubscription = {
        ...mockSubscription,
        companyId: 'other-company',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(
        otherSubscription,
      );

      await expect(service.createPayment(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should successfully create payment', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.companyPayment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.createPayment(createDto, 'user-1');

      expect(result).toEqual(mockCreatedPayment);
      expect(prismaService.companyPayment.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          subscriptionId: 'sub-1',
          amount: new Decimal(99.99),
          currency: 'BRL',
          paymentMethod: 'credit_card',
          dueDate: createDto.dueDate,
          description: 'Monthly subscription',
          externalId: null,
          status: 'pending',
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });
    });

    it('should create payment without subscription', async () => {
      const dtoWithoutSub = { ...createDto };
      delete (dtoWithoutSub as any).subscriptionId;
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companyPayment.create.mockResolvedValue(mockCreatedPayment);

      await service.createPayment(dtoWithoutSub, 'user-1');

      expect(
        prismaService.companySubscription.findUnique,
      ).not.toHaveBeenCalled();
    });

    it('should use default currency if not provided', async () => {
      const dtoWithoutCurrency = { ...createDto };
      delete (dtoWithoutCurrency as any).currency;
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.companyPayment.create.mockResolvedValue(mockCreatedPayment);

      await service.createPayment(dtoWithoutCurrency, 'user-1');

      expect(prismaService.companyPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'BRL',
          }),
        }),
      );
    });
  });

  describe('updatePayment', () => {
    const updateDto: UpdatePaymentDto = {
      status: 'paid',
      paymentDate: new Date('2025-01-15'),
      paymentMethod: 'pix',
    };

    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockPayment = {
      id: 'payment-1',
      companyId: 'company-1',
      status: 'pending',
    };

    const mockUpdatedPayment = {
      ...mockPayment,
      ...updateDto,
      subscription: {
        id: 'sub-1',
        plan: { id: 'plan-1', name: 'Avançado' },
      },
    };

    it('should throw NotFoundException if payment not found', async () => {
      prismaService.companyPayment.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePayment('payment-1', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.companyPayment.findUnique.mockResolvedValue(mockPayment);
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.updatePayment('payment-1', updateDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not main user', async () => {
      const nonMainUser = { ...mockUser, mainUser: false };
      prismaService.companyPayment.findUnique.mockResolvedValue(mockPayment);
      prismaService.user.findUnique.mockResolvedValue(nonMainUser);

      await expect(
        service.updatePayment('payment-1', updateDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully update payment', async () => {
      prismaService.companyPayment.findUnique.mockResolvedValue(mockPayment);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companyPayment.update.mockResolvedValue(mockUpdatedPayment);

      const result = await service.updatePayment(
        'payment-1',
        updateDto,
        'user-1',
      );

      expect(result).toEqual(mockUpdatedPayment);
      expect(prismaService.companyPayment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: updateDto,
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });
    });
  });

  describe('markPaymentAsPaid', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockPayment = {
      id: 'payment-1',
      companyId: 'company-1',
      status: 'pending',
    };

    beforeEach(() => {
      prismaService.companyPayment.findUnique.mockResolvedValue(mockPayment);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companyPayment.update.mockResolvedValue({
        ...mockPayment,
        status: 'paid',
      });
    });

    it('should mark payment as paid with current date', async () => {
      const beforeCall = new Date();
      await service.markPaymentAsPaid('payment-1', 'user-1');
      const afterCall = new Date();

      const updateCall = (prismaService.companyPayment.update as any).mock
        .calls[0][0];
      expect(updateCall.data.status).toBe('paid');
      expect(updateCall.data.paymentDate.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
      expect(updateCall.data.paymentDate.getTime()).toBeLessThanOrEqual(
        afterCall.getTime(),
      );
    });

    it('should mark payment as paid with provided date', async () => {
      const paymentDate = new Date('2025-01-15');
      await service.markPaymentAsPaid('payment-1', 'user-1', paymentDate);

      const updateCall = (prismaService.companyPayment.update as any).mock
        .calls[0][0];
      expect(updateCall.data.paymentDate).toEqual(paymentDate);
    });
  });

  describe('cancelPayment', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    it('should throw BadRequestException if payment is already paid', async () => {
      const paidPayment = {
        id: 'payment-1',
        companyId: 'company-1',
        status: 'paid',
        company: { id: 'company-1' },
        subscription: null,
      };

      prismaService.companyPayment.findUnique.mockResolvedValue(paidPayment);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.cancelPayment('payment-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully cancel pending payment', async () => {
      const pendingPayment = {
        id: 'payment-1',
        companyId: 'company-1',
        status: 'pending',
        company: { id: 'company-1' },
        subscription: null,
      };

      const cancelledPayment = {
        ...pendingPayment,
        status: 'cancelled',
      };

      prismaService.companyPayment.findUnique.mockResolvedValue(pendingPayment);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companyPayment.update.mockResolvedValue(cancelledPayment);

      const result = await service.cancelPayment('payment-1', 'user-1');

      expect(result).toEqual(cancelledPayment);
    });
  });

  describe('getPaymentStatistics', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
    };

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.getPaymentStatistics('company-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return payment statistics', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock all the count and aggregate calls
      (prismaService.companyPayment.count as any)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6) // paid
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(1); // failed

      (prismaService.companyPayment.aggregate as any)
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(1000) } }) // total amount
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(600) } }); // paid amount

      const result = await service.getPaymentStatistics('company-1', 'user-1');

      expect(result).toEqual({
        totalPayments: 10,
        paidPayments: 6,
        pendingPayments: 3,
        failedPayments: 1,
        cancelledPayments: 0, // 10 - 6 - 3 - 1
        totalAmount: 1000,
        paidAmount: 600,
        pendingAmount: 400, // 1000 - 600
      });
    });

    it('should handle null amounts gracefully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      (prismaService.companyPayment.count as any)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      (prismaService.companyPayment.aggregate as any)
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await service.getPaymentStatistics('company-1', 'user-1');

      expect(result.totalAmount).toBe(0);
      expect(result.paidAmount).toBe(0);
      expect(result.pendingAmount).toBe(0);
    });
  });

  describe('getOverduePayments', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
    };

    const mockOverduePayments = [
      {
        id: 'payment-1',
        companyId: 'company-1',
        status: 'pending',
        dueDate: new Date('2025-01-01'),
        subscription: {
          id: 'sub-1',
          plan: { id: 'plan-1', name: 'Avançado' },
        },
      },
    ];

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.getOverduePayments('company-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return overdue payments', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companyPayment.findMany.mockResolvedValue(
        mockOverduePayments,
      );

      const result = await service.getOverduePayments('company-1', 'user-1');

      expect(result).toEqual(mockOverduePayments);
      expect(prismaService.companyPayment.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          status: 'pending',
          dueDate: {
            lt: expect.any(Date),
          },
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      });
    });
  });
});
