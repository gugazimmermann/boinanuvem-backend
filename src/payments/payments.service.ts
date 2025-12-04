import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreatePaymentDto, UpdatePaymentDto, PaymentStatus } from './dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all payments for a company
   */
  async getCompanyPayments(companyId: string, userId: string, limit = 50) {
    // Verify user belongs to the company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    return this.prisma.companyPayment.findMany({
      where: { companyId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get a specific payment
   */
  async getPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.companyPayment.findUnique({
      where: { id: paymentId },
      include: {
        company: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify user belongs to the company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== payment.companyId) {
      throw new ForbiddenException('Access denied to this payment');
    }

    return payment;
  }

  /**
   * Create a new payment
   */
  async createPayment(dto: CreatePaymentDto, userId: string) {
    // Verify user belongs to the company and is main user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== dto.companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    if (!user.mainUser) {
      throw new ForbiddenException('Only main users can manage payments');
    }

    // If subscriptionId provided, verify it belongs to the company
    if (dto.subscriptionId) {
      const subscription = await this.prisma.companySubscription.findUnique({
        where: { id: dto.subscriptionId },
      });

      if (!subscription || subscription.companyId !== dto.companyId) {
        throw new NotFoundException(
          'Subscription not found or does not belong to company',
        );
      }
    }

    const paymentData = {
      companyId: dto.companyId,
      subscriptionId: dto.subscriptionId ?? null,
      amount: new Decimal(dto.amount),
      currency: dto.currency ?? 'BRL',
      paymentMethod: dto.paymentMethod ?? null,
      dueDate: dto.dueDate,
      description: dto.description ?? null,
      externalId: dto.externalId ?? null,
      status: 'pending',
      ...(dto.metadata && { metadata: dto.metadata }),
    };

    return this.prisma.companyPayment.create({
      data: paymentData,
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });
  }

  /**
   * Update a payment
   */
  async updatePayment(
    paymentId: string,
    dto: UpdatePaymentDto,
    userId: string,
  ) {
    // Get payment and verify access
    const payment = await this.prisma.companyPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify user belongs to the company and is main user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== payment.companyId) {
      throw new ForbiddenException('Access denied to this payment');
    }

    if (!user.mainUser) {
      throw new ForbiddenException('Only main users can manage payments');
    }

    return this.prisma.companyPayment.update({
      where: { id: paymentId },
      data: dto,
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });
  }

  /**
   * Mark payment as paid
   */
  async markPaymentAsPaid(
    paymentId: string,
    userId: string,
    paymentDate?: Date,
  ) {
    return this.updatePayment(
      paymentId,
      {
        status: PaymentStatus.PAID,
        paymentDate: paymentDate ?? new Date(),
      },
      userId,
    );
  }

  /**
   * Mark payment as failed
   */
  async markPaymentAsFailed(paymentId: string, userId: string) {
    return this.updatePayment(
      paymentId,
      {
        status: PaymentStatus.FAILED,
      },
      userId,
    );
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string, userId: string) {
    const payment = await this.getPayment(paymentId, userId);

    if (payment.status === 'paid') {
      throw new BadRequestException('Cannot cancel a paid payment');
    }

    return this.updatePayment(
      paymentId,
      {
        status: PaymentStatus.CANCELLED,
      },
      userId,
    );
  }

  /**
   * Get payment statistics for a company
   */
  async getPaymentStatistics(companyId: string, userId: string) {
    // Verify user belongs to the company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    const [
      totalPayments,
      paidPayments,
      pendingPayments,
      failedPayments,
      totalAmount,
      paidAmount,
    ] = await Promise.all([
      this.prisma.companyPayment.count({
        where: { companyId },
      }),
      this.prisma.companyPayment.count({
        where: { companyId, status: 'paid' },
      }),
      this.prisma.companyPayment.count({
        where: { companyId, status: 'pending' },
      }),
      this.prisma.companyPayment.count({
        where: { companyId, status: 'failed' },
      }),
      this.prisma.companyPayment.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
      this.prisma.companyPayment.aggregate({
        where: { companyId, status: 'paid' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      paidPayments,
      pendingPayments,
      failedPayments,
      cancelledPayments:
        totalPayments - paidPayments - pendingPayments - failedPayments,
      totalAmount: totalAmount._sum.amount?.toNumber() ?? 0,
      paidAmount: paidAmount._sum.amount?.toNumber() ?? 0,
      pendingAmount:
        (totalAmount._sum.amount?.toNumber() ?? 0) -
        (paidAmount._sum.amount?.toNumber() ?? 0),
    };
  }

  /**
   * Get overdue payments for a company
   */
  async getOverduePayments(companyId: string, userId: string) {
    // Verify user belongs to the company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    const now = new Date();

    return this.prisma.companyPayment.findMany({
      where: {
        companyId,
        status: 'pending',
        dueDate: {
          lt: now,
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
  }
}
