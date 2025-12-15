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
import { ServiceProviderObservationsService } from './service-provider-observations.service';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateServiceProviderObservationDto,
  UpdateServiceProviderObservationDto,
  ServiceProviderObservationResponseDto,
} from './dto';
import {
  ACCESS_DENIED_RESPONSE,
  OBSERVATION_DELETED_SUCCESS_RESPONSE,
  OBSERVATION_NOT_FOUND_RESPONSE,
  UseObservationGuards,
} from '../common/observations/observation-controller-helpers';

@ApiTags('Service Provider Observations')
@Controller()
@UseObservationGuards()
@ApiBearerAuth()
export class ServiceProviderObservationsController {
  constructor(
    private serviceProviderObservationsService: ServiceProviderObservationsService,
  ) {}

  @Post('service-providers/:serviceProviderId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProviders',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new observation for a service provider' })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: ServiceProviderObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Param('serviceProviderId') serviceProviderId: string,
    @Body() createDto: CreateServiceProviderObservationDto,
  ) {
    return this.serviceProviderObservationsService.create(
      user.id,
      serviceProviderId,
      createDto,
    );
  }

  @Get('service-providers/:serviceProviderId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProviders',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for a service provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [ServiceProviderObservationResponseDto],
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async findAllByServiceProviderId(
    @GetCurrentUser() user: CurrentUser,
    @Param('serviceProviderId') serviceProviderId: string,
  ) {
    return this.serviceProviderObservationsService.findAllByServiceProviderId(
      user.id,
      serviceProviderId,
    );
  }

  @Get('service-provider-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProviders',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: ServiceProviderObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.serviceProviderObservationsService.findOne(user.id, id);
  }

  @Put('service-provider-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProviders',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: ServiceProviderObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceProviderObservationDto,
  ) {
    return this.serviceProviderObservationsService.update(
      user.id,
      id,
      updateDto,
    );
  }

  @Delete('service-provider-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProviders',
    action: 'edit',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an observation' })
  @ApiResponse(OBSERVATION_DELETED_SUCCESS_RESPONSE)
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.serviceProviderObservationsService.remove(user.id, id);
  }
}
