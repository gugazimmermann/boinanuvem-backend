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
import { InventoryMovementsService } from './inventory-movements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateInventoryMovementDto,
  UpdateInventoryMovementDto,
  InventoryMovementResponseDto,
} from './dto';

@ApiTags('Inventory Movements')
@Controller('inventory-movements')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InventoryMovementsController {
  constructor(private inventoryMovementsService: InventoryMovementsService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new inventory movement' })
  @ApiResponse({
    status: 201,
    description: 'Inventory movement created successfully',
    type: InventoryMovementResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateInventoryMovementDto,
  ) {
    return this.inventoryMovementsService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all inventory movements for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory movements retrieved successfully',
    type: [InventoryMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.inventoryMovementsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an inventory movement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Inventory movement retrieved successfully',
    type: InventoryMovementResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Inventory movement not found',
  })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.inventoryMovementsService.findOne(user.id, id);
  }

  @Get('item/:itemId')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get inventory movements by item ID' })
  @ApiResponse({
    status: 200,
    description: 'Inventory movements retrieved successfully',
    type: [InventoryMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async findByItemId(
    @GetCurrentUser() user: CurrentUser,
    @Param('itemId') itemId: string,
  ) {
    return this.inventoryMovementsService.findByItemId(user.id, itemId);
  }

  @Get('property/:propertyId')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get inventory movements by property ID' })
  @ApiResponse({
    status: 200,
    description: 'Inventory movements retrieved successfully',
    type: [InventoryMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findByPropertyId(
    @GetCurrentUser() user: CurrentUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.inventoryMovementsService.findByPropertyId(user.id, propertyId);
  }

  @Get('location/:locationId')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get inventory movements by location ID' })
  @ApiResponse({
    status: 200,
    description: 'Inventory movements retrieved successfully',
    type: [InventoryMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findByLocationId(
    @GetCurrentUser() user: CurrentUser,
    @Param('locationId') locationId: string,
  ) {
    return this.inventoryMovementsService.findByLocationId(user.id, locationId);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an inventory movement' })
  @ApiResponse({
    status: 200,
    description: 'Inventory movement updated successfully',
    type: InventoryMovementResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Inventory movement not found',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryMovementDto,
  ) {
    return this.inventoryMovementsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an inventory movement' })
  @ApiResponse({
    status: 200,
    description: 'Inventory movement deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Inventory movement not found',
  })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.inventoryMovementsService.remove(user.id, id);
  }
}
