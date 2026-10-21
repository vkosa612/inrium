import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '../content/utils/slug.util';
import type { CreateCommunityDto } from './dto/create-community.dto';
import type { CommunityQueryDto } from './dto/community-query.dto';
import type { UpdateCommunityDto } from './dto/update-community.dto';
import {
  COVER_FOCUS_SELECT,
  coverFocusCreateData,
  coverFocusUpdateData,
  isClearedImageUrl,
} from '../../common/dto/cover-focus.dto';

const COMMUNITY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  coverImageUrl: true,
  ...COVER_FOCUS_SELECT,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async adminList() {
    return this.prisma.community.findMany({
      orderBy: { name: 'asc' },
      select: COMMUNITY_SELECT,
    });
  }

  async list(query: CommunityQueryDto) {
    const { page = 1, limit = 12, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CommunityWhereInput = {
      isPublished: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        select: COMMUNITY_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.community.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  async findBySlug(slug: string) {
    const item = await this.prisma.community.findUnique({
      where: { slug, isPublished: true },
      select: COMMUNITY_SELECT,
    });
    if (!item) throw new NotFoundException(`Community "${slug}" not found`);
    return item;
  }

  async create(dto: CreateCommunityDto) {
    const slug = dto.slug?.trim() || generateSlug(dto.name);
    const existing = await this.prisma.community.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" already exists`);

    return this.prisma.community.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        ...coverFocusCreateData(dto),
        isPublished: dto.isPublished ?? true,
      },
      select: COMMUNITY_SELECT,
    });
  }

  async update(id: string, dto: UpdateCommunityDto) {
    const item = await this.prisma.community.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Community not found');

    if (dto.slug && dto.slug !== item.slug) {
      const clash = await this.prisma.community.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException(`Slug "${dto.slug}" already exists`);
    }

    return this.prisma.community.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl || null }),
        ...coverFocusUpdateData(dto, {
          imageCleared: isClearedImageUrl(dto.coverImageUrl),
          imageReplaced:
            dto.coverImageUrl !== undefined &&
            !isClearedImageUrl(dto.coverImageUrl) &&
            dto.coverImageUrl !== item.coverImageUrl,
        }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      select: COMMUNITY_SELECT,
    });
  }

  async remove(id: string) {
    const item = await this.prisma.community.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Community not found');
    await this.prisma.community.delete({ where: { id } });
  }
}
