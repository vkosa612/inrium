import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateHomeBlockDto } from './dto/update-home-block.dto';

@Injectable()
export class HomeBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic() {
    return this.prisma.homePageBlock.findMany({
      where: { enabled: true },
      orderBy: { position: 'asc' },
    });
  }

  async adminList() {
    return this.prisma.homePageBlock.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async update(id: string, dto: UpdateHomeBlockDto) {
    const block = await this.prisma.homePageBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('Home block not found');

    return this.prisma.homePageBlock.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.subtitle !== undefined && { subtitle: dto.subtitle }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
    });
  }
}
