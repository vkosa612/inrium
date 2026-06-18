import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateHomeBlockDto } from './dto/update-home-block.dto';
import { HomeBlocksService } from './home-blocks.service';

@ApiTags('home-blocks')
@Controller('home-blocks')
export class HomeBlocksController {
  constructor(private readonly homeBlocksService: HomeBlocksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List enabled homepage blocks' })
  listPublic() {
    return this.homeBlocksService.listPublic();
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Admin: list all homepage blocks' })
  adminList() {
    return this.homeBlocksService.adminList();
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update homepage block' })
  update(@Param('id') id: string, @Body() dto: UpdateHomeBlockDto) {
    return this.homeBlocksService.update(id, dto);
  }
}
