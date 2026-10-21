import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HomeService } from './home.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('home')
@Public()
@Controller()
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('home')
  @ApiOperation({ summary: 'Aggregated homepage data (featured, news, articles, systems, stats)' })
  getHome() {
    return this.homeService.getHome();
  }

  @Get('search')
  @ApiOperation({ summary: 'Global search across content, help and systems' })
  search(@Query() query: SearchQueryDto) {
    return this.homeService.search(query.q ?? '');
  }

  @Get('sitemap')
  @ApiOperation({ summary: 'All published URLs for sitemap generation' })
  getSitemap() {
    return this.homeService.getSitemap();
  }
}
