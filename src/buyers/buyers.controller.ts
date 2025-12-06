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
import { BuyersService } from './buyers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateBuyerDto, UpdateBuyerDto, BuyerResponseDto } from './dto';

@ApiTags('Buyers')
@Controller('buyers')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BuyersController {
  constructor(private buyersService: BuyersService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'buyer',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new buyer' })
  @ApiResponse({
    status: 201,
    description: 'Buyer created successfully',
    type: BuyerResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Buyer code already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createBuyerDto: CreateBuyerDto,
  ) {
    return this.buyersService.create(user.id, createBuyerDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'buyer',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all buyers for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Buyers retrieved successfully',
    type: [BuyerResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.buyersService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'buyer',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get a buyer by ID' })
  @ApiResponse({
    status: 200,
    description: 'Buyer retrieved successfully',
    type: BuyerResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Buyer not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.buyersService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'buyer',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update a buyer' })
  @ApiResponse({
    status: 200,
    description: 'Buyer updated successfully',
    type: BuyerResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Buyer not found' })
  @ApiResponse({ status: 409, description: 'Buyer code already exists' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateBuyerDto: UpdateBuyerDto,
  ) {
    return this.buyersService.update(user.id, id, updateBuyerDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'buyer',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a buyer' })
  @ApiResponse({
    status: 200,
    description: 'Buyer deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Buyer not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.buyersService.remove(user.id, id);
  }
}
