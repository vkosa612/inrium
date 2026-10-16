import { createLoggedInUser, createUser, resetDatabase, TEST_PASSWORD } from './support/factories';
import { createTestApp, TestContext } from './support/test-app';

describe('CSRF, Origin та CORS', () => {
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

  describe('CSRF-токен', () => {
    it('GET /auth/csrf видає токен і ставить HttpOnly cookie-nonce, відповідь не кешується', async () => {
      const res = await ctx.client().get('/api/auth/csrf');
      expect(res.status).toBe(200);
      expect(res.data<{ csrfToken: string }>().csrfToken).toMatch(/^[\w-]+\.[\w-]+$/);
      const cookie = res.setCookies.find((c) => c.startsWith('inrium_csrf='));
      expect(cookie).toMatch(/HttpOnly/i);
      expect(res.headers['cache-control']).toMatch(/no-store/);
    });

    it.each([
      ['POST', '/api/auth/login', { email: 'a@example.test', password: 'x' }],
      ['POST', '/api/auth/register', { email: 'a@example.test', password: 'Passw0rd!', displayName: 'Abc' }],
      ['POST', '/api/auth/logout', undefined],
      ['POST', '/api/auth/refresh', undefined],
      ['POST', '/api/auth/request-password-reset', { email: 'a@example.test' }],
      ['POST', '/api/auth/reset-password', { token: 'x', newPassword: 'Passw0rd!' }],
      ['POST', '/api/auth/verify-email', { token: 'x' }],
      ['POST', '/api/auth/resend-verification', { email: 'a@example.test' }],
    ])('публічний %s %s без CSRF-токена → 403 CSRF_INVALID', async (method, url, body) => {
      const res = await ctx.client().send(method, url, { body, csrf: 'none' });
      expect(res.status).toBe(403);
      expect(res.field('code')).toBe('CSRF_INVALID');
    });

    it.each([
      ['PATCH', '/api/users/me'],
      ['POST', '/api/games'],
      ['PATCH', '/api/users/abc/role'],
      ['DELETE', '/api/games/x'],
    ])('приватний %s %s без токена відхиляється CSRF-guard\'ом ДО перевірки прав', async (method, url) => {
      const { client } = await createLoggedInUser(ctx);
      const res = await client.send(method, url, { body: {}, csrf: 'none' });
      expect(res.status).toBe(403);
      expect(res.field('code')).toBe('CSRF_INVALID');
    });

    it('GET/HEAD-запити не потребують токена', async () => {
      const { client } = await createLoggedInUser(ctx);
      expect((await client.get('/api/auth/me')).status).toBe(200);
    });

    it('підроблений токен (невалідний підпис) відхиляється', async () => {
      const client = ctx.client();
      const token = await client.fetchCsrfToken();
      const [nonce] = token.split('.');
      const res = await client.post('/api/auth/logout', undefined, { csrf: `${nonce}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` });
      expect(res.status).toBe(403);
    });

    it('токен без відповідного cookie-nonce (інший браузер) відхиляється', async () => {
      const victimToken = await ctx.client().fetchCsrfToken();
      const attacker = ctx.client({ ip: '10.5.5.5' }); // немає cookie inrium_csrf
      const res = await attacker.post('/api/auth/logout', undefined, { csrf: victimToken });
      expect(res.status).toBe(403);
    });

    it('токен, виданий анонімно, НЕ діє після входу (прив\'язка до сесії)', async () => {
      const user = await createUser(ctx.prisma);
      const client = ctx.client();
      const anonToken = await client.fetchCsrfToken();
      const login = await client.post('/api/auth/login', { email: user.email, password: TEST_PASSWORD }, { csrf: anonToken });
      expect(login.status).toBe(200);

      const stale = await client.patch('/api/users/me', { bio: 'x' }, { csrf: anonToken });
      expect(stale.status).toBe(403);

      const fresh = await client.patch('/api/users/me', { bio: 'x' }); // клієнт отримує новий токен
      expect(fresh.status).toBe(200);
    });

    it('токен однієї сесії не підходить іншій сесії', async () => {
      const a = await createLoggedInUser(ctx);
      const b = await createLoggedInUser(ctx);
      const tokenA = await a.client.fetchCsrfToken();
      // b підставляє токен a, але має власне cookie-nonce → не збігається
      const res = await b.client.patch('/api/users/me', { bio: 'x' }, { csrf: tokenA });
      expect(res.status).toBe(403);
    });

    it('ротація refresh не інвалідує CSRF-токен (прив\'язка до сім\'ї, а не до токена)', async () => {
      const { client } = await createLoggedInUser(ctx);
      const token = await client.fetchCsrfToken();
      await client.post('/api/auth/refresh'); // ротація
      const res = await client.patch('/api/users/me', { bio: 'ok' }, { csrf: token });
      expect(res.status).toBe(200);
    });

    it('multipart-завантаження теж потребує CSRF-токена', async () => {
      const { client } = await createLoggedInUser(ctx, { role: 'ADMIN' });
      const res = await client.upload(
        '/api/uploads/image',
        { filename: 'a.png', contentType: 'image/png', content: Buffer.from('x') },
        { csrf: 'none' },
      );
      expect(res.status).toBe(403);
      expect(res.field('code')).toBe('CSRF_INVALID');
    });
  });

  describe('Origin / Referer', () => {
    it('чужий Origin відхиляється навіть із коректним CSRF-токеном', async () => {
      const client = ctx.client();
      const res = await client.post('/api/auth/logout', undefined, { origin: 'https://evil.example' });
      expect(res.status).toBe(403);
      expect(res.field('code')).toBe('ORIGIN_NOT_ALLOWED');
    });

    it('Origin: null відхиляється', async () => {
      const res = await ctx.client().post('/api/auth/logout', undefined, { headers: {}, origin: 'null' });
      expect(res.status).toBe(403);
      expect(res.field('code')).toBe('ORIGIN_NOT_ALLOWED');
    });

    it('відсутність і Origin, і Referer → відмова', async () => {
      const res = await ctx.client().post('/api/auth/logout', undefined, { origin: null });
      expect(res.status).toBe(403);
      expect(res.field('code')).toBe('ORIGIN_NOT_ALLOWED');
    });

    it('без Origin допускається лише дозволений Referer', async () => {
      const ok = await ctx.client().post('/api/auth/logout', undefined, {
        origin: null,
        referer: 'http://localhost:3000/some/page?x=1',
      });
      expect(ok.status).toBe(200);

      const bad = await ctx.client().post('/api/auth/logout', undefined, {
        origin: null,
        referer: 'https://evil.example/page',
      });
      expect(bad.status).toBe(403);
    });

    it('схожий на дозволений origin (суфікс/префікс/інший порт) відхиляється', async () => {
      for (const origin of [
        'http://localhost:3000.evil.example',
        'http://evil.localhost:3000',
        'http://localhost:3001',
        'https://localhost:3000',
      ]) {
        const res = await ctx.client().post('/api/auth/logout', undefined, { origin });
        expect(res.status).toBe(403);
      }
    });

    it('заголовок X-HTTP-Method-Override не обходить перевірку методу', async () => {
      const res = await ctx.client().send('GET', '/api/auth/logout', { headers: { 'x-http-method-override': 'POST' } });
      expect(res.status).toBe(404); // GET /auth/logout не існує — перевизначення методу ігнорується
    });
  });

  describe('CORS', () => {
    it('дозволений origin отримує ACAO + credentials', async () => {
      const res = await ctx.client().get('/api/health', { origin: 'http://localhost:3000' });
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('чужий origin не отримує ACAO і ніколи не отримує wildcard', async () => {
      const res = await ctx.client().get('/api/health', { origin: 'https://evil.example' });
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('preflight для дозволеного origin містить X-CSRF-Token та без wildcard', async () => {
      const res = await ctx.client().send('OPTIONS', '/api/auth/login', {
        origin: 'http://localhost:3000',
        headers: {
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type,x-csrf-token',
        },
      });
      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(String(res.headers['access-control-allow-headers']).toLowerCase()).toContain('x-csrf-token');
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('preflight для чужого origin відхиляється', async () => {
      const res = await ctx.client().send('OPTIONS', '/api/auth/login', {
        origin: 'https://evil.example',
        headers: { 'access-control-request-method': 'POST' },
      });
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Security headers та кешування', () => {
    it('API віддає базові security-заголовки та X-Request-Id', async () => {
      const res = await ctx.client().get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(String(res.headers['content-security-policy'])).toContain("default-src 'none'");
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('валідний вхідний X-Request-Id використовується, небезпечний — замінюється', async () => {
      const good = await ctx.client().get('/api/health', { headers: { 'x-request-id': 'abc-12345678' } });
      expect(good.headers['x-request-id']).toBe('abc-12345678');
      const bad = await ctx.client().get('/api/health', { headers: { 'x-request-id': 'bad id\r\n<script>' } });
      expect(bad.headers['x-request-id']).not.toContain('<');
    });

    it('відповіді з сесійними даними мають Cache-Control: no-store', async () => {
      const { client } = await createLoggedInUser(ctx);
      const res = await client.get('/api/auth/me');
      expect(res.headers['cache-control']).toMatch(/no-store/);
    });

    it('health не розкриває внутрішніх деталей', async () => {
      const res = await ctx.client().get('/api/health');
      expect(res.status).toBe(200);
      expect(res.data()).toEqual({ status: 'ok' });
    });

    it('помилки не містять стеку, query-string чи SQL', async () => {
      const res = await ctx.client().get('/api/games/not-existing?token=secret123');
      expect(res.status).toBe(404);
      expect(res.raw).not.toContain('secret123');
      expect(res.raw).not.toMatch(/at .*\.ts:\d+|prisma|SELECT /i);
    });
  });
});
