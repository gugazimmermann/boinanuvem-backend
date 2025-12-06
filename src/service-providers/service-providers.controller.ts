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
import { ServiceProvidersService } from './service-providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateServiceProviderDto,
  UpdateServiceProviderDto,
  ServiceProviderResponseDto,
} from './dto';

@ApiTags('Service Providers')
@Controller('service-providers')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ServiceProvidersController {
  constructor(private serviceProvidersService: ServiceProvidersService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProvider',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new service provider' })
  @ApiResponse({
    status: 201,
    description: 'Service provider created successfully',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 409,
    description: 'Service provider code already exists',
  })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createServiceProviderDto: CreateServiceProviderDto,
  ) {
    return this.serviceProvidersService.create(
      user.id,
      createServiceProviderDto,
    );
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProvider',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all service providers for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Service providers retrieved successfully',
    type: [ServiceProviderResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.serviceProvidersService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProvider',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a service provider by ID' })
  @ApiResponse({
    status: 200,
    description: 'Service provider retrieved successfully',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.serviceProvidersService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProvider',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a service provider' })
  @ApiResponse({
    status: 200,
    description: 'Service provider updated successfully',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  @ApiResponse({
    status: 409,
    description: 'Service provider code already exists',
  })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateServiceProviderDto: UpdateServiceProviderDto,
  ) {
    return this.serviceProvidersService.update(
      user.id,
      id,
      updateServiceProviderDto,
    );
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'serviceProvider',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a service provider' })
  @ApiResponse({
    status: 200,
    description: 'Service provider deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.serviceProvidersService.remove(user.id, id);
  }
}
