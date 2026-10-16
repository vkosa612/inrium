import { createUser, resetDatabase, TEST_PASSWORD } from './support/factories';
import { createTestApp, TestContext } from './support/test-app';
import { TEST_CAPTCHA_PASS_TOKEN } from '../src/common/security/captcha.service';

const NEW_ACCOUNT = {
  password: 'Passw0rd!x',
  displayName: 'New Player',
};

describe('Rate limit, anti-enumeration, CAPTCHA', () => {
  describe('без довіреного проксі (TRUSTED_PROXY_HOPS=0)', () => {
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
      ctx.mail.clear();
    });

    describe('brute force логіну', () => {
      it('після 10 невдалих спроб акаунт блокується (429 + Retry-After), навіть правильний пароль не пускає', async () => {
        const user = await createUser(ctx.prisma);
        const client = ctx.client();
        for (let i = 0; i < 10; i += 1) {
          const res = await client.post('/api/auth/login', { email: user.email, password: `Wrong${i}pass!` });
          expect(res.status).toBe(401);
        }
        const locked = await client.post('/api/auth/login', { email: user.email, password: TEST_PASSWORD });
        expect(locked.status).toBe(429);
        expect(locked.headers['retry-after']).toBeDefined();
        expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
        expect(locked.field('code')).toBe('TOO_MANY_REQUESTS');
        // Сесію не створено
        expect(await ctx.prisma.session.count()).toBe(0);
      });

      it('ліміт акаунта не залежить від IP: розподілена атака з різних IP теж блокується', async () => {
        const user = await createUser(ctx.prisma);
        for (let i = 0; i < 10; i += 1) {
          const attacker = ctx.client({ ip: `203.0.113.${i + 1}` });
          const res = await attacker.post('/api/auth/login', { email: user.email, password: `Wrong${i}pass!` });
          expect(res.status).toBe(401);
        }
        const fresh = ctx.client({ ip: '198.51.100.77' });
        const res = await fresh.post('/api/auth/login', { email: user.email, password: TEST_PASSWORD });
        expect(res.status).toBe(429);
      });

      it('ліміт IP: перебір різних акаунтів з однієї адреси блокується', async () => {
        const client = ctx.client({ ip: '203.0.113.50' });
        for (let i = 0; i < 20; i += 1) {
          const res = await client.post('/api/auth/login', { email: `ghost${i}@example.test`, password: 'Wrong1pass!' });
          expect(res.status).toBe(401);
        }
        const real = await createUser(ctx.prisma);
        const res = await client.post('/api/auth/login', { email: real.email, password: TEST_PASSWORD });
        expect(res.status).toBe(429);
      });

      it('ліміт IP не зачіпає інших клієнтів', async () => {
        const noisy = ctx.client({ ip: '203.0.113.60' });
        for (let i = 0; i < 20; i += 1) {
          await noisy.post('/api/auth/login', { email: `ghost${i}@example.test`, password: 'Wrong1pass!' });
        }
        const real = await createUser(ctx.prisma);
        const other = ctx.client({ ip: '203.0.113.61' });
        const res = await other.post('/api/auth/login', { email: real.email, password: TEST_PASSWORD });
        expect(res.status).toBe(200);
      });

      it('успішний вхід скидає лічильник невдач акаунта', async () => {
        const user = await createUser(ctx.prisma);
        const client = ctx.client();
        for (let i = 0; i < 9; i += 1) {
          await client.post('/api/auth/login', { email: user.email, password: `Wrong${i}pass!` });
        }
        expect((await client.post('/api/auth/login', { email: user.email, password: TEST_PASSWORD })).status).toBe(200);
        for (let i = 0; i < 9; i += 1) {
          expect((await client.post('/api/auth/login', { email: user.email, password: `Wrong${i}pass!` })).status).toBe(401);
        }
      });

      it('підроблений X-Forwarded-For ігнорується, коли проксі не довірений', async () => {
        const user = await createUser(ctx.prisma);
        for (let i = 0; i < 20; i += 1) {
          const attacker = ctx.client({ ip: '203.0.113.70' });
          await attacker.post(
            '/api/auth/login',
            { email: `ghost${i}@example.test`, password: 'Wrong1pass!' },
            { headers: { 'x-forwarded-for': `9.9.9.${i}` } },
          );
        }
        const attacker = ctx.client({ ip: '203.0.113.70' });
        const res = await attacker.post(
          '/api/auth/login',
          { email: user.email, password: TEST_PASSWORD },
          { headers: { 'x-forwarded-for': '1.2.3.4' } },
        );
        expect(res.status).toBe(429);
      });
    });

    describe('anti-enumeration', () => {
      it('register: однакова відповідь для нової та вже існуючої пошти; другому надсилається лист-повідомлення', async () => {
        const existing = await createUser(ctx.prisma);

        const fresh = await ctx.client({ ip: '10.7.0.1' }).post('/api/auth/register', {
          email: 'brand-new@example.test',
          ...NEW_ACCOUNT,
        });
        const dup = await ctx.client({ ip: '10.7.0.2' }).post('/api/auth/register', {
          email: existing.email,
          ...NEW_ACCOUNT,
        });

        expect(fresh.status).toBe(202);
        expect(dup.status).toBe(202);
        expect(dup.json).toEqual(expect.objectContaining({ success: true }));
        expect(fresh.data()).toEqual(dup.data());
        // Жодних cookie сесії при реєстрації
        expect(fresh.setCookies.some((c) => c.startsWith('inrium_at='))).toBe(false);
        expect(dup.setCookies.some((c) => c.startsWith('inrium_at='))).toBe(false);

        expect(ctx.mail.count('verification', 'brand-new@example.test')).toBe(1);
        expect(ctx.mail.count('account-exists', existing.email)).toBe(1);
        expect(await ctx.prisma.user.count({ where: { email: existing.email } })).toBe(1);
      });

      it('register: пошта нормалізується (регістр) і дубль у іншому регістрі не створює другого акаунта', async () => {
        await ctx.client().post('/api/auth/register', { email: 'Mixed@Example.test', ...NEW_ACCOUNT });
        await ctx.client({ ip: '10.7.0.3' }).post('/api/auth/register', { email: 'mixed@example.test', ...NEW_ACCOUNT });
        expect(await ctx.prisma.user.count()).toBe(1);
      });

      it('request-password-reset: однакова відповідь для існуючого і неіснуючого email; лист лише існуючому', async () => {
        const user = await createUser(ctx.prisma);
        const real = await ctx.client({ ip: '10.7.1.1' }).post('/api/auth/request-password-reset', { email: user.email });
        const ghost = await ctx.client({ ip: '10.7.1.2' }).post('/api/auth/request-password-reset', { email: 'ghost@example.test' });
        expect(real.status).toBe(200);
        expect(ghost.status).toBe(200);
        expect(real.json).toEqual(expect.objectContaining({ data: ghost.data() }));
        expect(ctx.mail.count('password-reset')).toBe(1);
      });

      it('request-password-reset: ліміт акаунта (3/год) мовчки припиняє листи, відповідь лишається нейтральною', async () => {
        const user = await createUser(ctx.prisma);
        for (let i = 0; i < 5; i += 1) {
          const res = await ctx.client({ ip: `10.7.2.${i + 1}` }).post('/api/auth/request-password-reset', { email: user.email });
          expect(res.status).toBe(200);
        }
        expect(ctx.mail.count('password-reset', user.email)).toBe(3);
      });

      it('request-password-reset: ліміт IP → 429', async () => {
        const client = ctx.client({ ip: '10.7.3.1' });
        let last = 200;
        for (let i = 0; i < 12; i += 1) {
          last = (await client.post('/api/auth/request-password-reset', { email: `u${i}@example.test` })).status;
        }
        expect(last).toBe(429);
      });

      it('resend-verification: нейтральна відповідь; лист лише непідтвердженому акаунту', async () => {
        const unverified = await createUser(ctx.prisma, { emailVerified: false });
        const verified = await createUser(ctx.prisma);
        const a = await ctx.client({ ip: '10.7.4.1' }).post('/api/auth/resend-verification', { email: unverified.email });
        const b = await ctx.client({ ip: '10.7.4.2' }).post('/api/auth/resend-verification', { email: verified.email });
        const c = await ctx.client({ ip: '10.7.4.3' }).post('/api/auth/resend-verification', { email: 'ghost@example.test' });
        expect([a.status, b.status, c.status]).toEqual([200, 200, 200]);
        expect(a.data()).toEqual(b.data());
        expect(a.data()).toEqual(c.data());
        expect(ctx.mail.count('verification')).toBe(1);
        expect(ctx.mail.count('verification', unverified.email)).toBe(1);
      });

      it('register: ліміт IP → 429', async () => {
        const client = ctx.client({ ip: '10.7.5.1' });
        let last = 0;
        for (let i = 0; i < 12; i += 1) {
          last = (await client.post('/api/auth/register', { email: `n${i}@example.test`, ...NEW_ACCOUNT })).status;
        }
        expect(last).toBe(429);
      });

      it('verify-email / reset-password: перебір токенів обмежується по IP', async () => {
        const client = ctx.client({ ip: '10.7.6.1' });
        const statuses: number[] = [];
        for (let i = 0; i < 22; i += 1) {
          statuses.push((await client.post('/api/auth/verify-email', { token: `guess-${i}` })).status);
        }
        expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
        expect(statuses[21]).toBe(429);
      });

      it('login: час відповіді для неіснуючого користувача порівнянний (виконується порівняння bcrypt)', async () => {
        const user = await createUser(ctx.prisma);
        const timeOf = async (email: string) => {
          const t = process.hrtime.bigint();
          await ctx.client().post('/api/auth/login', { email, password: 'Wrong1pass!' });
          return Number(process.hrtime.bigint() - t) / 1e6;
        };
        await timeOf(user.email); // прогрів
        const existing = await timeOf(user.email);
        ctx.rateLimit.resetAll();
        const ghost = await timeOf('ghost@example.test');
        // dummy-хеш має ту саму вартість (10 раундів) — відповідь не «миттєва».
        expect(ghost).toBeGreaterThan(existing * 0.3);
      });
    });
  });

  describe('довірений проксі (TRUSTED_PROXY_HOPS=1)', () => {
    let ctx: TestContext;
    beforeAll(async () => {
      ctx = await createTestApp({ TRUSTED_PROXY_HOPS: '1' });
    });
    afterAll(async () => {
      await ctx.close();
    });
    beforeEach(async () => {
      await resetDatabase(ctx.prisma);
      ctx.rateLimit.resetAll();
    });

    it('IP клієнта береться з X-Forwarded-For, доданого довіреним проксі (останній запис)', async () => {
      // Реальний клієнт — 7.7.7.7 (дописав проксі); 6.6.6.x — підробка, надіслана клієнтом.
      for (let i = 0; i < 20; i += 1) {
        const proxy = ctx.client({ ip: '172.16.0.10' });
        await proxy.post(
          '/api/auth/login',
          { email: `ghost${i}@example.test`, password: 'Wrong1pass!' },
          { headers: { 'x-forwarded-for': `6.6.6.${i}, 7.7.7.7` } },
        );
      }
      const user = await createUser(ctx.prisma);
      const blocked = await ctx.client({ ip: '172.16.0.10' }).post(
        '/api/auth/login',
        { email: user.email, password: TEST_PASSWORD },
        { headers: { 'x-forwarded-for': '6.6.6.99, 7.7.7.7' } },
      );
      expect(blocked.status).toBe(429);

      // Інший реальний клієнт за тим самим проксі не зачеплений
      const other = await ctx.client({ ip: '172.16.0.10' }).post(
        '/api/auth/login',
        { email: user.email, password: TEST_PASSWORD },
        { headers: { 'x-forwarded-for': '8.8.8.8' } },
      );
      expect(other.status).toBe(200);
    });
  });

  describe('CAPTCHA (детермінований test-адаптер)', () => {
    let ctx: TestContext;
    beforeAll(async () => {
      ctx = await createTestApp({ CAPTCHA_PROVIDER: 'test', CAPTCHA_REQUIRED: 'true' });
    });
    afterAll(async () => {
      await ctx.close();
    });
    beforeEach(async () => {
      await resetDatabase(ctx.prisma);
      ctx.rateLimit.resetAll();
    });

    it('register/login/forgot/resend без токена → 400 CAPTCHA_REQUIRED', async () => {
      const user = await createUser(ctx.prisma);
      const calls: Array<[string, unknown]> = [
        ['/api/auth/register', { email: 'c@example.test', ...NEW_ACCOUNT }],
        ['/api/auth/login', { email: user.email, password: TEST_PASSWORD }],
        ['/api/auth/request-password-reset', { email: user.email }],
        ['/api/auth/resend-verification', { email: user.email }],
      ];
      for (const [url, body] of calls) {
        const res = await ctx.client().post(url, body);
        expect(res.status).toBe(400);
        expect(res.field('code')).toBe('CAPTCHA_REQUIRED');
      }
    });

    it('невірний токен → 400 CAPTCHA_FAILED, вхід не виконується', async () => {
      const user = await createUser(ctx.prisma);
      const res = await ctx.client().post('/api/auth/login', {
        email: user.email,
        password: TEST_PASSWORD,
        captchaToken: 'wrong',
      });
      expect(res.status).toBe(400);
      expect(res.field('code')).toBe('CAPTCHA_FAILED');
      expect(await ctx.prisma.session.count()).toBe(0);
    });

    it('правильний токен пропускає', async () => {
      const user = await createUser(ctx.prisma);
      const res = await ctx.client().post('/api/auth/login', {
        email: user.email,
        password: TEST_PASSWORD,
        captchaToken: TEST_CAPTCHA_PASS_TOKEN,
      });
      expect(res.status).toBe(200);
    });
  });

  describe('CAPTCHA (віддалений провайдер, мережа замінена stub-ом)', () => {
    let ctx: TestContext;
    beforeAll(async () => {
      ctx = await createTestApp({
        CAPTCHA_PROVIDER: 'turnstile',
        CAPTCHA_REQUIRED: 'true',
        CAPTCHA_SECRET_KEY: 'unit-test-secret',
      });
    });
    afterAll(async () => {
      await ctx.close();
    });
    beforeEach(async () => {
      await resetDatabase(ctx.prisma);
      ctx.rateLimit.resetAll();
    });
    afterEach(() => jest.restoreAllMocks());

    const loginBody = (email: string) => ({ email, password: TEST_PASSWORD, captchaToken: 'provider-token' });

    it('success:true → пропускає; на провайдер відправляється секрет і токен', async () => {
      const user = await createUser(ctx.prisma);
      const spy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
      const res = await ctx.client().post('/api/auth/login', loginBody(user.email));
      expect(res.status).toBe(200);
      const [url, init] = spy.mock.calls[0];
      expect(String(url)).toContain('challenges.cloudflare.com/turnstile');
      expect(String((init as RequestInit).body)).toContain('secret=unit-test-secret');
      expect(String((init as RequestInit).body)).toContain('response=provider-token');
    });

    it('success:false → CAPTCHA_FAILED', async () => {
      const user = await createUser(ctx.prisma);
      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 }));
      const res = await ctx.client().post('/api/auth/login', loginBody(user.email));
      expect(res.status).toBe(400);
      expect(res.field('code')).toBe('CAPTCHA_FAILED');
    });

    it('провайдер недоступний → fail closed (503 CAPTCHA_UNAVAILABLE), вхід не виконується', async () => {
      const user = await createUser(ctx.prisma);
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
      const res = await ctx.client().post('/api/auth/login', loginBody(user.email));
      expect(res.status).toBe(503);
      expect(res.field('code')).toBe('CAPTCHA_UNAVAILABLE');
      expect(await ctx.prisma.session.count()).toBe(0);
    });
  });
});
