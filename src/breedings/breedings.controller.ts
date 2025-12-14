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
import { BreedingsService } from './breedings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateBreedingDto,
  UpdateBreedingDto,
  BreedingResponseDto,
  NextAttemptResponseDto,
  PregnantStatusResponseDto,
  PregnantAnimalsResponseDto,
} from './dto';

@ApiTags('Breedings')
@Controller('breedings')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BreedingsController {
  constructor(private breedingsService: BreedingsService) {}

  @Post()
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new breeding record' })
  @ApiResponse({
    status: 201,
    description: 'Breeding record created successfully',
    type: BreedingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateBreedingDto,
  ) {
    return this.breedingsService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all breeding records for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Breeding records retrieved successfully',
    type: [BreedingResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.breedingsService.findAll(user.id);
  }

  @Get('unconfirmed')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({
    summary:
      "Get all unconfirmed breeding records for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Unconfirmed breeding records retrieved successfully',
    type: [BreedingResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findUnconfirmed(@GetCurrentUser() user: CurrentUser) {
    return this.breedingsService.findUnconfirmed(user.id);
  }

  @Get('animal/:animalId')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get breeding records by animal ID' })
  @ApiResponse({
    status: 200,
    description: 'Breeding records retrieved successfully',
    type: [BreedingResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async findByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.breedingsService.findByAnimalId(user.id, animalId);
  }

  @Get('animal/:animalId/next-attempt')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({
    summary:
      'Get next attempt number for an animal (for artificial insemination)',
  })
  @ApiResponse({
    status: 200,
    description: 'Next attempt number calculated successfully',
    type: NextAttemptResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async getNextAttemptNumber(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.breedingsService.getNextAttemptNumber(user.id, animalId);
  }

  @Get('animal/:animalId/pregnant')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({ summary: 'Check if an animal is pregnant' })
  @ApiResponse({
    status: 200,
    description: 'Pregnancy status retrieved successfully',
    type: PregnantStatusResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async isAnimalPregnant(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.breedingsService.isAnimalPregnant(user.id, animalId);
  }

  @Get('animal/:animalId/most-recent-confirmed')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get the most recent confirmed breeding for an animal',
  })
  @ApiResponse({
    status: 200,
    description:
      'Most recent confirmed breeding retrieved successfully (returns null if no confirmed breeding exists)',
    type: BreedingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async getMostRecentConfirmedBreeding(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.breedingsService.getMostRecentConfirmedBreeding(
      user.id,
      animalId,
    );
  }

  @Get('property/:propertyId')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get breeding records by property ID' })
  @ApiResponse({
    status: 200,
    description: 'Breeding records retrieved successfully',
    type: [BreedingResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findByPropertyId(
    @GetCurrentUser() user: CurrentUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.breedingsService.findByPropertyId(user.id, propertyId);
  }

  @Get('property/:propertyId/pregnant')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get pregnant animal IDs for a property',
  })
  @ApiResponse({
    status: 200,
    description: 'Pregnant animal IDs retrieved successfully',
    type: PregnantAnimalsResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getPregnantAnimalsByProperty(
    @GetCurrentUser() user: CurrentUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.breedingsService.getPregnantAnimalsByProperty(
      user.id,
      propertyId,
    );
  }

  @Get(':id')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a breeding record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Breeding record retrieved successfully',
    type: BreedingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Breeding record not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.breedingsService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a breeding record' })
  @ApiResponse({
    status: 200,
    description: 'Breeding record updated successfully',
    type: BreedingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Breeding record not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateBreedingDto,
  ) {
    return this.breedingsService.update(user.id, id, updateDto);
  }

  @Put(':id/confirm')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Confirm a breeding record' })
  @ApiResponse({
    status: 200,
    description: 'Breeding record confirmed successfully',
    type: BreedingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Breeding record not found' })
  async confirm(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.breedingsService.confirm(user.id, id);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a breeding record' })
  @ApiResponse({
    status: 200,
    description: 'Breeding record deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Breeding record not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.breedingsService.remove(user.id, id);
  }

  @Put('animal/:animalId/unconfirm-most-recent')
  @RequirePermissions({
    section: 'breedings',
    resource: 'tracking',
    action: 'edit',
  })
  @ApiOperation({
    summary: 'Unconfirm the most recent confirmed breeding for an animal',
  })
  @ApiResponse({
    status: 200,
    description: 'Breeding record unconfirmed successfully',
    type: BreedingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal or breeding not found' })
  async unconfirmMostRecentBreeding(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.breedingsService.unconfirmMostRecentBreeding(user.id, animalId);
  }
}
