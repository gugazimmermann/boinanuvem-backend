import {
  Controller,
  Get,
  Post,
  Put,
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
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireMainUser } from '../auth/decorators/permissions.decorator';
import { RegisterCompanyDto, UpdateCompanyDto } from './dto';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(ThrottlerGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new company with main user' })
  @ApiResponse({ status: 201, description: 'Company registered successfully' })
  @ApiResponse({ status: 409, description: 'Company or user already exists' })
  async registerCompany(@Body() registerCompanyDto: RegisterCompanyDto) {
    return this.companiesService.registerCompany(registerCompanyDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company details' })
  @ApiResponse({
    status: 200,
    description: 'Company details retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompany(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.companiesService.getCompany(id, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireMainUser()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company details (main user only)' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - main user required',
  })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateCompany(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.companiesService.updateCompany(id, updateCompanyDto, user.id);
  }
}
