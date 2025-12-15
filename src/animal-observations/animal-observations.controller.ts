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
import { AnimalObservationsService } from './animal-observations.service';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAnimalObservationDto,
  UpdateAnimalObservationDto,
  AnimalObservationResponseDto,
} from './dto';
import {
  ACCESS_DENIED_RESPONSE,
  OBSERVATION_DELETED_SUCCESS_RESPONSE,
  OBSERVATION_NOT_FOUND_RESPONSE,
  UseObservationGuards,
} from '../common/observations/observation-controller-helpers';

@ApiTags('Animal Observations')
@Controller()
@UseObservationGuards()
@ApiBearerAuth()
export class AnimalObservationsController {
  constructor(private animalObservationsService: AnimalObservationsService) {}

  @Post('animals/:animalId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new observation for an animal' })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: AnimalObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
    @Body() createDto: CreateAnimalObservationDto,
  ) {
    return this.animalObservationsService.create(user.id, animalId, createDto);
  }

  @Get('animals/:animalId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for an animal',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [AnimalObservationResponseDto],
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async findAllByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.animalObservationsService.findAllByAnimalId(user.id, animalId);
  }

  @Get('animal-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: AnimalObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.animalObservationsService.findOne(user.id, id);
  }

  @Put('animal-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: AnimalObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateAnimalObservationDto,
  ) {
    return this.animalObservationsService.update(user.id, id, updateDto);
  }

  @Delete('animal-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'animals',
    action: 'edit',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an observation' })
  @ApiResponse(OBSERVATION_DELETED_SUCCESS_RESPONSE)
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.animalObservationsService.remove(user.id, id);
  }
}
