import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '../content/utils/slug.util';
import type { CreateSystemDto } from './dto/create-system.dto';
import type { UpdateSystemDto } from './dto/update-system.dto';
import type { AdminSystemQueryDto, SystemQueryDto } from './dto/system-query.dto';

const SYSTEM_SELECT = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  complexity: true,
  genre: true,
  tags: true,
  imageUrl: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const SYSTEM_WITH_BODY = {
  ...SYSTEM_SELECT,
  description: true,
  kits: {
    where: { status: ContentStatus.PUBLISHED },
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      category: true,
      priceText: true,
      imageUrl: true,
    },
  },
} as const;

@Injectable()
export class SystemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SystemQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GameSystemWhereInput = {
      status: ContentStatus.PUBLISHED,
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.gameSystem.findMany({
        where,
        select: SYSTEM_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.gameSystem.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string) {
    const item = await this.prisma.gameSystem.findUnique({
      where: { slug, status: ContentStatus.PUBLISHED },
      select: SYSTEM_WITH_BODY,
    });
    if (!item) throw new NotFoundException(`System "${slug}" not found`);
    return item;
  }

  async adminList(query: AdminSystemQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GameSystemWhereInput = {
      ...(status && { status }),
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.gameSystem.findMany({
        where,
        select: SYSTEM_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.gameSystem.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdAdmin(id: string) {
    const item = await this.prisma.gameSystem.findUnique({
      where: { id },
      select: SYSTEM_WITH_BODY,
    });
    if (!item) throw new NotFoundException(`System "${id}" not found`);
    return item;
  }

  async create(dto: CreateSystemDto) {
    const slug = dto.slug?.trim() || generateSlug(dto.title);
    const existing = await this.prisma.gameSystem.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`);

    const status = dto.status ?? ContentStatus.DRAFT;
    return this.prisma.gameSystem.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        complexity: dto.complexity,
        genre: dto.genre,
        tags: dto.tags ?? [],
        imageUrl: dto.imageUrl,
        status,
        publishedAt: status === ContentStatus.PUBLISHED ? new Date() : undefined,
      },
      select: SYSTEM_WITH_BODY,
    });
  }

  async update(id: string, dto: UpdateSystemDto) {
    const existing = await this.prisma.gameSystem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`System "${id}" not found`);

    if (dto.slug && dto.slug !== existing.slug) {
      const conflict = await this.prisma.gameSystem.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    let publishedAt: Date | undefined;
    if (
      dto.status === ContentStatus.PUBLISHED &&
      existing.status !== ContentStatus.PUBLISHED &&
      !existing.publishedAt
    ) {
      publishedAt = new Date();
    }

    return this.prisma.gameSystem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.complexity !== undefined && { complexity: dto.complexity }),
        ...(dto.genre !== undefined && { genre: dto.genre }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(publishedAt && { publishedAt }),
      },
      select: SYSTEM_WITH_BODY,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.gameSystem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`System "${id}" not found`);
    await this.prisma.gameSystem.delete({ where: { id } });
  }
}
