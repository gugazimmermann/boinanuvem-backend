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
import { EmployeeObservationsService } from './employee-observations.service';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateEmployeeObservationDto,
  UpdateEmployeeObservationDto,
  EmployeeObservationResponseDto,
} from './dto';
import {
  ACCESS_DENIED_RESPONSE,
  OBSERVATION_DELETED_SUCCESS_RESPONSE,
  OBSERVATION_NOT_FOUND_RESPONSE,
  UseObservationGuards,
} from '../common/observations/observation-controller-helpers';

@ApiTags('Employee Observations')
@Controller()
@UseObservationGuards()
@ApiBearerAuth()
export class EmployeeObservationsController {
  constructor(
    private employeeObservationsService: EmployeeObservationsService,
  ) {}

  @Post('employees/:employeeId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'employees',
    action: 'edit',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new observation for an employee' })
  @ApiResponse({
    status: 201,
    description: 'Observation created successfully',
    type: EmployeeObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Param('employeeId') employeeId: string,
    @Body() createDto: CreateEmployeeObservationDto,
  ) {
    return this.employeeObservationsService.create(
      user.id,
      employeeId,
      createDto,
    );
  }

  @Get('employees/:employeeId/observations')
  @RequirePermissions({
    section: 'registration',
    resource: 'employees',
    action: 'view',
  })
  @ApiOperation({
    summary: 'Get all observations for an employee',
  })
  @ApiResponse({
    status: 200,
    description: 'Observations retrieved successfully',
    type: [EmployeeObservationResponseDto],
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findAllByEmployeeId(
    @GetCurrentUser() user: CurrentUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employeeObservationsService.findAllByEmployeeId(
      user.id,
      employeeId,
    );
  }

  @Get('employee-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'employees',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an observation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Observation retrieved successfully',
    type: EmployeeObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.employeeObservationsService.findOne(user.id, id);
  }

  @Put('employee-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'employees',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an observation' })
  @ApiResponse({
    status: 200,
    description: 'Observation updated successfully',
    type: EmployeeObservationResponseDto,
  })
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeObservationDto,
  ) {
    return this.employeeObservationsService.update(user.id, id, updateDto);
  }

  @Delete('employee-observations/:id')
  @RequirePermissions({
    section: 'registration',
    resource: 'employees',
    action: 'edit',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an observation' })
  @ApiResponse(OBSERVATION_DELETED_SUCCESS_RESPONSE)
  @ApiResponse(ACCESS_DENIED_RESPONSE)
  @ApiResponse(OBSERVATION_NOT_FOUND_RESPONSE)
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.employeeObservationsService.remove(user.id, id);
  }
}
