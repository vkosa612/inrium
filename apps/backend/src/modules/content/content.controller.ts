import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SkipResponseWrap } from '../../common/decorators/skip-response-wrap.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPublic } from '../auth/types/auth-response.type';
import { ContentService } from './content.service';
import { AdminContentQueryDto } from './dto/admin-content-query.dto';
import { ContentQueryDto } from './dto/content-query.dto';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ── Public reads (declared before parameterized routes) ─────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published content' })
  list(@Query() query: ContentQueryDto) {
    return this.contentService.list(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Featured published content' })
  featured() {
    return this.contentService.featured();
  }

  // ── Admin reads ─────────────────────────────────────────────────────────────

  @Get('admin/list')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Admin: list all content (any status)' })
  adminList(@Query() query: AdminContentQueryDto) {
    return this.contentService.adminList(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Admin: get content by ID (any status)' })
  findByIdAdmin(@Param('id') id: string) {
    return this.contentService.findByIdAdmin(id);
  }

  // ── CMS mutations ───────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create content item' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  create(
    @Body() dto: CreateContentDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.contentService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update content item' })
  update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipResponseWrap()
  @ApiOperation({ summary: 'Delete content item' })
  remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }

  // ── Public single (MUST be last — parameterized) ────────────────────────────

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get published content by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.contentService.findBySlug(slug);
  }
}
