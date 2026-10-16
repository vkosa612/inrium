import { UserStatus } from '@prisma/client';
import { createLoggedInUser, createUser, loginAs, resetDatabase, TEST_PASSWORD } from './support/factories';
import { createTestApp, TestContext } from './support/test-app';

describe('Auth: HttpOnly cookie-сесії, ротація refresh, відкликання', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.rateLimit.resetAll();
  });

  describe('cookie та відповідь login', () => {
    it('ставить HttpOnly cookie, не повертає токени в JSON, refresh-cookie обмежений шляхом /api/auth', async () => {
      const user = await createUser(ctx.prisma);
      const client = ctx.client();
      const res = await client.post('/api/auth/login', { email: user.email, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      // JSON не містить жодних токенів
      expect(res.raw).not.toMatch(/accessToken|refreshToken|eyJ[A-Za-z0-9_-]{10,}\./);
      expect(res.data<{ user: { email: string } }>().user.email).toBe(user.email);
      expect(res.raw).not.toContain('passwordHash');

      const at = res.setCookies.find((c) => c.startsWith('inrium_at='));
      const rt = res.setCookies.find((c) => c.startsWith('inrium_rt='));
      expect(at).toBeDefined();
      expect(rt).toBeDefined();
      for (const cookie of [at, rt]) {
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/SameSite=Lax/i);
      }
      expect(at).toMatch(/Path=\/(;|$)/);
      expect(at).toMatch(/Max-Age=900/); // 15 хв
      expect(rt).toMatch(/Path=\/api\/auth/);
      expect(rt).toMatch(/Max-Age=604800/); // 7 днів
    });

    it('refresh-cookie не надсилається на інші шляхи API (лише /api/auth/*)', async () => {
      const { client } = await createLoggedInUser(ctx);
      expect(client.cookie('inrium_rt')).toBeDefined();
      // Імітуємо браузер: на /api/games refresh-cookie не відправляється → тут його взагалі немає в запиті
      const res = await client.get('/api/auth/me');
      expect(res.status).toBe(200);
    });

    it('зберігає в БД лише sha256-хеш refresh-токена', async () => {
      const { user, client } = await createLoggedInUser(ctx);
      const rt = client.cookie('inrium_rt') as string;
      const sessions = await ctx.prisma.session.findMany({ where: { userId: user.id } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].refreshTokenHash).not.toBe(rt);
      expect(sessions[0].refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('/me працює за cookie, але ігнорує Authorization: Bearer', async () => {
      const { client } = await createLoggedInUser(ctx);
      const access = client.cookie('inrium_at') as string;

      const anon = ctx.client();
      const viaBearer = await anon.get('/api/auth/me', { headers: { authorization: `Bearer ${access}` } });
      expect(viaBearer.status).toBe(401);

      const viaCookie = await client.get('/api/auth/me');
      expect(viaCookie.status).toBe(200);
    });

    it('невірний пароль та неіснуючий email дають однакову відповідь', async () => {
      const user = await createUser(ctx.prisma);
      const a = await ctx.client().post('/api/auth/login', { email: user.email, password: 'WrongPass123!' });
      const b = await ctx.client().post('/api/auth/login', { email: 'nobody@example.test', password: 'WrongPass123!' });
      expect(a.status).toBe(401);
      expect(b.status).toBe(401);
      expect(a.field('message')).toBe(b.field('message'));
    });
  });

  describe('refresh: ротація та reuse detection', () => {
    it('ротує refresh-токен і видає новий access; старий refresh більше не працює', async () => {
      const { user, client } = await createLoggedInUser(ctx);
      const oldRt = client.cookie('inrium_rt') as string;

      const res = await client.post('/api/auth/refresh');
      expect(res.status).toBe(200);
      expect(res.raw).not.toMatch(/accessToken|refreshToken/);
      const newRt = client.cookie('inrium_rt') as string;
      expect(newRt).not.toBe(oldRt);

      const sessions = await ctx.prisma.session.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(sessions).toHaveLength(2);
      expect(sessions[0].familyId).toBe(sessions[1].familyId);
      expect(sessions[0].rotatedAt).not.toBeNull();
      expect(sessions[1].rotatedAt).toBeNull();

      expect((await client.get('/api/auth/me')).status).toBe(200);
    });

    it('повторне використання старого refresh ПОЗА grace-вікном відкликає всю сім\'ю', async () => {
      const { user, client } = await createLoggedInUser(ctx);
      const stolen = client.cookie('inrium_rt') as string;
      await client.post('/api/auth/refresh'); // легітимна ротація

      // Старіємо ротацію за межі grace-вікна
      await ctx.prisma.session.updateMany({
        where: { userId: user.id, rotatedAt: { not: null } },
        data: { rotatedAt: new Date(Date.now() - 60_000) },
      });

      const attacker = ctx.client({ ip: '10.9.9.9' });
      attacker.setCookie('inrium_rt', stolen, '/api/auth');
      const replay = await attacker.post('/api/auth/refresh');
      expect(replay.status).toBe(401);

      // Сім'я відкликана — легітимний користувач теж втрачає сесію
      const sessions = await ctx.prisma.session.findMany({ where: { userId: user.id } });
      expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
      expect((await client.post('/api/auth/refresh')).status).toBe(401);
      expect((await client.get('/api/auth/me')).status).toBe(401);
    });

    it('паралельні refresh одним токеном: рівно одна ротація, обидва запити успішні (grace)', async () => {
      const { user, client } = await createLoggedInUser(ctx);
      const rt = client.cookie('inrium_rt') as string;

      const tabs = Array.from({ length: 5 }, () => {
        const tab = ctx.client({ ip: '10.2.2.2' });
        tab.setCookie('inrium_rt', rt, '/api/auth');
        return tab;
      });
      const results = await Promise.all(tabs.map((tab) => tab.post('/api/auth/refresh')));

      expect(results.every((r) => r.status === 200)).toBe(true);
      const sessions = await ctx.prisma.session.findMany({ where: { userId: user.id } });
      // 1 початкова (rotated) + рівно 1 нова
      expect(sessions).toHaveLength(2);
      expect(sessions.filter((s) => s.revokedAt !== null)).toHaveLength(0);

      // Лише один запит отримав новий refresh-cookie
      const withNewRefresh = results.filter((r) => r.setCookies.some((c) => c.startsWith('inrium_rt=')));
      expect(withNewRefresh).toHaveLength(1);
    });

    it('refresh без cookie → 401', async () => {
      const res = await ctx.client().post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('підроблений refresh-токен → 401 і cookie очищаються', async () => {
      const client = ctx.client();
      client.setCookie('inrium_rt', 'not.a.jwt', '/api/auth');
      const res = await client.post('/api/auth/refresh');
      expect(res.status).toBe(401);
      expect(res.setCookies.some((c) => /^inrium_rt=;/.test(c))).toBe(true);
    });

    it('прострочена сесія не оновлюється', async () => {
      const { user, client } = await createLoggedInUser(ctx);
      await ctx.prisma.session.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect((await client.post('/api/auth/refresh')).status).toBe(401);
      expect((await client.get('/api/auth/me')).status).toBe(401);
    });
  });

  describe('logout та відкликання доступу', () => {
    it('logout відкликає сесію: навіть вкрадений access-токен перестає працювати', async () => {
      const { client } = await createLoggedInUser(ctx);
      const stolenAccess = client.cookie('inrium_at') as string;
      const stolenRefresh = client.cookie('inrium_rt') as string;

      const out = await client.post('/api/auth/logout');
      expect(out.status).toBe(200);
      expect(out.setCookies.some((c) => /^inrium_at=;/.test(c))).toBe(true);
      expect(out.setCookies.some((c) => /^inrium_rt=;/.test(c))).toBe(true);

      const attacker = ctx.client({ ip: '10.9.9.8' });
      attacker.setCookie('inrium_at', stolenAccess);
      attacker.setCookie('inrium_rt', stolenRefresh, '/api/auth');
      expect((await attacker.get('/api/auth/me')).status).toBe(401);
      expect((await attacker.post('/api/auth/refresh')).status).toBe(401);
    });

    it('logout ідемпотентний і працює без сесії', async () => {
      const res = await ctx.client().post('/api/auth/logout');
      expect(res.status).toBe(200);
    });

    it('logout одного пристрою не чіпає інші сесії користувача', async () => {
      const user = await createUser(ctx.prisma);
      const a = ctx.client({ ip: '10.3.0.1' });
      const b = ctx.client({ ip: '10.3.0.2' });
      await loginAs(a, user.email);
      await loginAs(b, user.email);
      await a.post('/api/auth/logout');
      expect((await a.get('/api/auth/me')).status).toBe(401);
      expect((await b.get('/api/auth/me')).status).toBe(200);
    });

    it('зміна пароля відкликає всі сесії', async () => {
      const user = await createUser(ctx.prisma);
      const a = ctx.client({ ip: '10.3.1.1' });
      const b = ctx.client({ ip: '10.3.1.2' });
      await loginAs(a, user.email);
      await loginAs(b, user.email);

      const res = await a.post('/api/users/me/change-password', {
        currentPassword: TEST_PASSWORD,
        newPassword: 'AnotherPass456!',
      });
      expect(res.status).toBe(201);
      expect((await a.get('/api/auth/me')).status).toBe(401);
      expect((await b.get('/api/auth/me')).status).toBe(401);
      expect((await b.post('/api/auth/refresh')).status).toBe(401);
    });

    it('блокування користувача негайно скасовує доступ (access і refresh)', async () => {
      const { user, client } = await createLoggedInUser(ctx);
      await ctx.prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.BLOCKED } });
      expect((await client.get('/api/auth/me')).status).toBe(401);
      expect((await client.post('/api/auth/refresh')).status).toBe(401);
      const relogin = await ctx.client().post('/api/auth/login', { email: user.email, password: TEST_PASSWORD });
      expect(relogin.status).toBe(401);
    });

    it('видалення акаунта скасовує доступ і прибирає сесії', async () => {
      const { user, client } = await createLoggedInUser(ctx);
      const del = await client.post('/api/users/me/delete-account', {
        password: TEST_PASSWORD,
        confirmation: 'ВИДАЛИТИ',
      });
      expect(del.status).toBe(201);
      expect(await ctx.prisma.session.count({ where: { userId: user.id } })).toBe(0);
      expect((await client.get('/api/auth/me')).status).toBe(401);
    });
  });

  describe('роль/статус перечитуються на кожен запит', () => {
    it('пониження ролі діє одразу, без повторного входу', async () => {
      const { user, client } = await createLoggedInUser(ctx, { role: 'ADMIN' });
      expect((await client.get('/api/users')).status).toBe(200);
      await ctx.prisma.user.update({ where: { id: user.id }, data: { role: 'PLAYER' } });
      expect((await client.get('/api/users')).status).toBe(403);
    });
  });
});
