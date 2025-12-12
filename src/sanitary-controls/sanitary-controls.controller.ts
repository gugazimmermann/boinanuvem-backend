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
import { SanitaryControlsService } from './sanitary-controls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateSanitaryControlDto,
  UpdateSanitaryControlDto,
  SanitaryControlResponseDto,
} from './dto';

@ApiTags('Sanitary Controls')
@Controller('sanitary-controls')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SanitaryControlsController {
  constructor(private sanitaryControlsService: SanitaryControlsService) {}

  @Post()
  @RequirePermissions({
    section: 'records',
    resource: 'health',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new sanitary control record' })
  @ApiResponse({
    status: 201,
    description: 'Sanitary control record created successfully',
    type: SanitaryControlResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDto: CreateSanitaryControlDto,
  ) {
    return this.sanitaryControlsService.create(user.id, createDto);
  }

  @Get()
  @RequirePermissions({
    section: 'records',
    resource: 'health',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all sanitary control records for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Sanitary control records retrieved successfully',
    type: [SanitaryControlResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.sanitaryControlsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'health',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a sanitary control record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Sanitary control record retrieved successfully',
    type: SanitaryControlResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Sanitary control record not found',
  })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.sanitaryControlsService.findOne(user.id, id);
  }

  @Get('animal/:animalId')
  @RequirePermissions({
    section: 'records',
    resource: 'health',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get sanitary control records by animal ID' })
  @ApiResponse({
    status: 200,
    description: 'Sanitary control records retrieved successfully',
    type: [SanitaryControlResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async findByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.sanitaryControlsService.findByAnimalId(user.id, animalId);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'health',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a sanitary control record' })
  @ApiResponse({
    status: 200,
    description: 'Sanitary control record updated successfully',
    type: SanitaryControlResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Sanitary control record not found',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateSanitaryControlDto,
  ) {
    return this.sanitaryControlsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'health',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a sanitary control record' })
  @ApiResponse({
    status: 200,
    description: 'Sanitary control record deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 404,
    description: 'Sanitary control record not found',
  })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.sanitaryControlsService.remove(user.id, id);
  }
}
