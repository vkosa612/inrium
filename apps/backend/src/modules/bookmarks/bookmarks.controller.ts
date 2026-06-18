import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserPublic } from '../auth/types/auth-response.type';
import { BookmarksService } from './bookmarks.service';
import { CheckBookmarkQueryDto } from './dto/check-bookmark.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@ApiTags('bookmarks')
@ApiBearerAuth()
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'List current user bookmarks' })
  list(@CurrentUser() user: UserPublic) {
    return this.bookmarksService.list(user.id);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if target is bookmarked' })
  check(@CurrentUser() user: UserPublic, @Query() query: CheckBookmarkQueryDto) {
    return this.bookmarksService.check(user.id, query.targetType, query.targetId);
  }

  @Post()
  @ApiOperation({ summary: 'Add bookmark' })
  create(@CurrentUser() user: UserPublic, @Body() dto: CreateBookmarkDto) {
    return this.bookmarksService.create(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove bookmark by id' })
  remove(@CurrentUser() user: UserPublic, @Param('id') id: string) {
    return this.bookmarksService.remove(user.id, id);
  }
}
