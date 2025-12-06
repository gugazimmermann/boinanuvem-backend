import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateLocationDto,
  UpdateLocationDto,
  LocationResponseDto,
} from './dto';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({
    status: 201,
    description: 'Location created successfully',
    type: LocationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiResponse({ status: 409, description: 'Location code already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createLocationDto: CreateLocationDto,
  ) {
    return this.locationsService.create(user.id, createLocationDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({ summary: "Get all locations for the current user's company" })
  @ApiResponse({
    status: 200,
    description: 'Locations retrieved successfully',
    type: [LocationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(
    @GetCurrentUser() user: CurrentUser,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.locationsService.findAll(user.id, propertyId);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a location by ID' })
  @ApiResponse({
    status: 200,
    description: 'Location retrieved successfully',
    type: LocationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.locationsService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a location' })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
    type: LocationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ApiResponse({ status: 409, description: 'Location code already exists' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(user.id, id, updateLocationDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a location' })
  @ApiResponse({
    status: 200,
    description: 'Location deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.locationsService.remove(user.id, id);
  }
}
