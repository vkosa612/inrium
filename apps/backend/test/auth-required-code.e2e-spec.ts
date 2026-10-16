import { createLoggedInUser, createUser, resetDatabase } from './support/factories';
import { createTestApp, TestContext } from './support/test-app';

/**
 * Контракт для фронтенду: лише відсутня/прострочена/відкликана сесія дає 401 з кодом AUTH_REQUIRED
 * (клієнт робить refresh). 401 бізнес-логіки (невірний пароль) цього коду НЕ має — клієнт не повторює запит.
 */
describe('401 AUTH_REQUIRED', () => {
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

  it('анонім на захищеному ендпойнті → 401 AUTH_REQUIRED', async () => {
    const res = await ctx.client().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.field('code')).toBe('AUTH_REQUIRED');
  });

  it('відкликана сесія → 401 AUTH_REQUIRED', async () => {
    const { client, user } = await createLoggedInUser(ctx);
    await ctx.prisma.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    const res = await client.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.field('code')).toBe('AUTH_REQUIRED');
  });

  it('підроблений access cookie → 401 AUTH_REQUIRED', async () => {
    const client = ctx.client();
    client.setCookie('inrium_at', 'not.a.jwt');
    const res = await client.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.field('code')).toBe('AUTH_REQUIRED');
  });

  it('невірний поточний пароль при зміні пароля → 401 БЕЗ коду AUTH_REQUIRED', async () => {
    const { client } = await createLoggedInUser(ctx);
    const res = await client.post('/api/users/me/change-password', {
      currentPassword: 'WrongPass123!',
      newPassword: 'NewPass12345!',
    });
    expect(res.status).toBe(401);
    expect(res.field('code')).not.toBe('AUTH_REQUIRED');
  });

  it('невірний пароль при вході → 401 БЕЗ коду AUTH_REQUIRED', async () => {
    const user = await createUser(ctx.prisma);
    const res = await ctx.client().post('/api/auth/login', { email: user.email, password: 'WrongPass123!' });
    expect(res.status).toBe(401);
    expect(res.field('code')).not.toBe('AUTH_REQUIRED');
  });
});
