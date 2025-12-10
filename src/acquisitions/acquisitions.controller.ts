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
import { AcquisitionsService } from './acquisitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAcquisitionDto,
  UpdateAcquisitionDto,
  AcquisitionResponseDto,
} from './dto';

@ApiTags('Acquisitions')
@Controller('acquisitions')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AcquisitionsController {
  constructor(private acquisitionsService: AcquisitionsService) {}

  @Post()
  @RequirePermissions({
    section: 'records',
    resource: 'acquisitions',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new acquisition record' })
  @ApiResponse({
    status: 201,
    description: 'Acquisition record created successfully',
    type: AcquisitionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Animal code already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createAcquisitionDto: CreateAcquisitionDto,
  ) {
    return this.acquisitionsService.create(user.id, createAcquisitionDto);
  }

  @Get()
  @RequirePermissions({
    section: 'records',
    resource: 'acquisitions',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all acquisition records for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Acquisition records retrieved successfully',
    type: [AcquisitionResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.acquisitionsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'acquisitions',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an acquisition record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Acquisition record retrieved successfully',
    type: AcquisitionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Acquisition record not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.acquisitionsService.findOne(user.id, id);
  }

  @Get('animal/:animalId')
  @RequirePermissions({
    section: 'records',
    resource: 'acquisitions',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an acquisition record by animal ID' })
  @ApiResponse({
    status: 200,
    description: 'Acquisition record retrieved successfully',
    type: AcquisitionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Acquisition record not found' })
  async findByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.acquisitionsService.findByAnimalId(user.id, animalId);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'acquisitions',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an acquisition record' })
  @ApiResponse({
    status: 200,
    description: 'Acquisition record updated successfully',
    type: AcquisitionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Acquisition record not found' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateAcquisitionDto: UpdateAcquisitionDto,
  ) {
    return this.acquisitionsService.update(user.id, id, updateAcquisitionDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'acquisitions',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an acquisition record' })
  @ApiResponse({
    status: 200,
    description: 'Acquisition record deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Acquisition record not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.acquisitionsService.remove(user.id, id);
  }
}
