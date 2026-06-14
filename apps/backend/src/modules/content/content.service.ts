import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateContentDto } from './dto/create-content.dto';
import type { UpdateContentDto } from './dto/update-content.dto';
import type { ContentQueryDto } from './dto/content-query.dto';
import type { AdminContentQueryDto } from './dto/admin-content-query.dto';
import { generateSlug } from './utils/slug.util';

// ─── Selects ──────────────────────────────────────────────────────────────────

const CONTENT_SELECT = {
  id: true,
  slug: true,
  type: true,
  status: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  isFeatured: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

const CONTENT_WITH_BODY = { ...CONTENT_SELECT, content: true } as const;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public reads ───────────────────────────────────────────────────────────

  async list(query: ContentQueryDto) {
    const { type, page = 1, limit = 12, category, tag, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ContentItemWhereInput = {
      status: ContentStatus.PUBLISHED,
      ...(type && { type }),
      ...(category && { category: { slug: category } }),
      ...(tag && { tags: { some: { tag: { slug: tag } } } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        select: CONTENT_SELECT,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string) {
    const item = await this.prisma.contentItem.findUnique({
      where: { slug, status: ContentStatus.PUBLISHED },
      select: CONTENT_WITH_BODY,
    });
    if (!item) throw new NotFoundException(`Content "${slug}" not found`);
    return item;
  }

  async featured(limit = 6) {
    return this.prisma.contentItem.findMany({
      where: { status: ContentStatus.PUBLISHED, isFeatured: true },
      select: CONTENT_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  // ── Admin reads ─────────────────────────────────────────────────────────────

  async adminList(query: AdminContentQueryDto) {
    const { type, status, page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ContentItemWhereInput = {
      ...(type && { type }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        select: CONTENT_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdAdmin(id: string) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id },
      select: CONTENT_WITH_BODY,
    });
    if (!item) throw new NotFoundException(`Content "${id}" not found`);
    return item;
  }

  // ── CMS mutations ───────────────────────────────────────────────────────────

  async create(dto: CreateContentDto, authorId: string) {
    const slug = dto.slug?.trim() || generateSlug(dto.title);

    // Check slug uniqueness
    const existing = await this.prisma.contentItem.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Slug "${slug}" is already taken`);
    }

    const status = dto.status ?? ContentStatus.DRAFT;
    const publishedAt =
      status === ContentStatus.PUBLISHED ? new Date() : undefined;

    return this.prisma.contentItem.create({
      data: {
        title: dto.title,
        slug,
        type: dto.type,
        status,
        content: dto.content,
        excerpt: dto.excerpt,
        coverImageUrl: dto.coverImageUrl,
        isFeatured: dto.isFeatured ?? false,
        publishedAt,
        authorId,
        categoryId: dto.categoryId,
      },
      select: CONTENT_WITH_BODY,
    });
  }

  async update(id: string, dto: UpdateContentDto) {
    const existing = await this.prisma.contentItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Content "${id}" not found`);

    // Slug change: check uniqueness
    if (dto.slug && dto.slug !== existing.slug) {
      const conflict = await this.prisma.contentItem.findUnique({
        where: { slug: dto.slug },
      });
      if (conflict) throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    // Auto-set publishedAt when transitioning to PUBLISHED
    let publishedAt: Date | undefined = undefined;
    if (
      dto.status === ContentStatus.PUBLISHED &&
      existing.status !== ContentStatus.PUBLISHED &&
      !existing.publishedAt
    ) {
      publishedAt = new Date();
    }

    return this.prisma.contentItem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(publishedAt && { publishedAt }),
      },
      select: CONTENT_WITH_BODY,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.contentItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Content "${id}" not found`);
    await this.prisma.contentItem.delete({ where: { id } });
  }
}
