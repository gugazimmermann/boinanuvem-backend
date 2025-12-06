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
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
} from './dto';

@ApiTags('Employees')
@Controller('employees')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions({
    section: 'registration',
    resource: 'employee',
    action: 'add',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({
    status: 201,
    description: 'Employee created successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Employee code already exists' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(user.id, createEmployeeDto);
  }

  @Get()
  @RequirePermissions({
    section: 'registration',
    resource: 'employee',
    action: 'view',
  })
  @ApiOperation({
    summary: "Get all employees for the current user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
    type: [EmployeeResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.employeesService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'employee',
    action: 'view',
  })
  @ApiOperation({ summary: 'Get an employee by ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee retrieved successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findOne(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.employeesService.findOne(user.id, id);
  }

  @Put(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'employee',
    action: 'edit',
  })
  @ApiOperation({ summary: 'Update an employee' })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 409, description: 'Employee code already exists' })
  async update(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(user.id, id, updateEmployeeDto);
  }

  @Delete(':id')
  @RequirePermissions({
    section: 'registration',
    resource: 'employee',
    action: 'remove',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an employee' })
  @ApiResponse({
    status: 200,
    description: 'Employee deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async remove(@GetCurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.employeesService.remove(user.id, id);
  }
}
