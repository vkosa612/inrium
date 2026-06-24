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
import { SkipResponseWrap } from '../../common/decorators/skip-response-wrap.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CommunityQueryDto } from './dto/community-query.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { CommunitiesService } from './communities.service';

@ApiTags('communities')
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published communities' })
  list(@Query() query: CommunityQueryDto) {
    return this.communitiesService.list(query);
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: list all communities' })
  adminList() {
    return this.communitiesService.adminList();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get community by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.communitiesService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create community (ADMIN)' })
  create(@Body() dto: CreateCommunityDto) {
    return this.communitiesService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update community (ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateCommunityDto) {
    return this.communitiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipResponseWrap()
  @ApiOperation({ summary: 'Delete community (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.communitiesService.remove(id);
  }
}
