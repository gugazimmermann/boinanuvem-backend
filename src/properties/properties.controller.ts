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
import { PropertiesService } from './properties.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyResponseDto,
} from './dto';

@ApiTags('Properties')
@Controller('properties')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'property',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new property' })
  @ApiResponse({
    status: 201,
    description: 'Property created successfully',
    type: PropertyResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Property code already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createPropertyDto: CreatePropertyDto,
  ) {
    return this.propertiesService.create(user.id, createPropertyDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'property',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all properties for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Properties retrieved successfully',
    type: [PropertyResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.propertiesService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'property',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a property by ID' })
  @ApiResponse({
    status: 200,
    description: 'Property retrieved successfully',
    type: PropertyResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.propertiesService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'property',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a property' })
  @ApiResponse({
    status: 200,
    description: 'Property updated successfully',
    type: PropertyResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiResponse({ status: 409, description: 'Property code already exists' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(user.id, id, updatePropertyDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'property',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a property' })
  @ApiResponse({
    status: 200,
    description: 'Property deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.propertiesService.remove(user.id, id);
  }
}
