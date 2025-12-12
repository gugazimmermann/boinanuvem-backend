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
import { InventoryItemsService } from './inventory-items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryItemResponseDto,
} from './dto';

@ApiTags('Inventory Items')
@Controller('inventory-items')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InventoryItemsController {
  constructor(private inventoryItemsService: InventoryItemsService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new inventory item' })
  @ApiResponse({
    status: 201,
    description: 'Inventory item created successfully',
    type: InventoryItemResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 409,
    description: 'Inventory item code already exists',
  })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateInventoryItemDto,
  ) {
    return this.inventoryItemsService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all inventory items for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory items retrieved successfully',
    type: [InventoryItemResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.inventoryItemsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an inventory item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Inventory item retrieved successfully',
    type: InventoryItemResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.inventoryItemsService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an inventory item' })
  @ApiResponse({
    status: 200,
    description: 'Inventory item updated successfully',
    type: InventoryItemResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  @ApiResponse({
    status: 409,
    description: 'Inventory item code already exists',
  })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryItemDto,
  ) {
    return this.inventoryItemsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an inventory item' })
  @ApiResponse({
    status: 200,
    description: 'Inventory item deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.inventoryItemsService.remove(user.id, id);
  }
}
