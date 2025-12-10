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
import { AnimalsService } from './animals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAnimalDto, UpdateAnimalDto, AnimalResponseDto } from './dto';

@ApiTags('Animals')
@Controller('animals')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AnimalsController {
  constructor(private animalsService: AnimalsService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'animal',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new animal' })
  @ApiResponse({
    status: 201,
    description: 'Animal created successfully',
    type: AnimalResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Animal code already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createAnimalDto: CreateAnimalDto,
  ) {
    return this.animalsService.create(user.id, createAnimalDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'animal',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all animals for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Animals retrieved successfully',
    type: [AnimalResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.animalsService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'animal',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an animal by ID' })
  @ApiResponse({
    status: 200,
    description: 'Animal retrieved successfully',
    type: AnimalResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.animalsService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'animal',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an animal' })
  @ApiResponse({
    status: 200,
    description: 'Animal updated successfully',
    type: AnimalResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  @ApiResponse({ status: 409, description: 'Animal code already exists' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateAnimalDto: UpdateAnimalDto,
  ) {
    return this.animalsService.update(user.id, id, updateAnimalDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'animal',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an animal' })
  @ApiResponse({
    status: 200,
    description: 'Animal deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Animal not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.animalsService.remove(user.id, id);
  }
}
