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
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CashFlowObservationsService } from './cash-flow-observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateCashFlowObservationDto,
  UpdateCashFlowObservationDto,
  CashFlowObservationResponseDto,
} from './dto';

@ApiTags('Cash Flow Observations')
@Controller()
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CashFlowObservationsController {
  constructor(
    private cashFlowObservationsService: CashFlowObservationsService,
  ) {}

  @Post('cash-flow-observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new observation for a cash flow transaction',
  })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: CashFlowObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Cash flow not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateCashFlowObservationDto,
  ) {
    if (!createDto.cashFlowId) {
      throw new NotFoundException('Cash flow ID is required');
    }

    return this.cashFlowObservationsService.create(
      user.id,
      createDto.cashFlowId,
      createDto,
    );
  }

  @Get('cash-flow-observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all cash flow observations for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [CashFlowObservationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.cashFlowObservationsService.findAll(user.id);
  }

  @Post('cash-flows/:cashFlowId/observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a new observation for a cash flow transaction (alternative endpoint)',
  })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: CashFlowObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Cash flow not found' })
  async createWithPathParam(
    @GetCurrentUser() user: CurrentUser,
    @Param('cashFlowId') cashFlowId: string,
    @Body() createDto: CreateCashFlowObservationDto,
  ) {
    // Use cashFlowId from body or fallback to path param
    const resolvedCashFlowId = createDto.cashFlowId ?? cashFlowId;

    if (!resolvedCashFlowId) {
      throw new NotFoundException('Cash flow ID is required');
    }

    const dto = {
      ...createDto,
      cashFlowId: resolvedCashFlowId,
    };
    return this.cashFlowObservationsService.create(
      user.id,
      resolvedCashFlowId,
      dto,
    );
  }

  @Get('cash-flows/:cashFlowId/observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for a cash flow transaction',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [CashFlowObservationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Cash flow not found' })
  async findAllByCashFlowId(
    @GetCurrentUser() user: CurrentUser,
    @Param('cashFlowId') cashFlowId: string,
  ) {
    return this.cashFlowObservationsService.findAllByCashFlowId(
      user.id,
      cashFlowId,
    );
  }

  @Get('cash-flow-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: CashFlowObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Observation not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.cashFlowObservationsService.findOne(user.id, id);
  }

  @Put('cash-flow-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: CashFlowObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Observation not found' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateCashFlowObservationDto,
  ) {
    return this.cashFlowObservationsService.update(user.id, id, updateDto);
  }

  @Delete('cash-flow-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'cashFlow',
    action: 'edit',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Observation not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.cashFlowObservationsService.remove(user.id, id);
  }
}
