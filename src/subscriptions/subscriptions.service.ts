import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../common/services/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { InputJsonValue } from '@prisma/client/runtime/library';

export interface CreateSubscriptionDto {
  companyId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
}

export interface UpdateSubscriptionDto {
  planId?: string;
  billingCycle?: 'monthly' | 'annual';
  status?: 'active' | 'cancelled' | 'expired';
  stripePriceId?: string;
}

// Mapping between plan names and Stripe product IDs
const PLAN_STRIPE_PRODUCT_MAPPING: Record<
  string,
  { monthly: string; annual: string }
> = {
  Mínimo: {
    monthly: 'prod_TbycofNHRxKvcg',
    annual: 'prod_Tbydr0C4LhS4yh',
  },
  Básico: {
    monthly: 'prod_TbydxVccnquINH',
    annual: 'prod_TbyeoIqvAxtXa3',
  },
  Padrão: {
    monthly: 'prod_TbyfjRd4NuE2Sk',
    annual: 'prod_Tbyfuz8jxp935h',
  },
  Avançado: {
    monthly: 'prod_TbygBLu7RJpqZd',
    annual: 'prod_TbygbJBTz6vFDt',
  },
};

/**
 * Payment record creation parameters
 */
interface PaymentRecordParams {
  companyId: string;
  subscriptionId: string;
  planName: string;
  billingCycle: 'monthly' | 'annual';
  amount: Decimal;
  status: string;
  externalId: string;
  metadata: Record<string, unknown>;
  paymentDate?: Date | null;
  dueDate?: Date;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-11-17.clover',
      });
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured. Stripe functionality will be disabled.',
      );
    }
  }

  /**
   * Get all subscriptions for a company
   */
  async getCompanySubscriptions(companyId: string, userId: string) {
    await this.verifyUserAccess(userId, companyId);

    return this.prisma.companySubscription.findMany({
      where: { companyId },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get current active subscription for a company
   */
  async getCurrentSubscription(companyId: string, userId: string) {
    await this.verifyUserAccess(userId, companyId);

    const subscription = await this.prisma.companySubscription.findFirst({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return subscription;
  }

  /**
   * Create a new subscription (upgrade from trial or change plan)
   */
  async createSubscription(dto: CreateSubscriptionDto, userId: string) {
    await this.verifyUserAccess(userId, dto.companyId, true);
    await this.verifyPlan(dto.planId);

    return this.prisma.$transaction(async (tx) => {
      // Deactivate current active subscription
      await tx.companySubscription.updateMany({
        where: {
          companyId: dto.companyId,
          isActive: true,
        },
        data: {
          isActive: false,
          status: 'cancelled',
        },
      });

      // Create new subscription
      const subscription = await tx.companySubscription.create({
        data: {
          companyId: dto.companyId,
          planId: dto.planId,
          billingCycle: dto.billingCycle,
          status: 'active',
          isActive: true,
          isTrial: false,
          stripeSubscriptionId: dto.stripeSubscriptionId ?? null,
          stripeCustomerId: dto.stripeCustomerId ?? null,
          stripePriceId: dto.stripePriceId ?? null,
        },
        include: {
          plan: true,
        },
      });

      // Update company trial status to converted and store customer ID
      const updateData: { trialStatus: string; stripeCustomerId?: string } = {
        trialStatus: 'converted',
      };

      // Store customer ID at company level if provided and not already set
      if (dto.stripeCustomerId) {
        const company = await tx.company.findUnique({
          where: { id: dto.companyId },
          select: { stripeCustomerId: true },
        });

        if (!company?.stripeCustomerId) {
          updateData.stripeCustomerId = dto.stripeCustomerId;
        }
      }

      await tx.company.update({
        where: { id: dto.companyId },
        data: updateData,
      });

      return subscription;
    });
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
    userId: string,
  ) {
    // Get subscription and verify access
    const subscription = await this.prisma.companySubscription.findUnique({
      where: { id: subscriptionId },
      include: { company: true, plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.verifyUserAccess(userId, subscription.companyId, true);

    // Determine if plan or billing cycle is changing
    const planChanged = dto.planId && dto.planId !== subscription.planId;
    const billingCycleChanged =
      dto.billingCycle && dto.billingCycle !== subscription.billingCycle;

    // If changing plan, verify new plan exists
    let newPlan = subscription.plan;
    if (dto.planId) {
      newPlan = await this.verifyPlan(dto.planId);
    }

    // If plan or billing cycle changes and we have a Stripe subscription, update in Stripe
    if (
      (planChanged || billingCycleChanged) &&
      subscription.stripeSubscriptionId &&
      this.stripe
    ) {
      try {
        // Determine the new billing cycle
        const newBillingCycle = (dto.billingCycle ??
          subscription.billingCycle) as 'monthly' | 'annual';

        // Get Stripe product and price IDs
        const { priceId: newPriceId } = await this.getStripeProductAndPrice(
          newPlan.name,
          newBillingCycle,
        );

        // Update Stripe subscription with new price
        const subscriptionItemId = subscription.stripePriceId
          ? await this.getStripeSubscriptionItemId(
              subscription.stripeSubscriptionId,
            )
          : undefined;

        const updateItems: Stripe.SubscriptionUpdateParams.Item[] = [
          {
            ...(subscriptionItemId ? { id: subscriptionItemId } : {}),
            price: newPriceId,
          },
        ];

        const stripe = this.getStripeInstance();
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: updateItems,
          proration_behavior: 'create_prorations', // Prorate the change
        });

        this.logger.log(
          `Updated Stripe subscription ${subscription.stripeSubscriptionId} with new price ${newPriceId}`,
        );

        // Update stripePriceId in DTO
        dto.stripePriceId = newPriceId;
      } catch (error) {
        this.handleStripeError(error);
      }
    }

    // Update database
    return this.prisma.companySubscription.update({
      where: { id: subscriptionId },
      data: dto,
      include: {
        plan: true,
      },
    });
  }

  /**
   * Get the subscription item ID from a Stripe subscription
   */
  private async getStripeSubscriptionItemId(
    stripeSubscriptionId: string,
  ): Promise<string | undefined> {
    if (!this.stripe) {
      return undefined;
    }

    try {
      const stripe = this.getStripeInstance();
      const stripeSubscription =
        await stripe.subscriptions.retrieve(stripeSubscriptionId);
      return stripeSubscription.items.data[0]?.id;
    } catch (error) {
      this.logger.warn(
        `Failed to retrieve Stripe subscription item ID: ${this.formatErrorMessage(error)}`,
      );
      return undefined;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    userId: string,
    cancelImmediately = false,
  ) {
    // Get subscription and verify access
    const subscription = await this.prisma.companySubscription.findUnique({
      where: { id: subscriptionId },
      include: { company: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.verifyUserAccess(userId, subscription.companyId, true);

    if (subscription.isTrial) {
      throw new BadRequestException('Cannot cancel trial subscription');
    }

    // If subscription has Stripe subscription ID, cancel in Stripe first
    if (subscription.stripeSubscriptionId && this.stripe) {
      try {
        const stripe = this.getStripeInstance();
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
          invoice_now: cancelImmediately,
          prorate: cancelImmediately,
        });
        this.logger.log(
          `Cancelled Stripe subscription: ${subscription.stripeSubscriptionId}`,
        );
      } catch (error) {
        // If subscription is already cancelled in Stripe, log and continue
        if (
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.code === 'resource_missing'
        ) {
          this.logger.warn(
            `Stripe subscription ${subscription.stripeSubscriptionId} not found, proceeding with database update`,
          );
        } else {
          this.handleStripeError(error);
        }
      }
    }

    // Update database
    return this.prisma.companySubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'cancelled',
        isActive: false,
      },
      include: {
        plan: true,
      },
    });
  }

  /**
   * Get subscription usage and limits
   */
  async getSubscriptionUsage(companyId: string, userId: string) {
    await this.verifyUserAccess(userId, companyId);

    const subscription = await this.getCurrentSubscription(companyId, userId);

    // Get current usage (this would be implemented based on your business logic)
    const usage = {
      properties: 0, // Count from properties table
      locations: 0, // Count from locations table
      animals: 0, // Count from animals table
      members: 0, // Count from users table
    };

    // Get plan limits
    const limits = subscription.plan.limits as Record<string, unknown>;

    return {
      subscription,
      usage,
      limits,
      isWithinLimits: {
        properties: this.checkLimit(
          usage.properties,
          limits.properties as string,
        ),
        locations: this.checkLimit(usage.locations, limits.locations as string),
        animals: this.checkLimit(usage.animals, limits.animals as string),
        members: this.checkLimit(usage.members, limits.members as string),
      },
    };
  }

  private checkLimit(current: number, limit: string): boolean {
    if (limit === 'Ilimitados' || limit === 'Ilimitadas') {
      return true;
    }

    const numericLimit = parseInt(limit.replace(/\D/g, ''));
    return current <= numericLimit;
  }

  /**
   * Format error message for logging
   */
  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null) {
      return JSON.stringify(error);
    }
    return String(error);
  }

  /**
   * Verify user belongs to company and optionally check if main user
   */
  private async verifyUserAccess(
    userId: string,
    companyId: string,
    requireMainUser = false,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    if (requireMainUser && !user.mainUser) {
      throw new ForbiddenException('Only main users can manage subscriptions');
    }

    return user;
  }

  /**
   * Verify plan exists and is active
   */
  private async verifyPlan(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.status !== 'active') {
      throw new NotFoundException('Plan not found or inactive');
    }

    return plan;
  }

  /**
   * Determine subscription status from Stripe subscription
   */
  private determineSubscriptionStatus(
    stripeSubscription: Stripe.Subscription,
    invoice?: Stripe.Invoice | null,
  ): 'active' | 'cancelled' | 'expired' {
    if (
      stripeSubscription.status === 'active' ||
      stripeSubscription.status === 'trialing'
    ) {
      return 'active';
    }

    if (stripeSubscription.status === 'canceled') {
      return 'cancelled';
    }

    if (
      stripeSubscription.status === 'incomplete' ||
      stripeSubscription.status === 'incomplete_expired'
    ) {
      // If subscription is incomplete, check if invoice payment failed
      if (invoice?.status === 'open' || invoice?.status === 'uncollectible') {
        // Payment failed - we'll still create the subscription but mark it appropriately
        this.logger.warn(
          `Subscription ${stripeSubscription.id} created but payment incomplete. Invoice status: ${invoice?.status}`,
        );
        return 'active'; // Still mark as active, payment can be retried
      }
    }

    return 'active';
  }

  /**
   * Determine payment status from invoice status
   */
  private determinePaymentStatus(invoiceStatus: string): string {
    if (invoiceStatus === 'paid') {
      return 'paid';
    }
    if (invoiceStatus === 'open') {
      return 'pending';
    }
    if (invoiceStatus === 'uncollectible') {
      return 'failed';
    }
    return 'pending';
  }

  /**
   * Calculate payment amount from invoice
   */
  private calculatePaymentAmount(invoice?: Stripe.Invoice | null): Decimal {
    if (invoice?.amount_paid) {
      return new Decimal(invoice.amount_paid / 100); // Stripe amounts are in cents
    }
    if (invoice?.amount_due) {
      return new Decimal(invoice.amount_due / 100);
    }
    return new Decimal(0);
  }

  /**
   * Get Stripe product ID and price ID for a plan and billing cycle
   */
  private async getStripeProductAndPrice(
    planName: string,
    billingCycle: 'monthly' | 'annual',
  ): Promise<{ productId: string; priceId: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const productMapping = PLAN_STRIPE_PRODUCT_MAPPING[planName];
    if (!productMapping) {
      throw new BadRequestException(
        `No Stripe product mapping found for plan: ${planName}`,
      );
    }

    const stripeProductId =
      billingCycle === 'monthly'
        ? productMapping.monthly
        : productMapping.annual;

    const stripe = this.getStripeInstance();
    const prices = await stripe.prices.list({
      product: stripeProductId,
      active: true,
    });

    if (prices.data.length === 0) {
      throw new BadRequestException(
        `No active prices found for Stripe product: ${stripeProductId}`,
      );
    }

    return {
      productId: stripeProductId,
      priceId: prices.data[0].id,
    };
  }

  /**
   * Check if Stripe is configured
   */
  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
  }

  /**
   * Get Stripe instance, throwing if not configured
   * Use this after calling ensureStripeConfigured() to satisfy TypeScript
   */
  private getStripeInstance(): Stripe {
    this.ensureStripeConfigured();
    return this.stripe!;
  }

  /**
   * Get company with Stripe customer ID
   */
  private async getCompanyWithStripeCustomer(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      select: { stripeCustomerId: true },
    });
  }

  /**
   * Extract Stripe IDs from a checkout session
   */
  private extractStripeIdsFromSession(session: Stripe.Checkout.Session): {
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    stripePriceId?: string;
  } {
    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    const stripePriceId =
      session.line_items?.data && session.line_items.data.length > 0
        ? session.line_items.data[0].price?.id
        : undefined;

    const result: {
      stripeSubscriptionId?: string;
      stripeCustomerId?: string;
      stripePriceId?: string;
    } = {};

    if (stripeSubscriptionId !== undefined) {
      result.stripeSubscriptionId = stripeSubscriptionId;
    }
    if (stripeCustomerId !== undefined) {
      result.stripeCustomerId = stripeCustomerId;
    }
    if (stripePriceId !== undefined) {
      result.stripePriceId = stripePriceId;
    }

    return result;
  }

  /**
   * Build subscription DTO with optional Stripe IDs
   */
  private buildSubscriptionDto(
    companyId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
    stripeIds?: {
      stripeSubscriptionId?: string;
      stripeCustomerId?: string;
      stripePriceId?: string;
    },
  ): CreateSubscriptionDto {
    const dto: CreateSubscriptionDto = {
      companyId,
      planId,
      billingCycle,
    };

    if (stripeIds) {
      if (stripeIds.stripeSubscriptionId) {
        dto.stripeSubscriptionId = stripeIds.stripeSubscriptionId;
      }
      if (stripeIds.stripeCustomerId) {
        dto.stripeCustomerId = stripeIds.stripeCustomerId;
      }
      if (stripeIds.stripePriceId) {
        dto.stripePriceId = stripeIds.stripePriceId;
      }
    }

    return dto;
  }

  /**
   * Create a payment record for a subscription
   */
  private async createPaymentRecord(params: PaymentRecordParams) {
    const paymentDate =
      params.paymentDate ?? (params.status === 'paid' ? new Date() : null);
    const dueDate = params.dueDate ?? new Date();

    await this.prisma.companyPayment.create({
      data: {
        companyId: params.companyId,
        subscriptionId: params.subscriptionId,
        amount: params.amount,
        currency: 'BRL',
        status: params.status,
        paymentMethod: 'credit_card',
        paymentDate,
        dueDate,
        description: `Subscription payment for ${params.planName} (${params.billingCycle})`,
        externalId: params.externalId,
        metadata: params.metadata as unknown as InputJsonValue,
      },
    });
  }

  /**
   * Handle Stripe API errors and convert to appropriate HTTP exceptions
   */
  private handleStripeError(error: unknown): never {
    if (error instanceof Stripe.errors.StripeError) {
      this.logger.error(`Stripe API error: ${error.message}`, error.stack);

      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        throw new BadRequestException(
          `Invalid Stripe request: ${error.message}`,
        );
      }

      if (error instanceof Stripe.errors.StripeAPIError) {
        throw new BadRequestException(
          `Stripe API error: ${error.message}. Please try again later.`,
        );
      }

      if (error instanceof Stripe.errors.StripeAuthenticationError) {
        throw new BadRequestException(
          'Stripe authentication failed. Please contact support.',
        );
      }

      if (error instanceof Stripe.errors.StripePermissionError) {
        throw new ForbiddenException('Stripe permission denied.');
      }

      if (error instanceof Stripe.errors.StripeRateLimitError) {
        throw new BadRequestException(
          'Too many requests to Stripe. Please try again later.',
        );
      }

      // Generic Stripe error
      throw new BadRequestException(`Stripe error: ${error.message}`);
    }

    // Re-throw if not a Stripe error
    throw error;
  }

  /**
   * Create Stripe checkout session for subscription
   */
  async createCheckoutSession(
    companyId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
    userId: string,
  ) {
    this.ensureStripeConfigured();
    const stripe = this.getStripeInstance();

    const user = await this.verifyUserAccess(userId, companyId, true);

    // Get plan from database
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.status !== 'active') {
      throw new NotFoundException('Plan not found or inactive');
    }

    // Get Stripe product ID from mapping
    const productMapping = PLAN_STRIPE_PRODUCT_MAPPING[plan.name];
    if (!productMapping) {
      throw new BadRequestException(
        `No Stripe product mapping found for plan: ${plan.name}`,
      );
    }

    const stripeProductId =
      billingCycle === 'monthly'
        ? productMapping.monthly
        : productMapping.annual;

    // Get prices for the product
    const prices = await stripe.prices.list({
      product: stripeProductId,
      active: true,
    });

    if (prices.data.length === 0) {
      throw new BadRequestException(
        `No active prices found for Stripe product: ${stripeProductId}`,
      );
    }

    // Use the first price (assuming one price per product)
    const priceId = prices.data[0].id;

    // Get frontend URL
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    const company = await this.getCompanyWithStripeCustomer(companyId);

    // Prepare checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/dashboard/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/assinatura`,
      metadata: {
        companyId,
        planId,
        billingCycle,
        userId,
      },
    };

    // Use existing customer ID if available, otherwise use email
    if (company?.stripeCustomerId) {
      sessionParams.customer = company.stripeCustomerId;
    } else {
      sessionParams.customer_email = user.email;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Confirm subscription after successful payment
   */
  async confirmSubscription(sessionId: string, userId: string) {
    this.ensureStripeConfigured();

    // Verify user exists and is main user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!user.mainUser) {
      throw new ForbiddenException('Only main users can confirm subscriptions');
    }

    // Retrieve checkout session from Stripe
    this.ensureStripeConfigured();
    const stripe = this.getStripeInstance();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items'],
    });

    // Verify payment status
    if (session.payment_status !== 'paid') {
      throw new BadRequestException(
        `Payment not completed. Status: ${session.payment_status}`,
      );
    }

    // Get metadata
    const companyId = session.metadata?.companyId;
    const planId = session.metadata?.planId;
    const billingCycle = session.metadata?.billingCycle as 'monthly' | 'annual';

    if (!companyId || !planId || !billingCycle) {
      throw new BadRequestException('Invalid session metadata');
    }

    // Verify user belongs to the company
    if (user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    const plan = await this.verifyPlan(planId);

    // Extract Stripe IDs from session
    const stripeIds = this.extractStripeIdsFromSession(session);

    // Create subscription in database with Stripe IDs
    const subscriptionDto = this.buildSubscriptionDto(
      companyId,
      planId,
      billingCycle,
      stripeIds,
    );

    const subscription = await this.createSubscription(subscriptionDto, userId);

    // Create payment record
    const amount = session.amount_total
      ? new Decimal(session.amount_total / 100) // Stripe amounts are in cents
      : new Decimal(0);

    await this.createPaymentRecord({
      companyId,
      subscriptionId: subscription.id,
      planName: plan.name,
      billingCycle,
      amount,
      status: 'paid',
      externalId: session.id,
      metadata: {
        stripeSessionId: session.id,
        ...stripeIds,
      },
      paymentDate: new Date(),
      dueDate: new Date(),
    });

    return subscription;
  }

  /**
   * Verify payment method is valid and is a card
   */
  private async verifyPaymentMethod(paymentMethodId: string): Promise<void> {
    const stripe = this.getStripeInstance();
    try {
      const paymentMethod =
        await stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.type !== 'card') {
        throw new BadRequestException(
          'Only card payment methods are supported',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid payment method');
    }
  }

  /**
   * Get or create Stripe customer for company
   */
  private async getOrCreateStripeCustomer(
    companyId: string,
    company: { stripeCustomerId: string | null } | null,
    userEmail: string,
    userId: string,
  ): Promise<string> {
    if (company?.stripeCustomerId) {
      return company.stripeCustomerId;
    }

    // Create new Stripe customer
    const stripe = this.getStripeInstance();
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        companyId,
        userId,
      },
    });

    // Update company with Stripe customer ID
    await this.prisma.company.update({
      where: { id: companyId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Attach payment method to customer
   */
  private async attachPaymentMethodToCustomer(
    paymentMethodId: string,
    customerId: string,
  ): Promise<void> {
    const stripe = this.getStripeInstance();
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      // Payment method might already be attached, continue
      this.logger.warn(
        `Payment method attachment warning: ${this.formatErrorMessage(error)}`,
      );
    }
  }

  /**
   * Handle invoice payment based on status
   */
  private async handleInvoicePayment(
    invoice: Stripe.Invoice,
    paymentMethodId: string,
  ): Promise<void> {
    const stripe = this.getStripeInstance();
    if (invoice.status === 'open') {
      try {
        await stripe.invoices.pay(invoice.id, {
          payment_method: paymentMethodId,
        });
        this.logger.log(`Invoice ${invoice.id} paid successfully`);
      } catch (payError) {
        this.logger.error(
          `Failed to pay invoice ${invoice.id}: ${this.formatErrorMessage(payError)}`,
        );
        // Don't throw here - subscription is created, payment can be retried
      }
    } else if (invoice.status === 'paid') {
      this.logger.log(`Invoice ${invoice.id} already paid`);
    } else if (invoice.status === 'draft') {
      try {
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
          invoice.id,
        );
        if (finalizedInvoice.status === 'open') {
          await stripe.invoices.pay(finalizedInvoice.id, {
            payment_method: paymentMethodId,
          });
        }
      } catch (finalizeError) {
        this.logger.error(
          `Failed to finalize invoice ${invoice.id}: ${this.formatErrorMessage(finalizeError)}`,
        );
      }
    }
  }

  /**
   * Create subscription with payment method from Stripe Elements
   */
  async createSubscriptionWithPaymentMethod(
    companyId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
    paymentMethodId: string,
    userId: string,
  ) {
    this.ensureStripeConfigured();

    const user = await this.verifyUserAccess(userId, companyId, true);
    const plan = await this.verifyPlan(planId);

    // Get Stripe product and price IDs
    const { priceId } = await this.getStripeProductAndPrice(
      plan.name,
      billingCycle,
    );

    // Verify payment method
    await this.verifyPaymentMethod(paymentMethodId);

    // Get or create Stripe customer
    const company = await this.getCompanyWithStripeCustomer(companyId);
    const stripeCustomerId = await this.getOrCreateStripeCustomer(
      companyId,
      company,
      user.email,
      userId,
    );

    // Attach payment method to customer
    await this.attachPaymentMethodToCustomer(paymentMethodId, stripeCustomerId);

    // Set payment method as default for customer
    const stripe = this.getStripeInstance();
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create Stripe subscription
    let stripeSubscription: Stripe.Subscription;
    try {
      stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [
          {
            price: priceId,
          },
        ],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
      });

      // Handle invoice payment
      const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
      if (invoice) {
        await this.handleInvoicePayment(invoice, paymentMethodId);
      }
    } catch (error) {
      this.handleStripeError(error);
      throw error; // Re-throw to prevent continuing with undefined stripeSubscription
    }

    // Determine subscription status
    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    const subscriptionStatus = this.determineSubscriptionStatus(
      stripeSubscription,
      invoice,
    );

    // Create subscription in database
    const subscription = await this.createSubscription(
      {
        companyId,
        planId,
        billingCycle,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId,
        stripePriceId: priceId,
      },
      userId,
    );

    // Update subscription status if different from default
    if (subscriptionStatus !== 'active') {
      await this.prisma.companySubscription.update({
        where: { id: subscription.id },
        data: { status: subscriptionStatus },
      });
    }

    // Determine payment status and amount
    const invoiceStatus = invoice?.status ?? 'unknown';
    const paymentStatus = this.determinePaymentStatus(invoiceStatus);
    const amount = this.calculatePaymentAmount(invoice);

    // Create payment record
    const paymentRecordParams: PaymentRecordParams = {
      companyId,
      subscriptionId: subscription.id,
      planName: plan.name,
      billingCycle,
      amount,
      status: paymentStatus,
      externalId: invoice?.id ?? stripeSubscription.id,
      metadata: {
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId,
        stripePriceId: priceId,
        paymentMethodId,
        invoiceStatus,
        subscriptionStatus: stripeSubscription.status,
      },
      paymentDate: invoiceStatus === 'paid' ? new Date() : null,
    };

    if (invoice?.due_date) {
      paymentRecordParams.dueDate = new Date(invoice.due_date * 1000);
    }

    await this.createPaymentRecord(paymentRecordParams);

    // If payment is not completed, log warning but still return subscription
    if (invoiceStatus !== 'paid') {
      this.logger.warn(
        `Subscription ${stripeSubscription.id} created but payment not completed. Invoice status: ${invoiceStatus}. Subscription status: ${stripeSubscription.status}`,
      );
    }

    return subscription;
  }

  /**
   * Sync subscription status from Stripe to database
   */
  async syncSubscriptionStatus(subscriptionId: string, userId: string) {
    this.ensureStripeConfigured();

    // Get subscription and verify access
    const subscription = await this.prisma.companySubscription.findUnique({
      where: { id: subscriptionId },
      include: { company: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.verifyUserAccess(userId, subscription.companyId, true);

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException(
        'Subscription does not have a Stripe subscription ID',
      );
    }

    try {
      // Retrieve subscription from Stripe
      const stripe = this.getStripeInstance();
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
      );

      // Map Stripe status to our status
      let newStatus = subscription.status;
      let isActive = subscription.isActive;

      switch (stripeSubscription.status) {
        case 'active':
        case 'trialing':
        case 'past_due':
        case 'unpaid':
          newStatus = 'active';
          isActive = true;
          break;
        case 'canceled':
          newStatus = 'cancelled';
          isActive = false;
          break;
        case 'incomplete':
        case 'incomplete_expired':
          newStatus = 'active';
          isActive = false;
          break;
        default:
          this.logger.warn(
            `Unknown Stripe subscription status: ${stripeSubscription.status}`,
          );
      }

      // Update database if status changed
      if (
        newStatus !== subscription.status ||
        isActive !== subscription.isActive
      ) {
        const cancelAt = stripeSubscription.cancel_at;
        // Access current_period_end - it exists on Subscription but TypeScript types may not reflect it
        const currentPeriodEnd = (
          stripeSubscription as Stripe.Subscription & {
            current_period_end?: number;
          }
        ).current_period_end;
        const endDateValue = cancelAt ?? currentPeriodEnd;

        const updated = await this.prisma.companySubscription.update({
          where: { id: subscriptionId },
          data: {
            status: newStatus,
            isActive,
            endDate: endDateValue ? new Date(endDateValue * 1000) : null,
          },
          include: {
            plan: true,
          },
        });

        this.logger.log(
          `Synced subscription ${subscriptionId} status from Stripe: ${subscription.status} -> ${newStatus}`,
        );

        return updated;
      }

      return subscription;
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  /**
   * Create a customer portal session for self-service subscription management
   */
  async createCustomerPortalSession(
    companyId: string,
    userId: string,
    returnUrl?: string,
  ) {
    this.ensureStripeConfigured();

    await this.verifyUserAccess(userId, companyId, true);

    // Get company with Stripe customer ID
    const company = await this.getCompanyWithStripeCustomer(companyId);

    if (!company?.stripeCustomerId) {
      throw new BadRequestException(
        'Company does not have a Stripe customer ID. Please create a subscription first.',
      );
    }

    // Use provided return URL or default to payments page
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const finalReturnUrl = returnUrl ?? `${frontendUrl}/dashboard/pagamentos`;

    try {
      // Create billing portal session
      const stripe = this.getStripeInstance();
      const session = await stripe.billingPortal.sessions.create({
        customer: company.stripeCustomerId,
        return_url: finalReturnUrl,
      });

      return {
        url: session.url,
      };
    } catch (error) {
      this.handleStripeError(error);
    }
  }
}
