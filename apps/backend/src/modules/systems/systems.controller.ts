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
import { SystemsService } from './systems.service';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { AdminSystemQueryDto, SystemQueryDto } from './dto/system-query.dto';

@ApiTags('systems')
@Controller('systems')
export class SystemsController {
  constructor(private readonly systemsService: SystemsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published game systems' })
  list(@Query() query: SystemQueryDto) {
    return this.systemsService.list(query);
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Admin: list all systems (any status)' })
  adminList(@Query() query: AdminSystemQueryDto) {
    return this.systemsService.adminList(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Admin: get system by ID (any status)' })
  findByIdAdmin(@Param('id') id: string) {
    return this.systemsService.findByIdAdmin(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create game system' })
  create(@Body() dto: CreateSystemDto) {
    return this.systemsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update game system' })
  update(@Param('id') id: string, @Body() dto: UpdateSystemDto) {
    return this.systemsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipResponseWrap()
  @ApiOperation({ summary: 'Delete game system' })
  remove(@Param('id') id: string) {
    return this.systemsService.remove(id);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get published system by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.systemsService.findBySlug(slug);
  }
}
