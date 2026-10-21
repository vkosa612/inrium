import { Injectable } from '@nestjs/common';
import { ContentStatus, ContentType, GameApplicationStatus, GameStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const CONTENT_SELECT = {
  id: true, slug: true, type: true, title: true, excerpt: true,
  coverImageUrl: true, coverPositionX: true, coverPositionY: true, coverScale: true,
  isFeatured: true, publishedAt: true, createdAt: true,
  author: { select: { id: true, displayName: true } },
  category: { select: { id: true, name: true, slug: true } },
} as const;

const SYSTEM_SELECT = {
  id: true, slug: true, title: true, shortDescription: true,
  complexity: true, genre: true, tags: true, imageUrl: true,
  coverPositionX: true, coverPositionY: true, coverScale: true, publishedAt: true,
} as const;

const GAME_HOME_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverImageUrl: true,
  coverPositionX: true,
  coverPositionY: true,
  coverScale: true,
  status: true,
  maxPlayers: true,
  startsAt: true,
  createdAt: true,
  updatedAt: true,
  master: { select: { id: true, displayName: true, avatarUrl: true } },
  gameSystem: { select: { id: true, slug: true, title: true } },
  applications: {
    where: { status: GameApplicationStatus.APPROVED },
    select: { user: { select: { displayName: true } } },
    orderBy: { updatedAt: 'asc' as const },
  },
} as const;

const HELP_SELECT = {
  id: true, slug: true, title: true, excerpt: true,
  publishedAt: true, createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

const PUBLIC_GAME_STATUSES = ['OPEN', 'FULL', 'IN_PROGRESS', 'FINISHED'] as const;

function contentUrl(type: ContentType, slug: string): string {
  return type === ContentType.HELP_PAGE ? `/help/${slug}` : `/content/${slug}`;
}

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome() {
    const PUBLISHED = ContentStatus.PUBLISHED;

    const [featured, latestNews, latestArticles, systems, helpItems, gamesRaw, counts] =
      await Promise.all([
        this.prisma.contentItem.findMany({
          where: { status: PUBLISHED, isFeatured: true, type: { not: ContentType.HELP_PAGE } },
          select: CONTENT_SELECT,
          orderBy: { publishedAt: 'desc' },
          take: 4,
        }),
        this.prisma.contentItem.findMany({
          where: { status: PUBLISHED, type: ContentType.NEWS },
          select: CONTENT_SELECT,
          orderBy: { publishedAt: 'desc' },
          take: 4,
        }),
        this.prisma.contentItem.findMany({
          where: { status: PUBLISHED, type: ContentType.ARTICLE },
          select: CONTENT_SELECT,
          orderBy: { publishedAt: 'desc' },
          take: 4,
        }),
        this.prisma.gameSystem.findMany({
          where: { status: PUBLISHED },
          select: SYSTEM_SELECT,
          orderBy: { publishedAt: 'desc' },
          take: 4,
        }),
        this.prisma.contentItem.findMany({
          where: { status: PUBLISHED, type: ContentType.HELP_PAGE },
          select: HELP_SELECT,
          orderBy: { publishedAt: 'desc' },
          take: 4,
        }),
        this.prisma.game.findMany({
          where: { status: { in: [...PUBLIC_GAME_STATUSES] as GameStatus[] } },
          select: GAME_HOME_SELECT,
          orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
          take: 4,
        }),
        Promise.all([
          this.prisma.contentItem.count({ where: { status: PUBLISHED, type: ContentType.NEWS } }),
          this.prisma.contentItem.count({ where: { status: PUBLISHED, type: ContentType.ARTICLE } }),
          this.prisma.gameSystem.count({ where: { status: PUBLISHED } }),
          this.prisma.contentItem.count({ where: { status: PUBLISHED, type: ContentType.HELP_PAGE } }),
          this.prisma.game.count({
            where: { status: { in: [...PUBLIC_GAME_STATUSES] as GameStatus[] } },
          }),
        ]),
      ]);

    const games = gamesRaw.map(({ applications, ...g }) => ({
      ...g,
      approvedCount: applications.length,
      approvedPlayers: applications.map((a) => a.user.displayName),
    }));

    const [newsCount, articlesCount, systemsCount, helpCount, gamesCount] = counts;

    return {
      featured,
      latestNews,
      latestArticles,
      systems,
      helpItems,
      games,
      stats: {
        news: newsCount,
        articles: articlesCount,
        systems: systemsCount,
        help: helpCount,
        games: gamesCount,
      },
    };
  }

  async getSitemap() {
    const PUBLISHED = ContentStatus.PUBLISHED;
    const PUBLIC_GAME_STATUSES = ['OPEN', 'FULL', 'IN_PROGRESS', 'FINISHED'] as const;

    const [contentItems, systems, games, communities] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: { status: PUBLISHED },
        select: { slug: true, type: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.gameSystem.findMany({
        where: { status: PUBLISHED },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.game.findMany({
        where: { status: { in: [...PUBLIC_GAME_STATUSES] } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.community.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      content: contentItems
        .filter((i) => i.type !== ContentType.HELP_PAGE)
        .map((i) => ({ slug: i.slug, updatedAt: i.updatedAt.toISOString() })),
      help: contentItems
        .filter((i) => i.type === ContentType.HELP_PAGE)
        .map((i) => ({ slug: i.slug, updatedAt: i.updatedAt.toISOString() })),
      systems: systems.map((s) => ({ slug: s.slug, updatedAt: s.updatedAt.toISOString() })),
      games: games.map((g) => ({ slug: g.slug, updatedAt: g.updatedAt.toISOString() })),
      communities: communities.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt.toISOString() })),
    };
  }

  async search(q: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) return { results: [], total: 0, query };

    const PUBLISHED = ContentStatus.PUBLISHED;

    const [contentItems, systems] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: {
          status: PUBLISHED,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { excerpt: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, type: true, title: true, slug: true,
          excerpt: true, updatedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      }),
      this.prisma.gameSystem.findMany({
        where: {
          status: PUBLISHED,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { shortDescription: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, title: true, slug: true,
          shortDescription: true, updatedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      }),
    ]);

    const results = [
      ...contentItems.map((i) => ({
        id: i.id,
        type: i.type === ContentType.HELP_PAGE ? ('help' as const) : ('content' as const),
        subtype: i.type as string,
        title: i.title,
        slug: i.slug,
        excerpt: i.excerpt ?? null,
        url: contentUrl(i.type, i.slug),
        updatedAt: i.updatedAt.toISOString(),
      })),
      ...systems.map((s) => ({
        id: s.id,
        type: 'system' as const,
        subtype: null,
        title: s.title,
        slug: s.slug,
        excerpt: s.shortDescription ?? null,
        url: `/systems/${s.slug}`,
        updatedAt: s.updatedAt.toISOString(),
      })),
    ].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return { results, total: results.length, query };
  }
}
