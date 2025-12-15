import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LocationMovementsService } from './location-movements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateLocationMovementDto,
  UpdateLocationMovementDto,
  LocationMovementResponseDto,
  LocationMovementType,
} from './dto';

@ApiTags('Location Movements')
@Controller('location-movements')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LocationMovementsController {
  constructor(private locationMovementsService: LocationMovementsService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new location movement' })
  @ApiResponse({
    status: 201,
    description: 'Location movement created successfully',
    type: LocationMovementResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateLocationMovementDto,
  ) {
    return this.locationMovementsService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all location movements for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Location movements retrieved successfully',
    type: [LocationMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAllForCompany(@GetCurrentUser() user: CurrentUser) {
    return this.locationMovementsService.findAllForCompany(user.id);
  }

  @Get('location/:locationId')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get location movements by location ID' })
  @ApiResponse({
    status: 200,
    description: 'Location movements retrieved successfully',
    type: [LocationMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findByLocationId(
    @GetCurrentUser() user: CurrentUser,
    @Param('locationId') locationId: string,
  ) {
    return this.locationMovementsService.findByLocationId(user.id, locationId);
  }

  @Get('property/:propertyId')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get location movements by property ID' })
  @ApiResponse({
    status: 200,
    description: 'Location movements retrieved successfully',
    type: [LocationMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findByPropertyId(
    @GetCurrentUser() user: CurrentUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.locationMovementsService.findByPropertyId(user.id, propertyId);
  }

  @Get('employee/:employeeId')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get location movements by employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Location movements retrieved successfully',
    type: [LocationMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findByEmployeeId(
    @GetCurrentUser() user: CurrentUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.locationMovementsService.findByEmployeeId(user.id, employeeId);
  }

  @Get('service-provider/:serviceProviderId')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get location movements by service provider ID' })
  @ApiResponse({
    status: 200,
    description: 'Location movements retrieved successfully',
    type: [LocationMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async findByServiceProviderId(
    @GetCurrentUser() user: CurrentUser,
    @Param('serviceProviderId') serviceProviderId: string,
  ) {
    return this.locationMovementsService.findByServiceProviderId(
      user.id,
      serviceProviderId,
    );
  }

  @Get('type/:type')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get location movements by type' })
  @ApiResponse({
    status: 200,
    description: 'Location movements retrieved successfully',
    type: [LocationMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findByType(
    @GetCurrentUser() user: CurrentUser,
    @Param('type') type: LocationMovementType,
  ) {
    return this.locationMovementsService.findByType(user.id, type);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a location movement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Location movement retrieved successfully',
    type: LocationMovementResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location movement not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.locationMovementsService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a location movement' })
  @ApiResponse({
    status: 200,
    description: 'Location movement updated successfully',
    type: LocationMovementResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location movement not found' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateLocationMovementDto,
  ) {
    return this.locationMovementsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'location',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a location movement' })
  @ApiResponse({
    status: 200,
    description: 'Location movement deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location movement not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    await this.locationMovementsService.remove(user.id, id);
  }
}
