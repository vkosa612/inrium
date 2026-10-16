import { expect, test, type Page } from '@playwright/test';

const stamp = Date.now().toString(36);
const EMAIL = `e2e-${stamp}@e2e.invalid`;
const PASSWORD = `E2e-${stamp}-Passw0rd!`;
const NAME = `E2E ${stamp}`;

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Увійти' }).click();
}

test.describe.configure({ mode: 'serial' });

test.describe('Публічні сторінки та захист маршрутів', () => {
  for (const path of ['/', '/privacy', '/terms', '/login', '/register']) {
    test(`${path} відкривається без помилок`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('анонім на /admin перенаправляється на /login із next', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/login\?next=%2Fadmin/);
    await expect(page.getByRole('heading', { name: 'Вхід до акаунту' })).toBeVisible();
  });

  test('анонім на /profile перенаправляється на /login', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/login/);
  });
});

test.describe('Реєстрація, вхід, вихід (реальний стек)', () => {
  test('реєстрація через UI', async ({ page }) => {
    await page.goto('/register');
    await page.locator('input[type=text]').first().fill(NAME);
    await page.locator('input[type=email]').fill(EMAIL);
    await page.locator('input[type=password]').first().fill(PASSWORD);
    await page.locator('button[type=submit]').click();
    await expect(page.getByTestId('register-done')).toBeVisible();
  });

  test('хибний пароль: помилка, залишаємось на /login', async ({ page }) => {
    await login(page, EMAIL, 'definitely-wrong-Pass1');
    await expect(page.locator('input[type=password]')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/невір|помилк/i).first()).toBeVisible();
  });

  test('успішний вхід: токенів немає в storage/JS-cookie, є кнопка виходу', async ({ page }) => {
    await login(page, EMAIL, PASSWORD);
    await expect(page.getByRole('button', { name: 'Вийти' })).toBeVisible();

    const leaked = await page.evaluate(() => {
      const dump = (s: Storage) => Object.keys(s).map((k) => `${k}=${s.getItem(k) ?? ''}`).join('\n');
      return { local: dump(localStorage), session: dump(sessionStorage), cookie: document.cookie };
    });
    const jwtLike = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./;
    expect(leaked.local).not.toMatch(jwtLike);
    expect(leaked.session).not.toMatch(jwtLike);
    expect(leaked.local.toLowerCase()).not.toContain('token');
    expect(leaked.cookie).not.toContain('inrium_at');
    expect(leaked.cookie).not.toContain('inrium_rt');

    // HttpOnly-cookie реально встановлені браузером, але недоступні JS.
    const cookies = await page.context().cookies();
    const at = cookies.find((c) => c.name === 'inrium_at');
    const rt = cookies.find((c) => c.name === 'inrium_rt');
    expect(at?.httpOnly).toBe(true);
    expect(rt?.httpOnly).toBe(true);
    expect(rt?.path).toBe('/api/auth');
  });

  test('гравець на /admin бачить «Доступ заборонено»', async ({ page }) => {
    await login(page, EMAIL, PASSWORD);
    await expect(page.getByRole('button', { name: 'Вийти' })).toBeVisible();
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Доступ заборонено' })).toBeVisible();
  });

  test('open redirect: next на чужий домен ігнорується', async ({ page }) => {
    await page.goto('/login?next=https://evil.example/phish');
    await page.locator('input[type=email]').fill(EMAIL);
    await page.locator('input[type=password]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Увійти' }).click();
    await expect(page.getByRole('button', { name: 'Вийти' })).toBeVisible();
    expect(new URL(page.url()).origin).toBe(new URL(test.info().project.use.baseURL ?? 'http://localhost:3000').origin);
  });

  test('вихід у одній вкладці синхронізується з іншою', async ({ context }) => {
    const a = await context.newPage();
    await login(a, EMAIL, PASSWORD);
    await expect(a.getByRole('button', { name: 'Вийти' })).toBeVisible();

    const b = await context.newPage();
    await b.goto('/');
    await expect(b.getByRole('button', { name: 'Вийти' })).toBeVisible();

    await a.getByRole('button', { name: 'Вийти' }).click();
    // Друга вкладка дізнається про вихід (BroadcastChannel) без перезавантаження.
    await expect(b.getByRole('button', { name: 'Вийти' })).toBeHidden({ timeout: 10_000 });
    await expect(b.locator('a[href="/login"]').first()).toBeVisible();
  });

  test('після виходу сесія недійсна: /profile → /login', async ({ page }) => {
    await login(page, EMAIL, PASSWORD);
    await expect(page.getByRole('button', { name: 'Вийти' })).toBeVisible();
    await page.getByRole('button', { name: 'Вийти' }).click();
    await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    await page.goto('/profile');
    await page.waitForURL(/\/login/);
  });
});
