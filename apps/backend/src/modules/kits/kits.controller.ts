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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipResponseWrap } from '../../common/decorators/skip-response-wrap.decorator';
import { KitsService } from './kits.service';
import { CreateKitDto } from './dto/create-kit.dto';
import { UpdateKitDto } from './dto/update-kit.dto';
import { AdminKitQueryDto, KitQueryDto } from './dto/kit-query.dto';

@ApiTags('kits')
@Controller('kits')
export class KitsController {
  constructor(private readonly kitsService: KitsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published kits' })
  list(@Query() query: KitQueryDto) {
    return this.kitsService.list(query);
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Admin: list all kits (any status)' })
  adminList(@Query() query: AdminKitQueryDto) {
    return this.kitsService.adminList(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Admin: get kit by ID (any status)' })
  findByIdAdmin(@Param('id') id: string) {
    return this.kitsService.findByIdAdmin(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create kit' })
  create(@Body() dto: CreateKitDto) {
    return this.kitsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update kit' })
  update(@Param('id') id: string, @Body() dto: UpdateKitDto) {
    return this.kitsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipResponseWrap()
  @ApiOperation({ summary: 'Delete kit' })
  remove(@Param('id') id: string) {
    return this.kitsService.remove(id);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get published kit by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.kitsService.findBySlug(slug);
  }
}
