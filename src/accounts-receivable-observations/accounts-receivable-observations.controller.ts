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
import { AccountsReceivableObservationsService } from './accounts-receivable-observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAccountsReceivableObservationDto,
  UpdateAccountsReceivableObservationDto,
  AccountsReceivableObservationResponseDto,
} from './dto';

@ApiTags('Accounts Receivable Observations')
@Controller()
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AccountsReceivableObservationsController {
  constructor(
    private accountsReceivableObservationsService: AccountsReceivableObservationsService,
  ) {}

  @Post('accounts-receivable-observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new observation for an accounts receivable transaction',
  })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: AccountsReceivableObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Accounts receivable not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateAccountsReceivableObservationDto,
  ) {
    if (!createDto.accountsReceivableId) {
      throw new NotFoundException('Accounts receivable ID is required');
    }

    return this.accountsReceivableObservationsService.create(
      user.id,
      createDto.accountsReceivableId,
      createDto,
    );
  }

  @Get('accounts-receivable-observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'view',
  })
  @ApiOperation({
    summary:
      "Get all accounts receivable observations for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [AccountsReceivableObservationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.accountsReceivableObservationsService.findAll(user.id);
  }

  @Post('accounts-receivable/:accountsReceivableId/observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a new observation for an accounts receivable transaction (alternative endpoint)',
  })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: AccountsReceivableObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Accounts receivable not found' })
  async createWithPathParam(
    @GetCurrentUser() user: CurrentUser,
    @Param('accountsReceivableId') accountsReceivableId: string,
    @Body() createDto: CreateAccountsReceivableObservationDto,
  ) {
    // Use accountsReceivableId from body or fallback to path param
    const resolvedAccountsReceivableId =
      createDto.accountsReceivableId ?? accountsReceivableId;

    if (!resolvedAccountsReceivableId) {
      throw new NotFoundException('Accounts receivable ID is required');
    }

    const dto = {
      ...createDto,
      accountsReceivableId: resolvedAccountsReceivableId,
    };
    return this.accountsReceivableObservationsService.create(
      user.id,
      resolvedAccountsReceivableId,
      dto,
    );
  }

  @Get('accounts-receivable/:accountsReceivableId/observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for an accounts receivable transaction',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [AccountsReceivableObservationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Accounts receivable not found' })
  async findAllByAccountsReceivableId(
    @GetCurrentUser() user: CurrentUser,
    @Param('accountsReceivableId') accountsReceivableId: string,
  ) {
    return this.accountsReceivableObservationsService.findAllByAccountsReceivableId(
      user.id,
      accountsReceivableId,
    );
  }

  @Get('accounts-receivable-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: AccountsReceivableObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Observation not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.accountsReceivableObservationsService.findOne(user.id, id);
  }

  @Put('accounts-receivable-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: AccountsReceivableObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Observation not found' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountsReceivableObservationDto,
  ) {
    return this.accountsReceivableObservationsService.update(
      user.id,
      id,
      updateDto,
    );
  }

  @Delete('accounts-receivable-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
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
    return this.accountsReceivableObservationsService.remove(user.id, id);
  }
}
