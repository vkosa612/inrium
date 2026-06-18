import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GameApplicationStatus,
  GameStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '../content/utils/slug.util';
import type { UserPublic } from '../auth/types/auth-response.type';
import type { ApplyGameDto } from './dto/apply-game.dto';
import type { CreateGameDto } from './dto/create-game.dto';
import type { GameQueryDto } from './dto/game-query.dto';
import type { UpdateGameDto } from './dto/update-game.dto';

const GAME_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  status: true,
  maxPlayers: true,
  startsAt: true,
  createdAt: true,
  updatedAt: true,
  master: {
    select: { id: true, displayName: true, avatarUrl: true },
  },
  gameSystem: {
    select: { id: true, slug: true, title: true },
  },
  _count: {
    select: {
      applications: {
        where: { status: GameApplicationStatus.APPROVED },
      },
    },
  },
} as const;

const PUBLIC_STATUSES: GameStatus[] = [
  GameStatus.OPEN,
  GameStatus.FULL,
  GameStatus.IN_PROGRESS,
  GameStatus.FINISHED,
];

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: GameQueryDto) {
    const { page = 1, limit = 12, status, gameSystemId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GameWhereInput = {
      status: status ?? { in: PUBLIC_STATUSES },
      ...(gameSystemId && { gameSystemId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        select: GAME_SELECT,
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.game.count({ where }),
    ]);

    const mapped = items.map(({ _count, ...g }) => ({
      ...g,
      approvedCount: _count.applications,
    }));

    return {
      items: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  async findBySlug(slug: string) {
    const game = await this.prisma.game.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        maxPlayers: true,
        startsAt: true,
        createdAt: true,
        updatedAt: true,
        master: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        gameSystem: {
          select: { id: true, slug: true, title: true },
        },
        applications: {
          where: { status: GameApplicationStatus.APPROVED },
          select: {
            id: true,
            status: true,
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!game || !PUBLIC_STATUSES.includes(game.status)) {
      throw new NotFoundException(`Game "${slug}" not found`);
    }
    const { applications, ...rest } = game;
    return { ...rest, approvedCount: applications.length, applications };
  }

  async create(dto: CreateGameDto, user: UserPublic) {
    if (user.role !== UserRole.GAME_MASTER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Game Masters can create games');
    }

    const slug = dto.slug?.trim() || generateSlug(dto.title);
    const existing = await this.prisma.game.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" already exists`);

    if (dto.gameSystemId) {
      const sys = await this.prisma.gameSystem.findUnique({
        where: { id: dto.gameSystemId },
      });
      if (!sys) throw new NotFoundException('Game system not found');
    }

    const created = await this.prisma.game.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        status: dto.status ?? GameStatus.DRAFT,
        maxPlayers: dto.maxPlayers,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        masterId: user.id,
        gameSystemId: dto.gameSystemId || null,
      },
      select: GAME_SELECT,
    });
    const { _count, ...rest } = created;
    return { ...rest, approvedCount: _count.applications };
  }

  async update(id: string, dto: UpdateGameDto, user: UserPublic) {
    const game = await this.findOwnedOrAdmin(id, user);

    if (dto.slug && dto.slug !== game.slug) {
      const clash = await this.prisma.game.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException(`Slug "${dto.slug}" already exists`);
    }

    return this.prisma.game.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.maxPlayers !== undefined && { maxPlayers: dto.maxPlayers }),
        ...(dto.startsAt !== undefined && {
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        }),
        ...(dto.gameSystemId !== undefined && { gameSystemId: dto.gameSystemId || null }),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        maxPlayers: true,
        startsAt: true,
        createdAt: true,
        updatedAt: true,
        master: { select: { id: true, displayName: true, avatarUrl: true } },
        gameSystem: { select: { id: true, slug: true, title: true } },
      },
    });
  }

  async remove(id: string, user: UserPublic) {
    await this.findOwnedOrAdmin(id, user);
    await this.prisma.game.delete({ where: { id } });
  }

  async apply(gameId: string, user: UserPublic, dto: ApplyGameDto) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.status !== GameStatus.OPEN) {
      throw new NotFoundException('Game not open for applications');
    }
    if (game.masterId === user.id) {
      throw new ConflictException('Cannot apply to your own game');
    }

    const existing = await this.prisma.gameApplication.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
    });

    if (existing) {
      if (existing.status === GameApplicationStatus.PENDING) {
        throw new ConflictException('You already applied to this game');
      }
      if (existing.status === GameApplicationStatus.APPROVED) {
        throw new ConflictException('You are already approved for this game');
      }
      if (existing.status === GameApplicationStatus.CANCELLED || existing.status === GameApplicationStatus.REJECTED) {
        return this.prisma.gameApplication.update({
          where: { id: existing.id },
          data: { status: GameApplicationStatus.PENDING, message: dto.message ?? existing.message },
          select: { id: true, status: true, message: true, createdAt: true },
        });
      }
      throw new ConflictException('You already applied to this game');
    }

    try {
      return await this.prisma.gameApplication.create({
        data: {
          gameId,
          userId: user.id,
          message: dto.message,
        },
        select: {
          id: true,
          status: true,
          message: true,
          createdAt: true,
        },
      });
    } catch {
      throw new ConflictException('You already applied to this game');
    }
  }

  async updateApplication(
    gameId: string,
    appId: string,
    action: 'approve' | 'reject' | 'cancel',
    user: UserPublic,
  ) {
    const app = await this.prisma.gameApplication.findFirst({
      where: { id: appId, gameId },
      include: { game: true },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (action === 'cancel') {
      if (app.userId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot cancel this application');
      }
      if (app.status !== GameApplicationStatus.PENDING) {
        throw new ConflictException('Only pending applications can be cancelled');
      }
      return this.prisma.gameApplication.update({
        where: { id: appId },
        data: { status: GameApplicationStatus.CANCELLED },
      });
    }

    if (app.game.masterId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the game master can approve or reject');
    }

    const status =
      action === 'approve'
        ? GameApplicationStatus.APPROVED
        : GameApplicationStatus.REJECTED;

    const updated = await this.prisma.gameApplication.update({
      where: { id: appId },
      data: { status },
    });

    if (action === 'approve' && app.game.maxPlayers) {
      const approved = await this.prisma.gameApplication.count({
        where: { gameId, status: GameApplicationStatus.APPROVED },
      });
      if (approved >= app.game.maxPlayers) {
        await this.prisma.game.update({
          where: { id: gameId },
          data: { status: GameStatus.FULL },
        });
      }
    }

    return updated;
  }

  async listMyGames(user: UserPublic) {
    const where: Prisma.GameWhereInput =
      user.role === UserRole.ADMIN ? {} : { masterId: user.id };

    const items = await this.prisma.game.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        maxPlayers: true,
        startsAt: true,
        createdAt: true,
        updatedAt: true,
        master: { select: { id: true, displayName: true, avatarUrl: true } },
        gameSystem: { select: { id: true, slug: true, title: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const enriched = await Promise.all(
      items.map(async (g) => {
        const [pendingApplicationCount, approvedCount, applicationCount] = await Promise.all([
          this.prisma.gameApplication.count({
            where: { gameId: g.id, status: GameApplicationStatus.PENDING },
          }),
          this.prisma.gameApplication.count({
            where: { gameId: g.id, status: GameApplicationStatus.APPROVED },
          }),
          this.prisma.gameApplication.count({ where: { gameId: g.id } }),
        ]);
        return { ...g, pendingApplicationCount, approvedCount, applicationCount };
      }),
    );

    return enriched;
  }

  async findByIdForManage(id: string, user: UserPublic) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        maxPlayers: true,
        startsAt: true,
        createdAt: true,
        updatedAt: true,
        master: { select: { id: true, displayName: true, avatarUrl: true } },
        gameSystem: { select: { id: true, slug: true, title: true } },
      },
    });
    if (!game) throw new NotFoundException('Game not found');
    if (game.master.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to view this game');
    }
    const approvedCount = await this.prisma.gameApplication.count({
      where: { gameId: id, status: GameApplicationStatus.APPROVED },
    });
    return { ...game, approvedCount };
  }
    return this.prisma.gameApplication.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        updatedAt: true,
        game: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            startsAt: true,
            master: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMyApplications(user: UserPublic) {
    await this.findOwnedOrAdmin(gameId, user);

    return this.prisma.gameApplication.findMany({
      where: { gameId },
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getMyApplicationForGame(gameId: string, user: UserPublic) {
    const app = await this.prisma.gameApplication.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
      },
    });
    return { application: app };
  }

  private async findOwnedOrAdmin(id: string, user: UserPublic) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) throw new NotFoundException('Game not found');
    if (game.masterId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to modify this game');
    }
    return game;
  }
}
