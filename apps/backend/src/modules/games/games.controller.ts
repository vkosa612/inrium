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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPublic } from '../auth/types/auth-response.type';
import { ApplyGameDto } from './dto/apply-game.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { GameQueryDto } from './dto/game-query.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { GamesService } from './games.service';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List public games' })
  list(@Query() query: GameQueryDto) {
    return this.gamesService.list(query);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.GAME_MASTER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create game session' })
  create(@Body() dto: CreateGameDto, @CurrentUser() user: UserPublic) {
    return this.gamesService.create(dto, user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.GAME_MASTER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update game (owner or admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGameDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.gamesService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.GAME_MASTER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipResponseWrap()
  @ApiOperation({ summary: 'Delete game (owner or admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: UserPublic) {
    return this.gamesService.remove(id, user);
  }

  @Post(':id/apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to join a game' })
  apply(
    @Param('id') id: string,
    @Body() dto: ApplyGameDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.gamesService.apply(id, user, dto);
  }

  @Patch(':id/applications/:appId/approve')
  @ApiBearerAuth()
  @Roles(UserRole.GAME_MASTER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve application' })
  approve(
    @Param('id') id: string,
    @Param('appId') appId: string,
    @CurrentUser() user: UserPublic,
  ) {
    return this.gamesService.updateApplication(id, appId, 'approve', user);
  }

  @Patch(':id/applications/:appId/reject')
  @ApiBearerAuth()
  @Roles(UserRole.GAME_MASTER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject application' })
  reject(
    @Param('id') id: string,
    @Param('appId') appId: string,
    @CurrentUser() user: UserPublic,
  ) {
    return this.gamesService.updateApplication(id, appId, 'reject', user);
  }

  @Patch(':id/applications/:appId/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel own application' })
  cancel(
    @Param('id') id: string,
    @Param('appId') appId: string,
    @CurrentUser() user: UserPublic,
  ) {
    return this.gamesService.updateApplication(id, appId, 'cancel', user);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get game by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.gamesService.findBySlug(slug);
  }
}
