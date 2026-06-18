import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookmarkTargetType,
  ContentStatus,
  ContentType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateBookmarkDto } from './dto/create-bookmark.dto';

export interface BookmarkEnriched {
  id: string;
  targetType: BookmarkTargetType;
  targetId: string;
  createdAt: string;
  title: string | null;
  slug: string | null;
  url: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  unavailable: boolean;
}

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<BookmarkEnriched[]> {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(bookmarks.map((b) => this.enrich(b)));
  }

  async check(userId: string, targetType: BookmarkTargetType, targetId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType, targetId },
      },
    });
    return {
      bookmarked: !!bookmark,
      bookmarkId: bookmark?.id ?? null,
    };
  }

  async create(userId: string, dto: CreateBookmarkDto): Promise<BookmarkEnriched> {
    await this.assertTargetExists(dto.targetType, dto.targetId);

    try {
      const bookmark = await this.prisma.bookmark.create({
        data: {
          userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      });
      return this.enrich(bookmark);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        throw new ConflictException('Already bookmarked');
      }
      throw err;
    }
  }

  async remove(userId: string, bookmarkId: string): Promise<{ message: string }> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }
    await this.prisma.bookmark.delete({ where: { id: bookmarkId } });
    return { message: 'Bookmark removed' };
  }

  private async assertTargetExists(
    targetType: BookmarkTargetType,
    targetId: string,
  ): Promise<void> {
    switch (targetType) {
      case BookmarkTargetType.CONTENT: {
        const item = await this.prisma.contentItem.findFirst({
          where: {
            id: targetId,
            status: ContentStatus.PUBLISHED,
            type: { in: [ContentType.NEWS, ContentType.ARTICLE] },
          },
        });
        if (!item) throw new NotFoundException('Content not found or not published');
        return;
      }
      case BookmarkTargetType.HELP: {
        const item = await this.prisma.contentItem.findFirst({
          where: {
            id: targetId,
            status: ContentStatus.PUBLISHED,
            type: ContentType.HELP_PAGE,
          },
        });
        if (!item) throw new NotFoundException('Help page not found or not published');
        return;
      }
      case BookmarkTargetType.SYSTEM: {
        const system = await this.prisma.gameSystem.findFirst({
          where: { id: targetId, status: ContentStatus.PUBLISHED },
        });
        if (!system) throw new NotFoundException('System not found or not published');
        return;
      }
      case BookmarkTargetType.KIT: {
        const kit = await this.prisma.kit.findFirst({
          where: { id: targetId, status: ContentStatus.PUBLISHED },
        });
        if (!kit) throw new NotFoundException('Kit not found or not published');
        return;
      }
      default:
        throw new NotFoundException('Invalid target type');
    }
  }

  private async enrich(bookmark: {
    id: string;
    targetType: BookmarkTargetType;
    targetId: string;
    createdAt: Date;
  }): Promise<BookmarkEnriched> {
    const base: BookmarkEnriched = {
      id: bookmark.id,
      targetType: bookmark.targetType,
      targetId: bookmark.targetId,
      createdAt: bookmark.createdAt.toISOString(),
      title: null,
      slug: null,
      url: null,
      excerpt: null,
      imageUrl: null,
      unavailable: true,
    };

    switch (bookmark.targetType) {
      case BookmarkTargetType.CONTENT:
      case BookmarkTargetType.HELP: {
        const item = await this.prisma.contentItem.findUnique({
          where: { id: bookmark.targetId },
          select: {
            title: true,
            slug: true,
            excerpt: true,
            coverImageUrl: true,
            status: true,
            type: true,
          },
        });
        if (!item || item.status !== ContentStatus.PUBLISHED) return base;
        const isHelp = item.type === ContentType.HELP_PAGE;
        if (bookmark.targetType === BookmarkTargetType.HELP && !isHelp) return base;
        if (bookmark.targetType === BookmarkTargetType.CONTENT && isHelp) return base;
        if (
          bookmark.targetType === BookmarkTargetType.CONTENT &&
          item.type !== ContentType.NEWS &&
          item.type !== ContentType.ARTICLE
        ) {
          return base;
        }
        return {
          ...base,
          title: item.title,
          slug: item.slug,
          url: isHelp ? `/help/${item.slug}` : `/content/${item.slug}`,
          excerpt: item.excerpt,
          imageUrl: item.coverImageUrl,
          unavailable: false,
        };
      }
      case BookmarkTargetType.SYSTEM: {
        const system = await this.prisma.gameSystem.findUnique({
          where: { id: bookmark.targetId },
          select: {
            title: true,
            slug: true,
            shortDescription: true,
            imageUrl: true,
            status: true,
          },
        });
        if (!system || system.status !== ContentStatus.PUBLISHED) return base;
        return {
          ...base,
          title: system.title,
          slug: system.slug,
          url: `/systems/${system.slug}`,
          excerpt: system.shortDescription,
          imageUrl: system.imageUrl,
          unavailable: false,
        };
      }
      case BookmarkTargetType.KIT: {
        const kit = await this.prisma.kit.findUnique({
          where: { id: bookmark.targetId },
          select: {
            title: true,
            slug: true,
            shortDescription: true,
            imageUrl: true,
            status: true,
          },
        });
        if (!kit || kit.status !== ContentStatus.PUBLISHED) return base;
        return {
          ...base,
          title: kit.title,
          slug: kit.slug,
          url: `/kits/${kit.slug}`,
          excerpt: kit.shortDescription,
          imageUrl: kit.imageUrl,
          unavailable: false,
        };
      }
      default:
        return base;
    }
  }
}
