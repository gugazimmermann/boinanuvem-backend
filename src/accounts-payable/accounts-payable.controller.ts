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
import { AccountsPayableService } from './accounts-payable.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAccountsPayableDto,
  UpdateAccountsPayableDto,
  AccountsPayableResponseDto,
} from './dto';

@ApiTags('Accounts Payable')
@Controller('accounts-payable')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AccountsPayableController {
  constructor(private accountsPayableService: AccountsPayableService) {}

  @Post()
  @RequirePermissions({
    section: 'finances',
    resource: 'expenses',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new accounts payable transaction' })
  @ApiResponse({
    status: 201,
    description: 'Accounts payable transaction created successfully',
    type: AccountsPayableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateAccountsPayableDto,
  ) {
    return this.accountsPayableService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'finances',
    resource: 'expenses',
    action: 'view',
  })
  @ApiOperation({
    summary:
      "Get all accounts payable transactions for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Accounts payable transactions retrieved successfully',
    type: [AccountsPayableResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.accountsPayableService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'expenses',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an accounts payable transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Accounts payable transaction retrieved successfully',
    type: AccountsPayableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Accounts payable transaction not found',
  })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.accountsPayableService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'expenses',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an accounts payable transaction' })
  @ApiResponse({
    status: 200,
    description: 'Accounts payable transaction updated successfully',
    type: AccountsPayableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Accounts payable transaction not found',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountsPayableDto,
  ) {
    return this.accountsPayableService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'expenses',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an accounts payable transaction' })
  @ApiResponse({
    status: 200,
    description: 'Accounts payable transaction deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Accounts payable transaction not found',
  })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.accountsPayableService.remove(user.id, id);
  }
}
