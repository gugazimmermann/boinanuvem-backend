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
import { BankAccountsService } from './bank-accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  BankAccountResponseDto,
} from './dto';

@ApiTags('Bank Accounts')
@Controller('bank-accounts')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BankAccountsController {
  constructor(private bankAccountsService: BankAccountsService) {}

  @Post()
  @RequirePermissions({
    section: 'finances',
    resource: 'bankAccounts',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({
    status: 201,
    description: 'Bank account created successfully',
    type: BankAccountResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Bank account already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateBankAccountDto,
  ) {
    return this.bankAccountsService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'finances',
    resource: 'bankAccounts',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all bank accounts for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Bank accounts retrieved successfully',
    type: [BankAccountResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.bankAccountsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'bankAccounts',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a bank account by ID' })
  @ApiResponse({
    status: 200,
    description: 'Bank account retrieved successfully',
    type: BankAccountResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.bankAccountsService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'bankAccounts',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated successfully',
    type: BankAccountResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  @ApiResponse({ status: 409, description: 'Bank account already exists' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateBankAccountDto,
  ) {
    return this.bankAccountsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'finances',
    resource: 'bankAccounts',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a bank account' })
  @ApiResponse({
    status: 200,
    description: 'Bank account deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.bankAccountsService.remove(user.id, id);
  }
}
