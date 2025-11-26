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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireMainUser } from '../auth/decorators/permissions.decorator';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto } from './dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getCurrentUser(@GetCurrentUser() user: CurrentUser) {
    return this.usersService.getCurrentUser(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateCurrentUser(
    @GetCurrentUser() user: CurrentUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateCurrentUser(user.id, updateUserDto);
  }

  @Get()
  @RequireMainUser()
  @ApiOperation({ summary: 'Get team members (main user only)' })
  @ApiResponse({
    status: 200,
    description: 'Team members retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - main user required',
  })
  async getTeamMembers(@GetCurrentUser() user: CurrentUser) {
    return this.usersService.getTeamMembers(user.id);
  }

  @Post()
  @RequireMainUser()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create team member (main user only)' })
  @ApiResponse({ status: 201, description: 'Team member created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - main user required',
  })
  @ApiResponse({ status: 409, description: 'User with email already exists' })
  async createTeamMember(
    @GetCurrentUser() user: CurrentUser,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.createTeamMember(user.id, createUserDto);
  }

  @Put(':id')
  @RequireMainUser()
  @ApiOperation({ summary: 'Update team member (main user only)' })
  @ApiResponse({ status: 200, description: 'Team member updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - main user required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateTeamMember(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') targetUserId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateTeamMember(
      user.id,
      targetUserId,
      updateUserDto,
    );
  }

  @Put(':id/permissions')
  @RequireMainUser()
  @ApiOperation({ summary: 'Update user permissions (main user only)' })
  @ApiResponse({ status: 200, description: 'Permissions updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - main user required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserPermissions(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') targetUserId: string,
    @Body() permissions: UpdatePermissionsDto,
  ) {
    return this.usersService.updateUserPermissions(
      user.id,
      targetUserId,
      permissions,
    );
  }

  @Delete(':id')
  @RequireMainUser()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user (main user only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - main user required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivateUser(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') targetUserId: string,
  ) {
    return this.usersService.deactivateUser(user.id, targetUserId);
  }
}
