import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { CashFlowService } from './cash-flow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateCashFlowDto,
  UpdateCashFlowDto,
  CashFlowResponseDto,
} from './dto';

@ApiTags('Cash Flow')
@Controller('cash-flow')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CashFlowController {
  constructor(private cashFlowService: CashFlowService) {}

  @Post()
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new cash flow transaction' })
  @ApiResponse({
    status: 201,
    description: 'Cash flow transaction created successfully',
    type: CashFlowResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateCashFlowDto,
  ) {
    return this.cashFlowService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all cash flow transactions for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Cash flow transactions retrieved successfully',
    type: [CashFlowResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.cashFlowService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a cash flow transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Cash flow transaction retrieved successfully',
    type: CashFlowResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Cash flow transaction not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.cashFlowService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a cash flow transaction' })
  @ApiResponse({
    status: 200,
    description: 'Cash flow transaction updated successfully',
    type: CashFlowResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Cash flow transaction not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateCashFlowDto,
  ) {
    return this.cashFlowService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a cash flow transaction' })
  @ApiResponse({
    status: 200,
    description: 'Cash flow transaction deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Cash flow transaction not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.cashFlowService.remove(user.id, id);
  }
}
