import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '../content/utils/slug.util';
import type { CreateKitDto } from './dto/create-kit.dto';
import type { UpdateKitDto } from './dto/update-kit.dto';
import type { AdminKitQueryDto, KitQueryDto } from './dto/kit-query.dto';

const KIT_SELECT = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  category: true,
  priceText: true,
  imageUrl: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  system: {
    select: { id: true, slug: true, title: true },
  },
} as const;

const KIT_WITH_BODY = {
  ...KIT_SELECT,
  description: true,
} as const;

@Injectable()
export class KitsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: KitQueryDto) {
    const { page = 1, limit = 20, search, systemId, system, category } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.KitWhereInput = {
      status: ContentStatus.PUBLISHED,
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(systemId && { systemId }),
      ...(system && { system: { slug: system } }),
      ...(category && { category: { contains: category, mode: 'insensitive' } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.kit.findMany({
        where,
        select: KIT_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.kit.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string) {
    const item = await this.prisma.kit.findUnique({
      where: { slug, status: ContentStatus.PUBLISHED },
      select: KIT_WITH_BODY,
    });
    if (!item) throw new NotFoundException(`Kit "${slug}" not found`);
    return item;
  }

  async adminList(query: AdminKitQueryDto) {
    const { page = 1, limit = 20, search, status, systemId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.KitWhereInput = {
      ...(status && { status }),
      ...(systemId && { systemId }),
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.kit.findMany({
        where,
        select: KIT_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.kit.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdAdmin(id: string) {
    const item = await this.prisma.kit.findUnique({
      where: { id },
      select: KIT_WITH_BODY,
    });
    if (!item) throw new NotFoundException(`Kit "${id}" not found`);
    return item;
  }

  async create(dto: CreateKitDto) {
    const slug = dto.slug?.trim() || generateSlug(dto.title);
    const existing = await this.prisma.kit.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`);

    const status = dto.status ?? ContentStatus.DRAFT;
    return this.prisma.kit.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        category: dto.category,
        priceText: dto.priceText,
        imageUrl: dto.imageUrl,
        status,
        publishedAt: status === ContentStatus.PUBLISHED ? new Date() : undefined,
        systemId: dto.systemId ?? null,
      },
      select: KIT_WITH_BODY,
    });
  }

  async update(id: string, dto: UpdateKitDto) {
    const existing = await this.prisma.kit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Kit "${id}" not found`);

    if (dto.slug && dto.slug !== existing.slug) {
      const conflict = await this.prisma.kit.findUnique({ where: { slug: dto.slug } });
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

    return this.prisma.kit.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.priceText !== undefined && { priceText: dto.priceText }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.systemId !== undefined && { systemId: dto.systemId || null }),
        ...(publishedAt && { publishedAt }),
      },
      select: KIT_WITH_BODY,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.kit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Kit "${id}" not found`);
    await this.prisma.kit.delete({ where: { id } });
  }
}
