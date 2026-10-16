import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { UserRole } from '@prisma/client';
import { createGame, createLoggedInUser, resetDatabase } from './support/factories';
import { makeJpeg, makePng, makeWebp } from './support/images';
import { createTestApp, TestContext } from './support/test-app';

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

describe('Завантаження зображень', () => {
  let ctx: TestContext;
  let imagesDir: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    imagesDir = join(process.env.UPLOADS_DIR as string, 'images');
  });
  afterAll(async () => {
    await ctx.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.rateLimit.resetAll();
  });

  const filesOnDisk = () => listFiles(imagesDir);

  describe('POST /api/uploads/image', () => {
    it.each([
      ['PNG', 'image/png', () => makePng(16, 16), '.png'],
      ['JPEG', 'image/jpeg', () => makeJpeg(16, 16), '.jpg'],
      ['WebP', 'image/webp', () => makeWebp(16, 16), '.webp'],
    ])('EDITOR завантажує валідний %s; ім\'я генерує сервер', async (_n, contentType, make, ext) => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const res = await client.upload('/api/uploads/image', {
        filename: '../../evil name.php',
        contentType,
        content: make(),
      });
      expect(res.status).toBe(201);
      const body = res.data<{ url: string; filename: string; mimeType: string; size: number }>();
      expect(body.url).toMatch(new RegExp(`^/uploads/images/\\d{4}/\\d{2}/[0-9a-f]{32}\\${ext}$`));
      expect(body.filename).not.toContain('evil');
      expect(body.size).toBe(make().length);
    });

    it('завантажений файл віддається публічно з nosniff та обмежувальним CSP', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.ADMIN });
      const up = await client.upload('/api/uploads/image', {
        filename: 'a.png',
        contentType: 'image/png',
        content: makePng(),
      });
      const { url } = up.data<{ url: string }>();

      const res = await ctx.client().get(url, { cookies: false });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^image\/png/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(String(res.headers['content-security-policy'])).toMatch(/default-src 'none'/);
    });

    it('справжній PNG, заявлений як JPEG → 415, файл не лишається на диску', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const before = filesOnDisk().length;
      const res = await client.upload('/api/uploads/image', {
        filename: 'a.jpg',
        contentType: 'image/jpeg',
        content: makePng(),
      });
      expect(res.status).toBe(415);
      expect(filesOnDisk().length).toBe(before);
    });

    it.each([
      ['SVG з image/png', 'image/png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
      ['HTML з image/jpeg', 'image/jpeg', Buffer.from('<html><script>alert(1)</script></html>')],
      ['PHP-вміст з image/webp', 'image/webp', Buffer.from('<?php system($_GET["c"]); ?>')],
      ['GIF з image/png', 'image/png', Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'binary')],
    ])('підроблений вміст: %s → 415, без залишків на диску', async (_n, contentType, content) => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const before = filesOnDisk().length;
      const res = await client.upload('/api/uploads/image', { filename: 'x.png', contentType, content });
      expect(res.status).toBe(415);
      expect(filesOnDisk().length).toBe(before);
    });

    it.each([
      ['image/svg+xml'],
      ['text/html'],
      ['application/octet-stream'],
      ['image/gif'],
      ['application/x-php'],
    ])('заборонений MIME %s → 415', async (contentType) => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const res = await client.upload('/api/uploads/image', {
        filename: 'x.png',
        contentType,
        content: makePng(),
      });
      expect(res.status).toBe(415);
    });

    it('порожній файл → 400 і нічого на диску', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const before = filesOnDisk().length;
      const res = await client.upload('/api/uploads/image', {
        filename: 'x.png',
        contentType: 'image/png',
        content: Buffer.alloc(0),
      });
      expect(res.status).toBe(400);
      expect(filesOnDisk().length).toBe(before);
    });

    it('файл > 5 MB → 413 і нічого на диску', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const before = filesOnDisk().length;
      const big = Buffer.concat([makePng(), Buffer.alloc(5 * 1024 * 1024 + 1024)]);
      const res = await client.upload('/api/uploads/image', {
        filename: 'big.png',
        contentType: 'image/png',
        content: big,
      });
      expect(res.status).toBe(413);
      expect(filesOnDisk().length).toBe(before);
    });

    it.each([
      ['PNG 20000×20000', 'image/png', () => makePng(20000, 20000)],
      ['PNG 8193×10', 'image/png', () => makePng(8193, 10)],
      ['PNG 8192×8192 (>40 Mpx)', 'image/png', () => makePng(8192, 8192)],
      ['JPEG 60000×60000', 'image/jpeg', () => makeJpeg(60000, 60000)],
      ['PNG 0×0', 'image/png', () => makePng(0, 0)],
    ])('декомпресійна бомба/некоректні розміри: %s → 400 і без залишків', async (_n, contentType, make) => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const before = filesOnDisk().length;
      const res = await client.upload('/api/uploads/image', { filename: 'x.png', contentType, content: make() });
      expect(res.status).toBe(400);
      expect(filesOnDisk().length).toBe(before);
    });

    it('обрізаний заголовок (немає IHDR) → 400', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const res = await client.upload('/api/uploads/image', {
        filename: 'x.png',
        contentType: 'image/png',
        content: makePng().subarray(0, 10),
      });
      expect(res.status).toBe(400);
    });

    it('не multipart-запит → відхиляється (не 2xx, не 5xx)', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const res = await client.post('/api/uploads/image', { file: 'x' });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('multipart без файлу → 4xx', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
      const res = await client.send('POST', '/api/uploads/image', {
        rawBody: Buffer.from('--b--\r\n'),
        headers: { 'content-type': 'multipart/form-data; boundary=b' },
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    describe('права доступу', () => {
      it.each([[UserRole.PLAYER], [UserRole.GAME_MASTER]])('%s → 403', async (role) => {
        const { client } = await createLoggedInUser(ctx, { role });
        const before = filesOnDisk().length;
        const res = await client.upload('/api/uploads/image', {
          filename: 'a.png',
          contentType: 'image/png',
          content: makePng(),
        });
        expect(res.status).toBe(403);
        expect(filesOnDisk().length).toBe(before);
      });

      it('анонім → 401', async () => {
        const res = await ctx.client().upload('/api/uploads/image', {
          filename: 'a.png',
          contentType: 'image/png',
          content: makePng(),
        });
        expect(res.status).toBe(401);
      });

      it('без CSRF-токена → 403 CSRF_INVALID, файл не пишеться', async () => {
        const { client } = await createLoggedInUser(ctx, { role: UserRole.ADMIN });
        const before = filesOnDisk().length;
        const res = await client.upload(
          '/api/uploads/image',
          { filename: 'a.png', contentType: 'image/png', content: makePng() },
          { csrf: 'none' },
        );
        expect(res.status).toBe(403);
        expect(res.field('code')).toBe('CSRF_INVALID');
        expect(filesOnDisk().length).toBe(before);
      });

      it('з чужого Origin → 403', async () => {
        const { client } = await createLoggedInUser(ctx, { role: UserRole.ADMIN });
        const res = await client.upload(
          '/api/uploads/image',
          { filename: 'a.png', contentType: 'image/png', content: makePng() },
          { origin: 'https://evil.example' },
        );
        expect(res.status).toBe(403);
      });
    });
  });

  describe('POST /api/games/:id/cover', () => {
    it('власник-майстер оновлює обкладинку власної гри', async () => {
      const { user, client } = await createLoggedInUser(ctx, { role: UserRole.GAME_MASTER });
      const game = await createGame(ctx.prisma, user.id);
      const res = await client.upload(`/api/games/${game.id}/cover`, {
        filename: 'cover.png',
        contentType: 'image/png',
        content: makePng(32, 32),
      });
      expect(res.status).toBe(201);
      const stored = await ctx.prisma.game.findUnique({ where: { id: game.id } });
      expect(stored?.coverImageUrl).toMatch(/^\/uploads\/images\//);
    });

    it('чужий майстер → 403 і обкладинка не змінюється, файл не лишається', async () => {
      const owner = await createLoggedInUser(ctx, { role: UserRole.GAME_MASTER });
      const other = await createLoggedInUser(ctx, { role: UserRole.GAME_MASTER });
      const game = await createGame(ctx.prisma, owner.user.id);
      const before = filesOnDisk().length;
      const res = await other.client.upload(`/api/games/${game.id}/cover`, {
        filename: 'cover.png',
        contentType: 'image/png',
        content: makePng(),
      });
      expect(res.status).toBe(403);
      expect(filesOnDisk().length).toBe(before);
      const stored = await ctx.prisma.game.findUnique({ where: { id: game.id } });
      expect(stored?.coverImageUrl).toBeNull();
    });

    it('підроблений вміст відхиляється і для обкладинки гри', async () => {
      const { user, client } = await createLoggedInUser(ctx, { role: UserRole.GAME_MASTER });
      const game = await createGame(ctx.prisma, user.id);
      const res = await client.upload(`/api/games/${game.id}/cover`, {
        filename: 'cover.png',
        contentType: 'image/png',
        content: Buffer.from('<svg/>'),
      });
      expect(res.status).toBe(415);
    });
  });

  describe('Валідація URL зображень у DTO', () => {
    it.each([
      ['javascript:alert(1)'],
      ['data:image/svg+xml;base64,PHN2Zz4='],
      ['/uploads/../../etc/passwd'],
    ])('PATCH /users/me avatarUrl=%s → 400', async (avatarUrl) => {
      const { client } = await createLoggedInUser(ctx);
      const res = await client.patch('/api/users/me', { avatarUrl });
      expect(res.status).toBe(400);
    });

    it('PATCH /users/me приймає https та /uploads/…', async () => {
      const { client } = await createLoggedInUser(ctx);
      expect((await client.patch('/api/users/me', { avatarUrl: 'https://example.com/a.png' })).status).toBe(200);
      expect(
        (await client.patch('/api/users/me', { avatarUrl: '/uploads/images/2026/10/aaaa.png' })).status,
      ).toBe(200);
    });

    it('POST /games з coverImageUrl=javascript: → 400', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.GAME_MASTER });
      const res = await client.post('/api/games', {
        title: 'Тестова гра',
        description: 'Достатньо довгий опис для валідації гри.',
        coverImageUrl: 'javascript:alert(1)',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Статична віддача /uploads', () => {
    it('каталоги не лістяться', async () => {
      const { client } = await createLoggedInUser(ctx, { role: UserRole.ADMIN });
      await client.upload('/api/uploads/image', { filename: 'a.png', contentType: 'image/png', content: makePng() });
      for (const url of ['/uploads/', '/uploads/images/', '/uploads/images']) {
        const res = await ctx.client().get(url, { cookies: false });
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.raw).not.toMatch(/\.png/);
      }
    });

    it.each([
      ['/uploads/../package.json'],
      ['/uploads/%2e%2e/package.json'],
      ['/uploads/..%2fpackage.json'],
      ['/uploads/images/..%2f..%2f..%2fpackage.json'],
      ['/uploads/%2e%2e%2f%2e%2e%2fetc/passwd'],
      ['/uploads/.env'],
    ])('path traversal %s не віддає файли поза каталогом', async (url) => {
      const res = await ctx.client().get(url, { cookies: false });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.raw).not.toMatch(/"name"\s*:|root:/);
    });

    it('неіснуючий файл → 404', async () => {
      const res = await ctx.client().get('/uploads/images/2026/01/nope.png', { cookies: false });
      expect(res.status).toBe(404);
    });
  });
});
