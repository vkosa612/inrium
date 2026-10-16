import { ContentStatus, ContentType, UserRole, UserStatus } from '@prisma/client';
import { createLoggedInUser, createUser, resetDatabase } from './support/factories';
import { createTestApp, TestContext } from './support/test-app';

interface Stats {
  content: { total: number; published: number; drafts: number; news: number; articles: number };
  systems: number;
  kits: number;
  communities: number;
  games: number;
  users: { total: number; blocked: number } | null;
}

describe('GET /api/admin/stats', () => {
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

  async function seedContent(authorId: string) {
    const base = { authorId, excerpt: 'e', content: 'c' };
    await ctx.prisma.contentItem.createMany({
      data: [
        { ...base, title: 'N1', slug: 'n1', type: ContentType.NEWS, status: ContentStatus.PUBLISHED },
        { ...base, title: 'N2', slug: 'n2', type: ContentType.NEWS, status: ContentStatus.DRAFT },
        { ...base, title: 'A1', slug: 'a1', type: ContentType.ARTICLE, status: ContentStatus.PUBLISHED },
      ],
    });
  }

  it('рахує реальні дані та показує кількість користувачів адміністратору', async () => {
    const admin = await createLoggedInUser(ctx, { role: UserRole.ADMIN });
    await createUser(ctx.prisma, { status: UserStatus.BLOCKED });
    await createUser(ctx.prisma, { status: UserStatus.DELETED });
    await seedContent(admin.user.id);

    const res = await admin.client.get('/api/admin/stats');
    expect(res.status).toBe(200);
    const stats = res.data<Stats>();
    expect(stats.content).toEqual({ total: 3, published: 2, drafts: 1, news: 2, articles: 1 });
    // admin + blocked (DELETED не враховується)
    expect(stats.users).toEqual({ total: 2, blocked: 1 });
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('редактору не розкриває кількість користувачів', async () => {
    const editor = await createLoggedInUser(ctx, { role: UserRole.EDITOR });
    await seedContent(editor.user.id);

    const res = await editor.client.get('/api/admin/stats');
    expect(res.status).toBe(200);
    const stats = res.data<Stats>();
    expect(stats.users).toBeNull();
    expect(stats.content.total).toBe(3);
  });

  it('гравцеві — 403, анонімові — 401', async () => {
    const player = await createLoggedInUser(ctx, { role: UserRole.PLAYER });
    expect((await player.client.get('/api/admin/stats')).status).toBe(403);
    expect((await ctx.client().get('/api/admin/stats')).status).toBe(401);
  });
});
