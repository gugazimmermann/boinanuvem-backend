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
import { SupplierObservationsService } from './supplier-observations.service';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateSupplierObservationDto,
  UpdateSupplierObservationDto,
  SupplierObservationResponseDto,
} from './dto';
import {
  ACCESS_DENIED_RESPONSE,
  OBSERVATION_DELETED_SUCCESS_RESPONSE,
  OBSERVATION_NOT_FOUND_RESPONSE,
  UseObservationGuards,
} from '../common/observations/observation-controller-helpers';

@ApiTags('Supplier Observations')
@Controller()
@UseObservationGuards()
@ApiBearerAuth()
export class SupplierObservationsController {
  constructor(
    private supplierObservationsService: SupplierObservationsService,
  ) {}

  @Post('suppliers/:supplierId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'suppliers',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new observation for a supplier' })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: SupplierObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Param('supplierId') supplierId: string,
    @Body() createDto: CreateSupplierObservationDto,
  ) {
    return this.supplierObservationsService.create(
      user.id,
      supplierId,
      createDto,
    );
  }

  @Get('suppliers/:supplierId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'suppliers',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for a supplier',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [SupplierObservationResponseDto],
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findAllBySupplierId(
    @GetCurrentUser() user: CurrentUser,
    @Param('supplierId') supplierId: string,
  ) {
    return this.supplierObservationsService.findAllBySupplierId(
      user.id,
      supplierId,
    );
  }

  @Get('supplier-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'suppliers',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: SupplierObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.supplierObservationsService.findOne(user.id, id);
  }

  @Put('supplier-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'suppliers',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: SupplierObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateSupplierObservationDto,
  ) {
    return this.supplierObservationsService.update(user.id, id, updateDto);
  }

  @Delete('supplier-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'suppliers',
    action: 'edit',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an observation' })
  @ApiResponse(OBSERVATION_DELETED_SUCCESS_RESPONSE)
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.supplierObservationsService.remove(user.id, id);
  }
}
