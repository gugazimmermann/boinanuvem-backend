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
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateSaleDto, UpdateSaleDto, SaleResponseDto } from './dto';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  @RequirePermissions({
    section: 'records',
    resource: 'sales',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new sale record' })
  @ApiResponse({
    status: 201,
    description: 'Sale record created successfully',
    type: SaleResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or animal already sold',
  })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createSaleDto: CreateSaleDto,
  ) {
    return this.salesService.create(user.id, createSaleDto);
  }

  @Get()
  @RequirePermissions({
    section: 'records',
    resource: 'sales',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all sale records for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Sale records retrieved successfully',
    type: [SaleResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.salesService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'sales',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a sale record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Sale record retrieved successfully',
    type: SaleResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Sale record not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.salesService.findOne(user.id, id);
  }

  @Get('animal/:animalId')
  @RequirePermissions({
    section: 'records',
    resource: 'sales',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get sale records by animal ID' })
  @ApiResponse({
    status: 200,
    description: 'Sale records retrieved successfully',
    type: [SaleResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async findByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.salesService.findByAnimalId(user.id, animalId);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'sales',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a sale record' })
  @ApiResponse({
    status: 200,
    description: 'Sale record updated successfully',
    type: SaleResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Sale record not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
  ) {
    return this.salesService.update(user.id, id, updateSaleDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'sales',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a sale record' })
  @ApiResponse({
    status: 200,
    description: 'Sale record deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Sale record not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.salesService.remove(user.id, id);
  }
}
