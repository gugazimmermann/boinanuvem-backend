import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InventoryObservationsService } from './inventory-observations.service';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateInventoryObservationDto,
  UpdateInventoryObservationDto,
  InventoryObservationResponseDto,
} from './dto';
import {
  ACCESS_DENIED_RESPONSE,
  OBSERVATION_DELETED_SUCCESS_RESPONSE,
  OBSERVATION_NOT_FOUND_RESPONSE,
  UseObservationGuards,
} from '../common/observations/observation-controller-helpers';

@ApiTags('Inventory Observations')
@Controller()
@UseObservationGuards()
@ApiBearerAuth()
export class InventoryObservationsController {
  constructor(
    private inventoryObservationsService: InventoryObservationsService,
  ) {}

  @Post('inventory-items/:itemId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new observation for an inventory item' })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: InventoryObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Param('itemId') itemId: string,
    @Body() createDto: CreateInventoryObservationDto,
  ) {
    return this.inventoryObservationsService.create(user.id, itemId, createDto);
  }

  @Get('inventory-items/:itemId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for an inventory item',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [InventoryObservationResponseDto],
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async findAllByItemId(
    @GetCurrentUser() user: CurrentUser,
    @Param('itemId') itemId: string,
  ) {
    return this.inventoryObservationsService.findAllByItemId(user.id, itemId);
  }

  @Get('inventory-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: InventoryObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.inventoryObservationsService.findOne(user.id, id);
  }

  @Put('inventory-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: InventoryObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryObservationDto,
  ) {
    return this.inventoryObservationsService.update(user.id, id, updateDto);
  }

  @Delete('inventory-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'inventory',
    action: 'edit',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an observation' })
  @ApiResponse(OBSERVATION_DELETED_SUCCESS_RESPONSE)
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.inventoryObservationsService.remove(user.id, id);
  }
}
