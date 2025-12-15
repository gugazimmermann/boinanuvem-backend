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
import { LocationObservationsService } from './location-observations.service';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateLocationObservationDto,
  UpdateLocationObservationDto,
  LocationObservationResponseDto,
} from './dto';
import {
  ACCESS_DENIED_RESPONSE,
  OBSERVATION_DELETED_SUCCESS_RESPONSE,
  OBSERVATION_NOT_FOUND_RESPONSE,
  UseObservationGuards,
} from '../common/observations/observation-controller-helpers';

@ApiTags('Location Observations')
@Controller()
@UseObservationGuards()
@ApiBearerAuth()
export class LocationObservationsController {
  constructor(
    private locationObservationsService: LocationObservationsService,
  ) {}

  @Post('locations/:locationId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'locations',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new observation for a location' })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: LocationObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Location not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Param('locationId') locationId: string,
    @Body() createDto: CreateLocationObservationDto,
  ) {
    return this.locationObservationsService.create(
      user.id,
      locationId,
      createDto,
    );
  }

  @Get('locations/:locationId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'locations',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for a location',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [LocationObservationResponseDto],
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findAllByLocationId(
    @GetCurrentUser() user: CurrentUser,
    @Param('locationId') locationId: string,
  ) {
    return this.locationObservationsService.findAllByLocationId(
      user.id,
      locationId,
    );
  }

  @Get('location-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'locations',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: LocationObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.locationObservationsService.findOne(user.id, id);
  }

  @Put('location-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'locations',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: LocationObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateLocationObservationDto,
  ) {
    return this.locationObservationsService.update(user.id, id, updateDto);
  }

  @Delete('location-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'locations',
    action: 'edit',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an observation' })
  @ApiResponse(OBSERVATION_DELETED_SUCCESS_RESPONSE)
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.locationObservationsService.remove(user.id, id);
  }
}
