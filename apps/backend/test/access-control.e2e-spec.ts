import { GameApplicationStatus, GameStatus, UserRole } from '@prisma/client';
import {
  createApplication,
  createGame,
  createLoggedInUser,
  createUser,
  resetDatabase,
} from './support/factories';
import { createTestApp, TestContext } from './support/test-app';
import type { TestClient } from './support/test-client';

type Actor = 'anonymous' | 'player' | 'gm' | 'editor' | 'admin';

describe('Контроль доступу (permission matrix + IDOR/BOLA)', () => {
  let ctx: TestContext;
  const actors = {} as Record<Actor, TestClient>;
  let gm: { id: string };
  let otherGm: { id: string };
  let player: { id: string };
  let otherPlayer: { id: string };
  let otherClient: TestClient;
  let gmClient: TestClient;
  let otherGmClient: TestClient;
  let playerClient: TestClient;

  let ownGame: { id: string; slug: string };
  let foreignGame: { id: string; slug: string };
  let draftGame: { id: string; slug: string };
  let foreignApplication: { id: string };

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.rateLimit.resetAll();

    actors.anonymous = ctx.client({ ip: '10.20.0.1' });
    const p = await createLoggedInUser(ctx, { role: UserRole.PLAYER });
    const g = await createLoggedInUser(ctx, { role: UserRole.GAME_MASTER });
    const e = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
    const a = await createLoggedInUser(ctx, { role: UserRole.ADMIN });
    const g2 = await createLoggedInUser(ctx, { role: UserRole.GAME_MASTER });
    const p2 = await createLoggedInUser(ctx, { role: UserRole.PLAYER });

    actors.player = p.client;
    actors.gm = g.client;
    actors.editor = e.client;
    actors.admin = a.client;
    gm = g.user;
    otherGm = g2.user;
    player = p.user;
    otherPlayer = p2.user;
    otherClient = p2.client;
    gmClient = g.client;
    otherGmClient = g2.client;
    playerClient = p.client;

    ownGame = await createGame(ctx.prisma, gm.id, { maxPlayers: 2 });
    foreignGame = await createGame(ctx.prisma, otherGm.id, { maxPlayers: 2 });
    draftGame = await createGame(ctx.prisma, gm.id, { status: GameStatus.DRAFT, slug: 'secret-draft' });
    foreignApplication = await createApplication(ctx.prisma, foreignGame.id, otherPlayer.id);
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Permission matrix за ролями', () => {
    const NOT_ALLOWED_FOR_ANON = 401;
    const FORBIDDEN = 403;

    // [опис, метод, url-фабрика, ролі, що ДОЗВОЛЕНІ]
    const matrix: Array<{
      name: string;
      method: string;
      url: () => string;
      body?: () => unknown;
      allowed: Actor[];
    }> = [
      { name: 'GET /users (список користувачів)', method: 'GET', url: () => '/api/users', allowed: ['admin'] },
      { name: 'PATCH /users/:id/role', method: 'PATCH', url: () => `/api/users/${player.id}/role`, body: () => ({ role: 'PLAYER' }), allowed: ['admin'] },
      { name: 'GET /games/my/games', method: 'GET', url: () => '/api/games/my/games', allowed: ['gm', 'admin'] },
      { name: 'POST /games', method: 'POST', url: () => '/api/games', body: () => ({ title: 'Нова гра', description: 'Опис нової гри для тесту' }), allowed: ['gm', 'admin'] },
      { name: 'GET /communities/admin/list', method: 'GET', url: () => '/api/communities/admin/list', allowed: ['admin'] },
      { name: 'GET /content/admin/list', method: 'GET', url: () => '/api/content/admin/list', allowed: ['editor', 'admin'] },
      { name: 'GET /systems/admin/list', method: 'GET', url: () => '/api/systems/admin/list', allowed: ['editor', 'admin'] },
      { name: 'GET /kits/admin/list', method: 'GET', url: () => '/api/kits/admin/list', allowed: ['editor', 'admin'] },
      { name: 'GET /home-blocks/admin/list', method: 'GET', url: () => '/api/home-blocks/admin/list', allowed: ['editor', 'admin'] },
      { name: 'POST /content', method: 'POST', url: () => '/api/content', body: () => ({ title: 'Матеріал', type: 'NEWS', content: 'Текст' }), allowed: ['editor', 'admin'] },
      { name: 'GET /auth/me', method: 'GET', url: () => '/api/auth/me', allowed: ['player', 'gm', 'editor', 'admin'] },
      { name: 'GET /bookmarks', method: 'GET', url: () => '/api/bookmarks', allowed: ['player', 'gm', 'editor', 'admin'] },
      { name: 'GET /games/my/applications', method: 'GET', url: () => '/api/games/my/applications', allowed: ['player', 'gm', 'editor', 'admin'] },
    ];

    const everyone: Actor[] = ['anonymous', 'player', 'gm', 'editor', 'admin'];

    for (const entry of matrix) {
      it.each(everyone)(`${entry.name} — %s`, async (actor) => {
        const res = await actors[actor].send(entry.method, entry.url(), { body: entry.body?.() });
        if (entry.allowed.includes(actor)) {
          expect([200, 201]).toContain(res.status);
        } else if (actor === 'anonymous') {
          expect(res.status).toBe(NOT_ALLOWED_FOR_ANON);
        } else {
          expect(res.status).toBe(FORBIDDEN);
        }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Анонім: жодних приватних ресурсів', () => {
    it.each([
      ['GET', '/api/auth/me'],
      ['GET', '/api/games/my/games'],
      ['GET', '/api/games/my/applications'],
      ['GET', '/api/bookmarks'],
      ['PATCH', '/api/users/me'],
      ['POST', '/api/uploads/image'],
    ])('%s %s → 401', async (method, url) => {
      const res = await ctx.client().send(method, url, { body: {} });
      expect(res.status).toBe(401);
    });

    it('публічні списки та сторінки доступні без входу', async () => {
      const anon = ctx.client();
      expect((await anon.get('/api/games')).status).toBe(200);
      expect((await anon.get(`/api/games/${ownGame.slug}`)).status).toBe(200);
      expect((await anon.get(`/api/users/${gm.id}`)).status).toBe(200);
    });

    it('публічний профіль не розкриває email, хеш пароля, токени та статус', async () => {
      const res = await ctx.client().get(`/api/users/${player.id}`);
      expect(res.raw).not.toMatch(/email|passwordHash|Token|status|emailVerified/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Чернетки (DRAFT) та приховані ігри', () => {
    it('DRAFT не потрапляє в публічний список навіть із ?status=DRAFT', async () => {
      const anon = ctx.client();
      for (const q of ['', '?status=DRAFT', '?status=CANCELLED', '?search=Game']) {
        const res = await anon.get(`/api/games${q}`);
        expect(res.status).toBe(200);
        const slugs = res.data<{ items: Array<{ slug: string }> }>().items.map((i) => i.slug);
        expect(slugs).not.toContain(draftGame.slug);
      }
    });

    it('slug чернетки не відкриває гру (404, не 403 — без розкриття існування)', async () => {
      expect((await ctx.client().get(`/api/games/${draftGame.slug}`)).status).toBe(404);
      expect((await playerClient.get(`/api/games/${draftGame.slug}`)).status).toBe(404);
      // навіть власник бачить чернетку лише через management-ендпоїнти
      expect((await gmClient.get(`/api/games/${draftGame.slug}`)).status).toBe(404);
    });

    it('СANCELLED-гра не відкривається за slug', async () => {
      const cancelled = await createGame(ctx.prisma, gm.id, { status: GameStatus.CANCELLED });
      expect((await ctx.client().get(`/api/games/${cancelled.slug}`)).status).toBe(404);
    });

    it('непублікований контент недоступний за slug', async () => {
      await ctx.prisma.contentItem.create({
        data: {
          title: 'Чернетка',
          slug: 'draft-article',
          type: 'ARTICLE',
          status: 'DRAFT',
          content: 'секрет',
          authorId: gm.id,
        },
      });
      expect((await ctx.client().get('/api/content/draft-article')).status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('GM не керує чужою грою (BOLA)', () => {
    it('читання management-даних чужої гри → 403', async () => {
      expect((await gmClient.get(`/api/games/by-id/${foreignGame.id}`)).status).toBe(403);
      expect((await gmClient.get(`/api/games/by-id/${foreignGame.id}/applications`)).status).toBe(403);
    });

    it('редагування чужої гри → 403, дані не змінюються', async () => {
      const res = await gmClient.patch(`/api/games/${foreignGame.id}`, { title: 'Захоплено' });
      expect(res.status).toBe(403);
      const stored = await ctx.prisma.game.findUniqueOrThrow({ where: { id: foreignGame.id } });
      expect(stored.title).not.toBe('Захоплено');
    });

    it('видалення чужої гри → 403, гра існує', async () => {
      const res = await gmClient.delete(`/api/games/${foreignGame.id}`);
      expect(res.status).toBe(403);
      expect(await ctx.prisma.game.count({ where: { id: foreignGame.id } })).toBe(1);
    });

    it('завантаження обкладинки чужої гри → 403', async () => {
      const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
      const res = await gmClient.upload(`/api/games/${foreignGame.id}/cover`, {
        filename: 'c.png',
        contentType: 'image/png',
        content: png,
      });
      expect(res.status).toBe(403);
    });

    it('власник керує власною грою', async () => {
      expect((await gmClient.get(`/api/games/by-id/${ownGame.id}`)).status).toBe(200);
      expect((await gmClient.patch(`/api/games/${ownGame.id}`, { title: 'Нова назва гри' })).status).toBe(200);
    });

    it('ADMIN керує будь-якою грою', async () => {
      expect((await actors.admin.patch(`/api/games/${foreignGame.id}`, { title: 'Адмінська назва' })).status).toBe(200);
      expect((await actors.admin.get(`/api/games/by-id/${foreignGame.id}/applications`)).status).toBe(200);
    });

    it('EDITOR не керує іграми', async () => {
      expect((await actors.editor.patch(`/api/games/${ownGame.id}`, { title: 'Редакторська назва' })).status).toBe(403);
    });

    it('/games/my/games повертає лише власні ігри GM', async () => {
      const res = await gmClient.get('/api/games/my/games');
      const ids = res.data<Array<{ id: string }>>().map((g) => g.id);
      expect(ids).toContain(ownGame.id);
      expect(ids).not.toContain(foreignGame.id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Заявки: підміна ID та ownership', () => {
    it('GM не може approve/reject/remove заявку на ЧУЖУ гру', async () => {
      for (const action of ['approve', 'reject', 'remove']) {
        const res = await gmClient.patch(`/api/games/${foreignGame.id}/applications/${foreignApplication.id}/${action}`);
        expect(res.status).toBe(403);
      }
      const stored = await ctx.prisma.gameApplication.findUniqueOrThrow({ where: { id: foreignApplication.id } });
      expect(stored.status).toBe(GameApplicationStatus.PENDING);
    });

    it('підміна gameId: заявка чужої гри через URL власної гри → 404', async () => {
      const res = await gmClient.patch(`/api/games/${ownGame.id}/applications/${foreignApplication.id}/approve`);
      expect(res.status).toBe(404);
      const stored = await ctx.prisma.gameApplication.findUniqueOrThrow({ where: { id: foreignApplication.id } });
      expect(stored.status).toBe(GameApplicationStatus.PENDING);
    });

    it('PLAYER не може approve/reject навіть власну заявку', async () => {
      const own = await createApplication(ctx.prisma, ownGame.id, player.id);
      for (const action of ['approve', 'reject', 'remove']) {
        const res = await playerClient.patch(`/api/games/${ownGame.id}/applications/${own.id}/${action}`);
        expect(res.status).toBe(403);
      }
    });

    it('користувач не скасовує ЧУЖУ заявку; свою — може', async () => {
      const mine = await createApplication(ctx.prisma, ownGame.id, player.id);
      const foreign = await createApplication(ctx.prisma, ownGame.id, otherPlayer.id);

      expect((await playerClient.patch(`/api/games/${ownGame.id}/applications/${foreign.id}/cancel`)).status).toBe(403);
      expect((await playerClient.patch(`/api/games/${ownGame.id}/applications/${mine.id}/cancel`)).status).toBe(200);
      const stored = await ctx.prisma.gameApplication.findUniqueOrThrow({ where: { id: foreign.id } });
      expect(stored.status).toBe(GameApplicationStatus.PENDING);
    });

    it('список заявок власної гри не містить email та інших персональних даних заявників', async () => {
      await createApplication(ctx.prisma, ownGame.id, player.id);
      const res = await gmClient.get(`/api/games/by-id/${ownGame.id}/applications`);
      expect(res.status).toBe(200);
      expect(res.raw).not.toMatch(/email|passwordHash|Token|@example\.test/i);
    });

    it('/games/my/applications повертає лише заявки поточного користувача', async () => {
      await createApplication(ctx.prisma, ownGame.id, player.id);
      const res = await playerClient.get('/api/games/my/applications');
      const rows = res.data<Array<{ id: string }>>();
      expect(rows).toHaveLength(1);
      expect(res.raw).not.toContain(foreignApplication.id);
    });

    it('/by-id/:id/my-application повертає лише власну заявку', async () => {
      const res = await playerClient.get(`/api/games/by-id/${foreignGame.id}/my-application`);
      expect(res.status).toBe(200);
      expect(res.data<{ application: unknown }>().application).toBeNull();
    });

    it('заявка на чернетку/закриту гру неможлива (404)', async () => {
      expect((await playerClient.post(`/api/games/${draftGame.id}/apply`, { message: 'хочу' })).status).toBe(404);
    });

    it('не можна подати заявку на власну гру', async () => {
      expect((await gmClient.post(`/api/games/${ownGame.id}/apply`, {})).status).toBe(409);
    });

    it('повторна заявка не дублюється (409)', async () => {
      expect((await playerClient.post(`/api/games/${ownGame.id}/apply`, { message: 'a' })).status).toBe(201);
      expect((await playerClient.post(`/api/games/${ownGame.id}/apply`, { message: 'b' })).status).toBe(409);
      expect(await ctx.prisma.gameApplication.count({ where: { gameId: ownGame.id, userId: player.id } })).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Mass assignment та сторонні поля', () => {
    it('створення гри не приймає masterId/status-обхід/зайві поля', async () => {
      const res = await gmClient.post('/api/games', {
        title: 'Хакерська гра',
        description: 'Опис хакерської гри',
        masterId: otherGm.id,
      });
      expect(res.status).toBe(400);
      expect(await ctx.prisma.game.count({ where: { title: 'Хакерська гра' } })).toBe(0);
    });

    it('оновлення гри не дозволяє змінити власника', async () => {
      const res = await gmClient.patch(`/api/games/${ownGame.id}`, { masterId: otherGm.id });
      expect(res.status).toBe(400);
      const stored = await ctx.prisma.game.findUniqueOrThrow({ where: { id: ownGame.id } });
      expect(stored.masterId).toBe(gm.id);
    });

    it('профіль: role/status/email/passwordHash/emailVerified ігноруються → відхиляються валідатором', async () => {
      for (const field of [{ role: 'ADMIN' }, { status: 'ACTIVE' }, { email: 'x@example.test' }, { passwordHash: 'x' }, { emailVerified: true }]) {
        const res = await playerClient.patch('/api/users/me', { ...field, bio: 'ok' });
        expect(res.status).toBe(400);
      }
      const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { id: player.id } });
      expect(stored.role).toBe(UserRole.PLAYER);
    });

    it('заявка не приймає userId/status', async () => {
      const res = await playerClient.post(`/api/games/${ownGame.id}/apply`, {
        message: 'x',
        userId: otherPlayer.id,
        status: 'APPROVED',
      });
      expect(res.status).toBe(400);
    });

    it('PLAYER не підвищує собі роль через жоден ендпоїнт', async () => {
      expect((await playerClient.patch(`/api/users/${player.id}/role`, { role: 'ADMIN' })).status).toBe(403);
      const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { id: player.id } });
      expect(stored.role).toBe(UserRole.PLAYER);
    });

    it('реєстрація не приймає role/status/emailVerified', async () => {
      const res = await ctx.client({ ip: '10.30.0.1' }).post('/api/auth/register', {
        email: 'mass@example.test',
        password: 'Passw0rd!x',
        displayName: 'Mass',
        role: 'ADMIN',
        emailVerified: true,
      });
      expect(res.status).toBe(400);
      expect(await ctx.prisma.user.count({ where: { email: 'mass@example.test' } })).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Закладки: ізоляція між користувачами', () => {
    it('користувач не видаляє і не бачить чужу закладку', async () => {
      const item = await ctx.prisma.contentItem.create({
        data: { title: 'Стаття', slug: 'pub', type: 'ARTICLE', status: 'PUBLISHED', content: 'x', authorId: gm.id },
      });
      const created = await playerClient.post('/api/bookmarks', { targetType: 'CONTENT', targetId: item.id });
      expect(created.status).toBe(201);
      const id = created.data<{ id: string }>().id;

      expect((await otherClient.delete(`/api/bookmarks/${id}`)).status).toBeGreaterThanOrEqual(400);
      expect(await ctx.prisma.bookmark.count({ where: { id } })).toBe(1);
      expect((await otherClient.get('/api/bookmarks')).raw).not.toContain(id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Видалена / заблокована сесія', () => {
    it('заблокований GM втрачає доступ до керування своєю грою', async () => {
      await ctx.prisma.user.update({ where: { id: gm.id }, data: { status: 'BLOCKED' } });
      expect((await gmClient.get(`/api/games/by-id/${ownGame.id}`)).status).toBe(401);
    });

    it('після видалення акаунта ігри майстра зникають, чужі дані цілі', async () => {
      const res = await gmClient.post('/api/users/me/delete-account', {
        password: 'TestPass123!',
        confirmation: 'ВИДАЛИТИ',
      });
      expect(res.status).toBe(201);
      expect(await ctx.prisma.game.count({ where: { masterId: gm.id } })).toBe(0);
      expect(await ctx.prisma.game.count({ where: { id: foreignGame.id } })).toBe(1);
      expect((await gmClient.get('/api/auth/me')).status).toBe(401);
    });

    it('останнього адміністратора видалити не можна', async () => {
      const res = await actors.admin.post('/api/users/me/delete-account', {
        password: 'TestPass123!',
        confirmation: 'ВИДАЛИТИ',
      });
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Конкурентні сценарії (race conditions)', () => {
    it('паралельний approve двох заявок на останній слот: схвалена рівно одна', async () => {
      const game = await createGame(ctx.prisma, gm.id, { maxPlayers: 1 });
      const [u1, u2, u3] = await Promise.all([createUser(ctx.prisma), createUser(ctx.prisma), createUser(ctx.prisma)]);
      const apps = await Promise.all([u1, u2, u3].map((u) => createApplication(ctx.prisma, game.id, u.id)));

      const results = await Promise.all(
        apps.map((app) => gmClient.patch(`/api/games/${game.id}/applications/${app.id}/approve`)),
      );

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(2);
      expect(await ctx.prisma.gameApplication.count({ where: { gameId: game.id, status: 'APPROVED' } })).toBe(1);
      expect((await ctx.prisma.game.findUniqueOrThrow({ where: { id: game.id } })).status).toBe(GameStatus.FULL);
    });

    it('паралельний approve ОДНІЄЇ заявки не завищує лічильник схвалених', async () => {
      const game = await createGame(ctx.prisma, gm.id, { maxPlayers: 4 });
      const u = await createUser(ctx.prisma);
      const app = await createApplication(ctx.prisma, game.id, u.id);

      const results = await Promise.all(
        Array.from({ length: 4 }, () => gmClient.patch(`/api/games/${game.id}/applications/${app.id}/approve`)),
      );
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(await ctx.prisma.gameApplication.count({ where: { gameId: game.id, status: 'APPROVED' } })).toBe(1);
    });

    it('після remove слот звільняється і статус гри повертається в OPEN', async () => {
      const game = await createGame(ctx.prisma, gm.id, { maxPlayers: 1 });
      const u = await createUser(ctx.prisma);
      const app = await createApplication(ctx.prisma, game.id, u.id);
      await gmClient.patch(`/api/games/${game.id}/applications/${app.id}/approve`);
      expect((await ctx.prisma.game.findUniqueOrThrow({ where: { id: game.id } })).status).toBe(GameStatus.FULL);

      expect((await gmClient.patch(`/api/games/${game.id}/applications/${app.id}/remove`)).status).toBe(200);
      expect((await ctx.prisma.game.findUniqueOrThrow({ where: { id: game.id } })).status).toBe(GameStatus.OPEN);
      // повторне видалення того самого гравця — ідемпотентно відхиляється
      expect((await gmClient.patch(`/api/games/${game.id}/applications/${app.id}/remove`)).status).toBe(409);
    });
  });

  // otherGmClient використано для перевірок симетрії
  it('симетрія: інший GM також не бачить management-даних моєї гри', async () => {
    expect((await otherGmClient.get(`/api/games/by-id/${ownGame.id}`)).status).toBe(403);
  });
});
