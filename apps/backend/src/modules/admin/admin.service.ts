import { Injectable } from '@nestjs/common';
import { ContentStatus, ContentType, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminStats {
  content: { total: number; published: number; drafts: number; news: number; articles: number };
  systems: number;
  communities: number;
  games: number;
  /** Лише для ADMIN: редактору кількість акаунтів не розкривається. */
  users: { total: number; blocked: number } | null;
  generatedAt: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(role: UserRole): Promise<AdminStats> {
    const isAdmin = role === UserRole.ADMIN;

    const [total, published, drafts, news, articles, systems, communities, games, usersTotal, usersBlocked] =
      await Promise.all([
        this.prisma.contentItem.count(),
        this.prisma.contentItem.count({ where: { status: ContentStatus.PUBLISHED } }),
        this.prisma.contentItem.count({ where: { status: ContentStatus.DRAFT } }),
        this.prisma.contentItem.count({ where: { type: ContentType.NEWS } }),
        this.prisma.contentItem.count({ where: { type: ContentType.ARTICLE } }),
        this.prisma.gameSystem.count(),
        this.prisma.community.count(),
        this.prisma.game.count(),
        isAdmin ? this.prisma.user.count({ where: { status: { not: UserStatus.DELETED } } }) : Promise.resolve(0),
        isAdmin ? this.prisma.user.count({ where: { status: UserStatus.BLOCKED } }) : Promise.resolve(0),
      ]);

    return {
      content: { total, published, drafts, news, articles },
      systems,
      communities,
      games,
      users: isAdmin ? { total: usersTotal, blocked: usersBlocked } : null,
      generatedAt: new Date().toISOString(),
    };
  }
}
