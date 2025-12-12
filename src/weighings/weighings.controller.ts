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
import { WeighingsService } from './weighings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateWeighingDto,
  UpdateWeighingDto,
  WeighingResponseDto,
} from './dto';

@ApiTags('Weighings')
@Controller('weighings')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WeighingsController {
  constructor(private weighingsService: WeighingsService) {}

  @Post()
  @RequirePermissions({
    section: 'records',
    resource: 'weighings',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new weighing record' })
  @ApiResponse({
    status: 201,
    description: 'Weighing record created successfully',
    type: WeighingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createWeighingDto: CreateWeighingDto,
  ) {
    return this.weighingsService.create(user.id, createWeighingDto);
  }

  @Get()
  @RequirePermissions({
    section: 'records',
    resource: 'weighings',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all weighing records for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Weighing records retrieved successfully',
    type: [WeighingResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.weighingsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'weighings',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a weighing record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Weighing record retrieved successfully',
    type: WeighingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Weighing record not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.weighingsService.findOne(user.id, id);
  }

  @Get('animal/:animalId')
  @RequirePermissions({
    section: 'records',
    resource: 'weighings',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get weighing records by animal ID' })
  @ApiResponse({
    status: 200,
    description: 'Weighing records retrieved successfully',
    type: [WeighingResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async findByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.weighingsService.findByAnimalId(user.id, animalId);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'weighings',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a weighing record' })
  @ApiResponse({
    status: 200,
    description: 'Weighing record updated successfully',
    type: WeighingResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Weighing record not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateWeighingDto: UpdateWeighingDto,
  ) {
    return this.weighingsService.update(user.id, id, updateWeighingDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'weighings',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a weighing record' })
  @ApiResponse({
    status: 200,
    description: 'Weighing record deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Weighing record not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.weighingsService.remove(user.id, id);
  }
}
