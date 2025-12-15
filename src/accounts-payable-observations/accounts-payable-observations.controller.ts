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
import { AccountsPayableObservationsService } from './accounts-payable-observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAccountsPayableObservationDto,
  UpdateAccountsPayableObservationDto,
  AccountsPayableObservationResponseDto,
} from './dto';

@ApiTags('Accounts Payable Observations')
@Controller()
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AccountsPayableObservationsController {
  constructor(
    private accountsPayableObservationsService: AccountsPayableObservationsService,
  ) {}

  @Post('accounts-payable-observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsPayable',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new observation for an accounts payable transaction',
  })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: AccountsPayableObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Accounts payable not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateAccountsPayableObservationDto,
  ) {
    if (!createDto.accountsPayableId) {
      throw new NotFoundException('Accounts payable ID is required');
    }

    return this.accountsPayableObservationsService.create(
      user.id,
      createDto.accountsPayableId,
      createDto,
    );
  }

  @Get('accounts-payable-observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsPayable',
    action: 'view',
  })
  @ApiOperation({
    summary:
      "Get all accounts payable observations for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [AccountsPayableObservationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.accountsPayableObservationsService.findAll(user.id);
  }

  @Post('accounts-payable/:accountsPayableId/observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsPayable',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a new observation for an accounts payable transaction (alternative endpoint)',
  })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: AccountsPayableObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Accounts payable not found' })
  async createWithPathParam(
    @GetCurrentUser() user: CurrentUser,
    @Param('accountsPayableId') accountsPayableId: string,
    @Body() createDto: CreateAccountsPayableObservationDto,
  ) {
    // Use accountsPayableId from body or fallback to path param
    const resolvedAccountsPayableId =
      createDto.accountsPayableId ?? accountsPayableId;

    if (!resolvedAccountsPayableId) {
      throw new NotFoundException('Accounts payable ID is required');
    }

    const dto = {
      ...createDto,
      accountsPayableId: resolvedAccountsPayableId,
    };

    return this.accountsPayableObservationsService.create(
      user.id,
      resolvedAccountsPayableId,
      dto,
    );
  }

  @Get('accounts-payable/:accountsPayableId/observations')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsPayable',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for an accounts payable transaction',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [AccountsPayableObservationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Accounts payable not found' })
  async findAllByAccountsPayableId(
    @GetCurrentUser() user: CurrentUser,
    @Param('accountsPayableId') accountsPayableId: string,
  ) {
    return this.accountsPayableObservationsService.findAllByAccountsPayableId(
      user.id,
      accountsPayableId,
    );
  }

  @Get('accounts-payable-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsPayable',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: AccountsPayableObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Observation not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.accountsPayableObservationsService.findOne(user.id, id);
  }

  @Put('accounts-payable-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsPayable',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: AccountsPayableObservationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Observation not found' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountsPayableObservationDto,
  ) {
    return this.accountsPayableObservationsService.update(
      user.id,
      id,
      updateDto,
    );
  }

  @Delete('accounts-payable-observations/:id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsPayable',
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
    return this.accountsPayableObservationsService.remove(user.id, id);
  }
}
