import {
  Controller,
  Get,
  Post,
  Put,
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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireMainUser } from '../auth/decorators/permissions.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get company payment history' })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this company',
  })
  async getCompanyPayments(
    @Param('companyId') companyId: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.paymentsService.getCompanyPayments(companyId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific payment details' })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this payment',
  })
  async getPayment(
    @Param('id') paymentId: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.paymentsService.getPayment(paymentId, user.id);
  }

  @Post()
  @RequireMainUser()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create payment record (main user only)' })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - main user required',
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.paymentsService.createPayment(createPaymentDto, user.id);
  }

  @Put(':id')
  @RequireMainUser()
  @ApiOperation({ summary: 'Update payment status (main user only)' })
  @ApiResponse({
    status: 200,
    description: 'Payment updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - main user required',
  })
  async updatePayment(
    @Param('id') paymentId: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.paymentsService.updatePayment(
      paymentId,
      updatePaymentDto,
      user.id,
    );
  }
}
