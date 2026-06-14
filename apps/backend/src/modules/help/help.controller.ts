import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { ContentService } from '../content/content.service';
import { ContentQueryDto } from '../content/dto/content-query.dto';

@ApiTags('help')
@Public()
@Controller('help')
export class HelpController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @ApiOperation({ summary: 'List all published help pages with optional filters' })
  async list(@Query() query: ContentQueryDto) {
    return this.contentService.list({
      ...query,
      type: ContentType.HELP_PAGE,
      limit: query.limit ?? 30,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single help page by slug' })
  async findBySlug(@Param('slug') slug: string) {
    const item = await this.contentService.findBySlug(slug);
    if (item.type !== ContentType.HELP_PAGE) {
      throw new NotFoundException(`Help page "${slug}" not found`);
    }
    return item;
  }
}
