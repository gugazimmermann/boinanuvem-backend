import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateCheckoutSessionDto,
  ConfirmSubscriptionDto,
  CancelSubscriptionDto,
  CreatePortalSessionDto,
  CreateSubscriptionWithPaymentMethodDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireMainUser } from '../auth/decorators/permissions.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Post('checkout')
  @RequireMainUser()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Stripe checkout session',
    description: 'Creates a Stripe checkout session for subscription payment',
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', example: 'cs_test_1234567890' },
        url: {
          type: 'string',
          example: 'https://checkout.stripe.com/pay/cs_test_...',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied. Only main users can create subscriptions.',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.subscriptionsService.createCheckoutSession(
      user.companyId,
      dto.planId,
      dto.billingCycle,
      user.id,
    );
  }

  @Post('create')
  @RequireMainUser()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create subscription with payment method',
    description:
      'Creates a subscription using Stripe Elements payment method without redirecting to Stripe Checkout',
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or payment method',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied. Only main users can create subscriptions.',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  async createSubscriptionWithPaymentMethod(
    @Body() dto: CreateSubscriptionWithPaymentMethodDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.subscriptionsService.createSubscriptionWithPaymentMethod(
      user.companyId,
      dto.planId,
      dto.billingCycle,
      dto.paymentMethodId,
      user.id,
    );
  }

  @Post('confirm')
  @RequireMainUser()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm subscription after payment',
    description:
      'Confirms subscription after successful Stripe payment and creates subscription in database',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription confirmed and created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Payment verification failed or invalid session',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found or invalid',
  })
  async confirmSubscription(
    @Body() dto: ConfirmSubscriptionDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.subscriptionsService.confirmSubscription(
      dto.sessionId,
      user.id,
    );
  }

  @Post(':id/cancel')
  @RequireMainUser()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel subscription',
    description:
      'Cancels a subscription. If the subscription has a Stripe subscription ID, it will also be cancelled in Stripe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or cannot cancel trial subscription',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
  })
  async cancelSubscription(
    @Param('id') subscriptionId: string,
    @Body() dto: CancelSubscriptionDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.subscriptionsService.cancelSubscription(
      subscriptionId,
      user.id,
      dto.cancelImmediately,
    );
  }

  @Post(':id/sync')
  @RequireMainUser()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync subscription status from Stripe',
    description:
      'Retrieves the current subscription status from Stripe and updates the database accordingly',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status synced successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Subscription does not have a Stripe subscription ID',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
  })
  async syncSubscriptionStatus(
    @Param('id') subscriptionId: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.subscriptionsService.syncSubscriptionStatus(
      subscriptionId,
      user.id,
    );
  }

  @Post('portal')
  @RequireMainUser()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create customer portal session',
    description:
      'Creates a Stripe billing portal session for self-service subscription management',
  })
  @ApiResponse({
    status: 200,
    description: 'Portal session created successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'https://billing.stripe.com/p/session/...',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Company does not have a Stripe customer ID',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  async createCustomerPortalSession(
    @Body() dto: CreatePortalSessionDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.subscriptionsService.createCustomerPortalSession(
      user.companyId,
      user.id,
      dto.returnUrl,
    );
  }
}
