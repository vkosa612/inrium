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
import { UploadsService } from '../uploads/uploads.service';
import { generateSlug } from '../content/utils/slug.util';
import type { UserPublic } from '../auth/types/auth-response.type';
import type { ApplyGameDto } from './dto/apply-game.dto';
import type { CreateGameDto } from './dto/create-game.dto';
import type { GameQueryDto } from './dto/game-query.dto';
import type { UpdateGameDto } from './dto/update-game.dto';
import type { MultipartFile } from '@fastify/multipart';

const GAME_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverImageUrl: true,
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

const APPROVED_PLAYERS_SELECT = {
  where: { status: GameApplicationStatus.APPROVED },
  select: { user: { select: { displayName: true } } },
  orderBy: { updatedAt: 'asc' as const },
};

const APPLICATION_SELECT = {
  id: true,
  status: true,
  message: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, displayName: true, avatarUrl: true },
  },
} as const;

const PUBLIC_STATUSES: GameStatus[] = [
  GameStatus.OPEN,
  GameStatus.FULL,
  GameStatus.IN_PROGRESS,
  GameStatus.FINISHED,
];

const RECRUITMENT_STATUSES: GameStatus[] = [GameStatus.OPEN, GameStatus.FULL];

/** Публічний список ігор — лише дозволені статуси; ігнорує DRAFT/CANCELLED з query. */
function resolvePublicListStatus(status?: GameStatus): GameStatus | { in: GameStatus[] } {
  if (status && PUBLIC_STATUSES.includes(status)) {
    return status;
  }
  return { in: PUBLIC_STATUSES };
}

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  async list(query: GameQueryDto) {
    const { page = 1, limit = 12, status, gameSystemId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GameWhereInput = {
      status: resolvePublicListStatus(status),
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
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          coverImageUrl: true,
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
          applications: APPROVED_PLAYERS_SELECT,
        },
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.game.count({ where }),
    ]);

    const mapped = items.map(({ applications, ...g }) => ({
      ...g,
      approvedCount: applications.length,
      approvedPlayers: applications.map((a) => a.user.displayName),
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
        coverImageUrl: true,
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
          orderBy: { updatedAt: 'asc' },
        },
      },
    });
    if (!game || !PUBLIC_STATUSES.includes(game.status)) {
      throw new NotFoundException('Гру не знайдено');
    }
    const { applications, ...rest } = game;
    return { ...rest, approvedCount: applications.length, applications };
  }

  async create(dto: CreateGameDto, user: UserPublic) {
    if (user.role !== UserRole.GAME_MASTER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Лише майстри можуть створювати ігри');
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
        coverImageUrl: dto.coverImageUrl || null,
      },
      select: GAME_SELECT,
    });
    const { _count, ...rest } = created;
    return { ...rest, approvedCount: _count.applications, approvedPlayers: [] };
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
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl || null }),
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
      if (game?.status === GameStatus.FULL) {
        throw new ConflictException('Набір на цю гру вже закрито.');
      }
      throw new NotFoundException('Гра не відкрита для заявок');
    }
    if (game.masterId === user.id) {
      throw new ConflictException('Не можна подати заявку на власну гру');
    }

    const existing = await this.prisma.gameApplication.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
    });

    if (existing) {
      if (existing.status === GameApplicationStatus.PENDING) {
        throw new ConflictException('Ви вже подали заявку на цю гру');
      }
      if (existing.status === GameApplicationStatus.APPROVED) {
        throw new ConflictException('Вас уже схвалено для цієї гри');
      }
      if (
        existing.status === GameApplicationStatus.CANCELLED ||
        existing.status === GameApplicationStatus.REJECTED ||
        existing.status === GameApplicationStatus.REMOVED
      ) {
        return this.prisma.gameApplication.update({
          where: { id: existing.id },
          data: { status: GameApplicationStatus.PENDING, message: dto.message ?? existing.message },
          select: { id: true, status: true, message: true, createdAt: true },
        });
      }
      throw new ConflictException('Ви вже подали заявку на цю гру');
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
      throw new ConflictException('Ви вже подали заявку на цю гру');
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
    if (!app) throw new NotFoundException('Заявку не знайдено');

    if (action === 'cancel') {
      if (app.userId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Ви не можете змінити цю заявку');
      }
      if (app.status !== GameApplicationStatus.PENDING) {
        throw new ConflictException('Скасувати можна лише заявку «Очікує рішення»');
      }
      return this.prisma.gameApplication.update({
        where: { id: appId },
        data: { status: GameApplicationStatus.CANCELLED },
        select: APPLICATION_SELECT,
      });
    }

    if (app.game.masterId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Ви не можете керувати цією грою');
    }

    if (action === 'reject') {
      if (app.status !== GameApplicationStatus.PENDING) {
        throw new ConflictException('Заявку можна відхилити лише у статусі «Очікує рішення».');
      }
      return this.prisma.gameApplication.update({
        where: { id: appId },
        data: { status: GameApplicationStatus.REJECTED },
        select: APPLICATION_SELECT,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Спочатку блокуємо гру: усі паралельні схвалення цієї гри виконуються послідовно,
      // а статус заявки та кількість схвалених читаються вже під блокуванням.
      await tx.$executeRaw`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`;

      const lockedApp = await tx.gameApplication.findFirst({
        where: { id: appId, gameId },
        include: { game: true },
      });
      if (!lockedApp) throw new NotFoundException('Заявку не знайдено');

      if (lockedApp.status !== GameApplicationStatus.PENDING) {
        throw new ConflictException('Заявку можна схвалити лише у статусі «Очікує рішення».');
      }

      const game = await tx.game.findUnique({ where: { id: gameId } });
      if (!game) throw new NotFoundException('Гру не знайдено');

      const approvedCount = await this.countApproved(tx, gameId);
      if (game.maxPlayers && approvedCount >= game.maxPlayers) {
        throw new ConflictException('У грі вже набрано максимальну кількість гравців.');
      }

      const updated = await tx.gameApplication.update({
        where: { id: appId },
        data: { status: GameApplicationStatus.APPROVED },
        select: APPLICATION_SELECT,
      });

      const gameStatus = await this.syncRecruitmentStatus(tx, game);
      const newApprovedCount = approvedCount + 1;

      return {
        ...updated,
        game: {
          status: gameStatus,
          approvedCount: newApprovedCount,
          maxPlayers: game.maxPlayers,
        },
      };
    });
  }

  async removeApplication(gameId: string, appId: string, user: UserPublic) {
    const app = await this.prisma.gameApplication.findFirst({
      where: { id: appId, gameId },
      include: { game: true },
    });
    if (!app) throw new NotFoundException('Заявку не знайдено');

    if (app.game.masterId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Ви не можете керувати цією грою');
    }

    return this.prisma.$transaction(async (tx) => {
      const lockedApp = await tx.gameApplication.findFirst({
        where: { id: appId, gameId },
        include: { game: true },
      });
      if (!lockedApp) throw new NotFoundException('Заявку не знайдено');

      if (lockedApp.status !== GameApplicationStatus.APPROVED) {
        throw new ConflictException('Можна виключити лише схваленого гравця.');
      }

      await tx.$executeRaw`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`;

      const updated = await tx.gameApplication.update({
        where: { id: appId },
        data: { status: GameApplicationStatus.REMOVED },
        select: APPLICATION_SELECT,
      });

      const game = await tx.game.findUnique({ where: { id: gameId } });
      if (!game) throw new NotFoundException('Гру не знайдено');

      const gameStatus = await this.syncRecruitmentStatus(tx, game);
      const approvedCount = await this.countApproved(tx, gameId);

      return {
        ...updated,
        game: {
          status: gameStatus,
          approvedCount,
          maxPlayers: game.maxPlayers,
        },
      };
    });
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
    if (!game) throw new NotFoundException('Гру не знайдено');
    if (game.master.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступ заборонено');
    }
    const approvedCount = await this.prisma.gameApplication.count({
      where: { gameId: id, status: GameApplicationStatus.APPROVED },
    });
    return { ...game, approvedCount };
  }

  async listMyApplications(user: UserPublic) {
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

  async listGameApplications(gameId: string, user: UserPublic) {
    await this.findOwnedOrAdmin(gameId, user);

    return this.prisma.gameApplication.findMany({
      where: { gameId },
      select: APPLICATION_SELECT,
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

  async uploadCover(id: string, file: MultipartFile, user: UserPublic) {
    await this.findOwnedOrAdmin(id, user);
    const saved = await this.uploads.saveImage(file);
    const updated = await this.prisma.game.update({
      where: { id },
      data: { coverImageUrl: saved.url },
      select: GAME_SELECT,
    });
    const { _count, ...rest } = updated;
    return { ...rest, approvedCount: _count.applications, upload: saved };
  }

  private async countApproved(tx: Prisma.TransactionClient, gameId: string) {
    return tx.gameApplication.count({
      where: { gameId, status: GameApplicationStatus.APPROVED },
    });
  }

  private async syncRecruitmentStatus(
    tx: Prisma.TransactionClient,
    game: { id: string; status: GameStatus; maxPlayers: number | null },
  ): Promise<GameStatus> {
    if (!game.maxPlayers || game.maxPlayers <= 0) return game.status;
    if (!RECRUITMENT_STATUSES.includes(game.status)) return game.status;

    const approvedCount = await this.countApproved(tx, game.id);
    const targetStatus =
      approvedCount >= game.maxPlayers ? GameStatus.FULL : GameStatus.OPEN;

    if (targetStatus !== game.status) {
      await tx.game.update({ where: { id: game.id }, data: { status: targetStatus } });
      return targetStatus;
    }
    return game.status;
  }

  private async findOwnedOrAdmin(id: string, user: UserPublic) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) throw new NotFoundException('Гру не знайдено');
    if (game.masterId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Ви не можете керувати цією грою');
    }
    return game;
  }
}
