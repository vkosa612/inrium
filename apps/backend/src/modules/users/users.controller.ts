import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserPublic } from '../auth/types/auth-response.type';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { AdminUpdateRoleDto } from './dto/admin-update-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (displayName, bio, avatarUrl)' })
  updateMe(@CurrentUser() user: UserPublic, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change password and revoke all refresh sessions' })
  changePassword(@CurrentUser() user: UserPublic, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('me/delete-account')
  @ApiOperation({ summary: 'Permanently delete own account (hard delete)' })
  deleteAccount(@CurrentUser() user: UserPublic, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: list users' })
  adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.adminList(
      Math.max(1, parseInt(page ?? '1', 10) || 1),
      Math.min(100, parseInt(limit ?? '20', 10) || 20),
      search,
    );
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: update user role' })
  adminUpdateRole(@Param('id') id: string, @Body() dto: AdminUpdateRoleDto) {
    return this.usersService.adminUpdateRole(id, dto.role);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Public user profile (no email)' })
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
