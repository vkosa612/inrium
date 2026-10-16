import { Controller, Get, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPublic } from '../auth/types/auth-response.type';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Агреговані лічильники для адмін-панелі (кількість користувачів — лише для ADMIN)' })
  stats(@CurrentUser() user: UserPublic) {
    return this.adminService.getStats(user.role);
  }
}
