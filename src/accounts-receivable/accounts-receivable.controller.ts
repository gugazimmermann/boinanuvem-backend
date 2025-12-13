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
import { AccountsReceivableService } from './accounts-receivable.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAccountsReceivableDto,
  UpdateAccountsReceivableDto,
  AccountsReceivableResponseDto,
} from './dto';

@ApiTags('Accounts Receivable')
@Controller('accounts-receivable')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AccountsReceivableController {
  constructor(private accountsReceivableService: AccountsReceivableService) {}

  @Post()
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new accounts receivable transaction' })
  @ApiResponse({
    status: 201,
    description: 'Accounts receivable transaction created successfully',
    type: AccountsReceivableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateAccountsReceivableDto,
  ) {
    return this.accountsReceivableService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'view',
  })
  @ApiOperation({
    summary:
      "Get all accounts receivable transactions for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Accounts receivable transactions retrieved successfully',
    type: [AccountsReceivableResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.accountsReceivableService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an accounts receivable transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Accounts receivable transaction retrieved successfully',
    type: AccountsReceivableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Accounts receivable transaction not found',
  })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.accountsReceivableService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an accounts receivable transaction' })
  @ApiResponse({
    status: 200,
    description: 'Accounts receivable transaction updated successfully',
    type: AccountsReceivableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Accounts receivable transaction not found',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountsReceivableDto,
  ) {
    return this.accountsReceivableService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'accountsReceivable',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an accounts receivable transaction' })
  @ApiResponse({
    status: 200,
    description: 'Accounts receivable transaction deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Accounts receivable transaction not found',
  })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.accountsReceivableService.remove(user.id, id);
  }
}
