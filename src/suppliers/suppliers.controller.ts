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
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierResponseDto,
} from './dto';

@ApiTags('Suppliers')
@Controller('suppliers')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'supplier',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({
    status: 201,
    description: 'Supplier created successfully',
    type: SupplierResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Supplier code already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(user.id, createSupplierDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'supplier',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all suppliers for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Suppliers retrieved successfully',
    type: [SupplierResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.suppliersService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'supplier',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a supplier by ID' })
  @ApiResponse({
    status: 200,
    description: 'Supplier retrieved successfully',
    type: SupplierResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.suppliersService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'supplier',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiResponse({
    status: 200,
    description: 'Supplier updated successfully',
    type: SupplierResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 409, description: 'Supplier code already exists' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user.id, id, updateSupplierDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'supplier',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a supplier' })
  @ApiResponse({
    status: 200,
    description: 'Supplier deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.suppliersService.remove(user.id, id);
  }
}
