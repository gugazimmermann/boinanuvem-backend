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
import { BirthsService } from './births.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateBirthDto, UpdateBirthDto, BirthResponseDto } from './dto';

@ApiTags('Births')
@Controller('births')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BirthsController {
  constructor(private birthsService: BirthsService) {}

  @Post()
  @RequirePermissions({
    section: 'records',
    resource: 'birth',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new birth record and animal' })
  @ApiResponse({
    status: 201,
    description: 'Birth record created successfully',
    type: BirthResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Animal code already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createBirthDto: CreateBirthDto,
  ) {
    return this.birthsService.create(user.id, createBirthDto);
  }

  @Get()
  @RequirePermissions({
    section: 'records',
    resource: 'birth',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all birth records for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Birth records retrieved successfully',
    type: [BirthResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.birthsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'birth',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a birth record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Birth record retrieved successfully',
    type: BirthResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Birth record not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.birthsService.findOne(user.id, id);
  }

  @Get('animal/:animalId')
  @RequirePermissions({
    section: 'records',
    resource: 'birth',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a birth record by animal ID' })
  @ApiResponse({
    status: 200,
    description: 'Birth record retrieved successfully',
    type: BirthResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Birth record not found' })
  async findByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.birthsService.findByAnimalId(user.id, animalId);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'birth',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a birth record' })
  @ApiResponse({
    status: 200,
    description: 'Birth record updated successfully',
    type: BirthResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Birth record not found' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateBirthDto: UpdateBirthDto,
  ) {
    return this.birthsService.update(user.id, id, updateBirthDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'birth',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a birth record' })
  @ApiResponse({
    status: 200,
    description: 'Birth record deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Birth record not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.birthsService.remove(user.id, id);
  }
}
