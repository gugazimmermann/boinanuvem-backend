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
import { BuyerObservationsService } from './buyer-observations.service';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateBuyerObservationDto,
  UpdateBuyerObservationDto,
  BuyerObservationResponseDto,
} from './dto';
import {
  ACCESS_DENIED_RESPONSE,
  OBSERVATION_DELETED_SUCCESS_RESPONSE,
  OBSERVATION_NOT_FOUND_RESPONSE,
  UseObservationGuards,
} from '../common/observations/observation-controller-helpers';

@ApiTags('Buyer Observations')
@Controller()
@UseObservationGuards()
@ApiBearerAuth()
export class BuyerObservationsController {
  constructor(private buyerObservationsService: BuyerObservationsService) {}

  @Post('buyers/:buyerId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'buyers',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new observation for a buyer' })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: BuyerObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Buyer not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Param('buyerId') buyerId: string,
    @Body() createDto: CreateBuyerObservationDto,
  ) {
    return this.buyerObservationsService.create(user.id, buyerId, createDto);
  }

  @Get('buyers/:buyerId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'buyers',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for a buyer',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [BuyerObservationResponseDto],
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Buyer not found' })
  async findAllByBuyerId(
    @GetCurrentUser() user: CurrentUser,
    @Param('buyerId') buyerId: string,
  ) {
    return this.buyerObservationsService.findAllByBuyerId(user.id, buyerId);
  }

  @Get('buyer-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'buyers',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: BuyerObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.buyerObservationsService.findOne(user.id, id);
  }

  @Put('buyer-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'buyers',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: BuyerObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateBuyerObservationDto,
  ) {
    return this.buyerObservationsService.update(user.id, id, updateDto);
  }

  @Delete('buyer-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'buyers',
    action: 'edit',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an observation' })
  @ApiResponse(OBSERVATION_DELETED_SUCCESS_RESPONSE)
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.buyerObservationsService.remove(user.id, id);
  }
}
