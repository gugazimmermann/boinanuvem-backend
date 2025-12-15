import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AnimalMovementsService } from './animal-movements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAnimalMovementDto, AnimalMovementResponseDto } from './dto';

@ApiTags('Animal Movements')
@Controller('animal-movements')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AnimalMovementsController {
  constructor(private animalMovementsService: AnimalMovementsService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new animal movement' })
  @ApiResponse({
    status: 201,
    description: 'Animal movement created successfully',
    type: AnimalMovementResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateAnimalMovementDto,
  ) {
    return this.animalMovementsService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all animal movements for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Animal movements retrieved successfully',
    type: [AnimalMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAllForCompany(@GetCurrentUser() user: CurrentUser) {
    return this.animalMovementsService.findAllForCompany(user.id);
  }

  @Get('animal/:animalId')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get animal movements by animal ID' })
  @ApiResponse({
    status: 200,
    description: 'Animal movements retrieved successfully',
    type: [AnimalMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async findByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.animalMovementsService.findByAnimalId(user.id, animalId);
  }

  @Get('location/:locationId')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get animal movements by location ID' })
  @ApiResponse({
    status: 200,
    description: 'Animal movements retrieved successfully',
    type: [AnimalMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findByLocationId(
    @GetCurrentUser() user: CurrentUser,
    @Param('locationId') locationId: string,
  ) {
    return this.animalMovementsService.findByLocationId(user.id, locationId);
  }

  @Get('property/:propertyId')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get animal movements by property ID' })
  @ApiResponse({
    status: 200,
    description: 'Animal movements retrieved successfully',
    type: [AnimalMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findByPropertyId(
    @GetCurrentUser() user: CurrentUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.animalMovementsService.findByPropertyId(user.id, propertyId);
  }

  @Get('employee/:employeeId')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get animal movements by employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Animal movements retrieved successfully',
    type: [AnimalMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findByEmployeeId(
    @GetCurrentUser() user: CurrentUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.animalMovementsService.findByEmployeeId(user.id, employeeId);
  }

  @Get('service-provider/:serviceProviderId')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get animal movements by service provider ID' })
  @ApiResponse({
    status: 200,
    description: 'Animal movements retrieved successfully',
    type: [AnimalMovementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async findByServiceProviderId(
    @GetCurrentUser() user: CurrentUser,
    @Param('serviceProviderId') serviceProviderId: string,
  ) {
    return this.animalMovementsService.findByServiceProviderId(
      user.id,
      serviceProviderId,
    );
  }

  @Get('last-location/:locationId/animals')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({
    summary:
      'Get animal IDs whose last recorded movement is to the specified location',
  })
  @ApiResponse({
    status: 200,
    description: 'Animal IDs retrieved successfully',
    type: [String],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findAnimalsByLastMovementLocation(
    @GetCurrentUser() user: CurrentUser,
    @Param('locationId') locationId: string,
  ) {
    return this.animalMovementsService.findAnimalsByLastMovementLocation(
      user.id,
      locationId,
    );
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an animal movement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Animal movement retrieved successfully',
    type: AnimalMovementResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal movement not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.animalMovementsService.findOne(user.id, id);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an animal movement' })
  @ApiResponse({
    status: 200,
    description: 'Animal movement deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal movement not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    await this.animalMovementsService.remove(user.id, id);
  }
}
