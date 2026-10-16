import { createHash } from 'crypto';
import { createUser, loginAs, resetDatabase, TEST_PASSWORD } from './support/factories';
import { createTestApp, TestContext } from './support/test-app';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

describe('Email lifecycle (verification обов\'язкова)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp({ REQUIRE_EMAIL_VERIFICATION: 'true' });
  });
  afterAll(async () => {
    await ctx.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.rateLimit.resetAll();
    ctx.mail.clear();
  });

  const register = (email: string, ip = '10.8.0.1') =>
    ctx.client({ ip }).post('/api/auth/register', { email, password: 'Passw0rd!x', displayName: 'Tester' });

  describe('register → verify → login', () => {
    it('повний шлях: непідтверджений не входить, після підтвердження — входить', async () => {
      await register('flow@example.test');
      const mail = ctx.mail.last('verification', 'flow@example.test');
      expect(mail?.token).toBeDefined();

      const client = ctx.client();
      const blocked = await client.post('/api/auth/login', { email: 'flow@example.test', password: 'Passw0rd!x' });
      expect(blocked.status).toBe(401);
      expect(blocked.field('code')).toBe('EMAIL_NOT_VERIFIED');
      expect(await ctx.prisma.session.count()).toBe(0);

      const verify = await client.post('/api/auth/verify-email', { token: mail?.token });
      expect(verify.status).toBe(200);

      const ok = await client.post('/api/auth/login', { email: 'flow@example.test', password: 'Passw0rd!x' });
      expect(ok.status).toBe(200);
    });

    it('у БД зберігається лише хеш токена підтвердження; сирий токен у БД не знайдено', async () => {
      await register('hash@example.test');
      const raw = ctx.mail.last('verification')?.token as string;
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'hash@example.test' } });
      expect(user.emailVerificationToken).toBe(sha256(raw));
      expect(user.emailVerificationToken).not.toBe(raw);
      expect(await ctx.prisma.user.count({ where: { emailVerificationToken: raw } })).toBe(0);
    });

    it('токен одноразовий: повторне використання → 401', async () => {
      await register('once@example.test');
      const token = ctx.mail.last('verification')?.token;
      const client = ctx.client();
      expect((await client.post('/api/auth/verify-email', { token })).status).toBe(200);
      expect((await client.post('/api/auth/verify-email', { token })).status).toBe(401);
    });

    it('прострочений токен не працює', async () => {
      await register('expired@example.test');
      const token = ctx.mail.last('verification')?.token;
      await ctx.prisma.user.update({
        where: { email: 'expired@example.test' },
        data: { emailVerificationExpiresAt: new Date(Date.now() - 1000) },
      });
      expect((await ctx.client().post('/api/auth/verify-email', { token })).status).toBe(401);
    });

    it('хеш токена як токен НЕ приймається (не можна використати значення з БД)', async () => {
      await register('leak@example.test');
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'leak@example.test' } });
      const res = await ctx.client().post('/api/auth/verify-email', { token: user.emailVerificationToken });
      expect(res.status).toBe(401);
    });

    it('випадковий/чужий токен → 401', async () => {
      expect((await ctx.client().post('/api/auth/verify-email', { token: 'a'.repeat(64) })).status).toBe(401);
    });
  });

  describe('resend verification', () => {
    it('новий токен інвалідує попередній', async () => {
      await register('resend@example.test');
      const first = ctx.mail.last('verification')?.token;
      ctx.mail.clear();

      const res = await ctx.client({ ip: '10.8.0.9' }).post('/api/auth/resend-verification', { email: 'resend@example.test' });
      expect(res.status).toBe(200);
      const second = ctx.mail.last('verification')?.token;
      expect(second).toBeDefined();
      expect(second).not.toBe(first);

      expect((await ctx.client().post('/api/auth/verify-email', { token: first })).status).toBe(401);
      expect((await ctx.client().post('/api/auth/verify-email', { token: second })).status).toBe(200);
    });

    it('вже підтверджений акаунт листа не отримує', async () => {
      const user = await createUser(ctx.prisma, { emailVerified: true });
      await ctx.client().post('/api/auth/resend-verification', { email: user.email });
      expect(ctx.mail.count('verification')).toBe(0);
    });
  });

  describe('непідтверджений не обходить обмеження через стару сесію', () => {
    it('access-токен і refresh непідтвердженого користувача відхиляються', async () => {
      // Сесія створена, коли користувач ще був підтверджений/політика інша → потім стала непідтвердженою.
      const user = await createUser(ctx.prisma, { emailVerified: true });
      const client = ctx.client();
      await loginAs(client, user.email);
      expect((await client.get('/api/auth/me')).status).toBe(200);

      await ctx.prisma.user.update({ where: { id: user.id }, data: { emailVerified: false } });
      expect((await client.get('/api/auth/me')).status).toBe(401);
      expect((await client.post('/api/auth/refresh')).status).toBe(401);
    });
  });

  describe('forgot → reset → login', () => {
    it('повний шлях; після reset усі старі сесії відкликані, токен одноразовий', async () => {
      const user = await createUser(ctx.prisma, { emailVerified: true });
      const oldSession = ctx.client({ ip: '10.8.1.1' });
      await loginAs(oldSession, user.email);

      await ctx.client({ ip: '10.8.1.2' }).post('/api/auth/request-password-reset', { email: user.email });
      const token = ctx.mail.last('password-reset', user.email)?.token as string;
      expect(token).toBeDefined();

      const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(stored.passwordResetToken).toBe(sha256(token));

      const reset = await ctx.client({ ip: '10.8.1.3' }).post('/api/auth/reset-password', {
        token,
        newPassword: 'BrandNew789!',
      });
      expect(reset.status).toBe(200);

      // старі сесії мертві
      expect((await oldSession.get('/api/auth/me')).status).toBe(401);
      expect((await oldSession.post('/api/auth/refresh')).status).toBe(401);

      // повторне використання токена
      const again = await ctx.client({ ip: '10.8.1.4' }).post('/api/auth/reset-password', {
        token,
        newPassword: 'Another999!',
      });
      expect(again.status).toBe(401);

      // старий пароль не працює, новий — працює
      const fresh = ctx.client({ ip: '10.8.1.5' });
      expect((await fresh.post('/api/auth/login', { email: user.email, password: TEST_PASSWORD })).status).toBe(401);
      expect((await fresh.post('/api/auth/login', { email: user.email, password: 'BrandNew789!' })).status).toBe(200);
    });

    it('прострочений reset-токен не працює', async () => {
      const user = await createUser(ctx.prisma);
      await ctx.client().post('/api/auth/request-password-reset', { email: user.email });
      const token = ctx.mail.last('password-reset')?.token;
      await ctx.prisma.user.update({ where: { id: user.id }, data: { passwordResetExpiresAt: new Date(Date.now() - 1000) } });
      const res = await ctx.client().post('/api/auth/reset-password', { token, newPassword: 'BrandNew789!' });
      expect(res.status).toBe(401);
    });

    it('новий запит скидання інвалідує попередній токен', async () => {
      const user = await createUser(ctx.prisma);
      await ctx.client({ ip: '10.8.2.1' }).post('/api/auth/request-password-reset', { email: user.email });
      const first = ctx.mail.last('password-reset')?.token;
      await ctx.client({ ip: '10.8.2.2' }).post('/api/auth/request-password-reset', { email: user.email });
      const second = ctx.mail.last('password-reset')?.token;
      expect(first).not.toBe(second);
      const res = await ctx.client().post('/api/auth/reset-password', { token: first, newPassword: 'BrandNew789!' });
      expect(res.status).toBe(401);
    });

    it('заблокований користувач не може скинути пароль', async () => {
      const user = await createUser(ctx.prisma, { status: 'BLOCKED' });
      await ctx.client().post('/api/auth/request-password-reset', { email: user.email });
      expect(ctx.mail.count('password-reset')).toBe(0);
    });

    it('слабкий новий пароль відхиляється валідацією', async () => {
      const res = await ctx.client().post('/api/auth/reset-password', { token: 'x', newPassword: 'short' });
      expect(res.status).toBe(400);
    });
  });
});

describe('Email: політика за замовчуванням у dev (верифікація вимкнена)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp({ REQUIRE_EMAIL_VERIFICATION: 'false' });
  });
  afterAll(async () => {
    await ctx.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.rateLimit.resetAll();
  });

  it('непідтверджений користувач може увійти, коли політика вимкнена', async () => {
    const user = await createUser(ctx.prisma, { emailVerified: false });
    const res = await ctx.client().post('/api/auth/login', { email: user.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
  });
});
