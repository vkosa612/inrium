import { GameApplicationStatus, GameStatus, Prisma, PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { assertTestDatabase } from './db-guard';
import type { TestClient } from './test-client';

/** Єдиний пароль для всіх тестових користувачів (публічне тестове значення). */
export const TEST_PASSWORD = 'TestPass123!';
const PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4); // низька вартість — лише для тестів

const TABLES = [
  'GameApplication',
  'Game',
  'Bookmark',
  'Session',
  'ContentTag',
  'HomePageBlock',
  'ContentItem',
  'Tag',
  'Category',
  'Kit',
  'GameSystem',
  'Community',
  'User',
];

/** Повне очищення тестової БД (з перевіркою, що це саме тестова БД). */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  assertTestDatabase(process.env.DATABASE_URL);
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

function uniq(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString('hex')}`;
}

export interface CreateUserOptions {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  displayName?: string;
}

export async function createUser(prisma: PrismaClient, options: CreateUserOptions = {}) {
  return prisma.user.create({
    data: {
      email: (options.email ?? `${uniq('user')}@example.test`).toLowerCase(),
      passwordHash: PASSWORD_HASH,
      displayName: options.displayName ?? uniq('User'),
      role: options.role ?? UserRole.PLAYER,
      status: options.status ?? UserStatus.ACTIVE,
      emailVerified: options.emailVerified ?? true,
    },
  });
}

export async function createGame(
  prisma: PrismaClient,
  masterId: string,
  options: Partial<Pick<Prisma.GameUncheckedCreateInput, 'title' | 'slug' | 'maxPlayers' | 'description'>> & {
    status?: GameStatus;
  } = {},
) {
  const slug = options.slug ?? uniq('game');
  return prisma.game.create({
    data: {
      title: options.title ?? `Game ${slug}`,
      slug,
      description: options.description ?? 'Тестовий опис ігрової сесії для перевірок.',
      status: options.status ?? GameStatus.OPEN,
      maxPlayers: options.maxPlayers ?? 4,
      masterId,
    },
  });
}

export async function createApplication(
  prisma: PrismaClient,
  gameId: string,
  userId: string,
  status: GameApplicationStatus = GameApplicationStatus.PENDING,
) {
  return prisma.gameApplication.create({
    data: { gameId, userId, status, message: 'Хочу приєднатися' },
  });
}

/** Вхід через публічний API (cookie + CSRF), як у браузері. */
export async function loginAs(client: TestClient, email: string, password = TEST_PASSWORD) {
  const res = await client.post('/api/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`login failed (${res.status}): ${res.raw}`);
  }
  return res;
}

/** Створює користувача з роллю і одразу логінить окремий «браузер». */
export async function createLoggedInUser(
  ctx: { prisma: PrismaClient; client: (o?: { ip?: string }) => TestClient },
  options: CreateUserOptions = {},
) {
  const user = await createUser(ctx.prisma, options);
  const client = ctx.client({ ip: `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
  await loginAs(client, user.email);
  return { user, client };
}
