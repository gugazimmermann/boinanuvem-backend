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
import { DeathsService } from './deaths.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateDeathDto, UpdateDeathDto, DeathResponseDto } from './dto';

@ApiTags('Deaths')
@Controller('deaths')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DeathsController {
  constructor(private deathsService: DeathsService) {}

  @Post()
  @RequirePermissions({
    section: 'records',
    resource: 'deaths',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new death record' })
  @ApiResponse({
    status: 201,
    description: 'Death record created successfully',
    type: DeathResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 409,
    description: 'Animal already has a death record',
  })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createDeathDto: CreateDeathDto,
  ) {
    return this.deathsService.create(user.id, createDeathDto);
  }

  @Get()
  @RequirePermissions({
    section: 'records',
    resource: 'deaths',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all death records for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Death records retrieved successfully',
    type: [DeathResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.deathsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'deaths',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a death record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Death record retrieved successfully',
    type: DeathResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Death record not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.deathsService.findOne(user.id, id);
  }

  @Get('animal/:animalId')
  @RequirePermissions({
    section: 'records',
    resource: 'deaths',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a death record by animal ID' })
  @ApiResponse({
    status: 200,
    description: 'Death record retrieved successfully',
    type: DeathResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Death record not found' })
  async findByAnimalId(
    @GetCurrentUser() user: CurrentUser,
    @Param('animalId') animalId: string,
  ) {
    return this.deathsService.findByAnimalId(user.id, animalId);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'deaths',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a death record' })
  @ApiResponse({
    status: 200,
    description: 'Death record updated successfully',
    type: DeathResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Death record not found' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDeathDto: UpdateDeathDto,
  ) {
    return this.deathsService.update(user.id, id, updateDeathDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'records',
    resource: 'deaths',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a death record' })
  @ApiResponse({
    status: 200,
    description: 'Death record deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Death record not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.deathsService.remove(user.id, id);
  }
}
