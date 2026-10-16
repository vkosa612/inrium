import { expect, test } from '@playwright/test';

/**
 * Адмін-панель із реальними лічильниками. Потрібен існуючий ADMIN-акаунт (створюється seed-ом або вручну):
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... pnpm --filter @inrium/frontend e2e admin
 * Без цих змінних тест пропускається (статус NOT RUN, а не PASS).
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD не задані');

test('адмін бачить реальні лічильники, без «Налаштування» і без заглушки статистики', async ({ page }) => {
  await page.goto('/login?next=/admin');
  await page.locator('input[type=email]').fill(EMAIL ?? '');
  await page.locator('input[type=password]').fill(PASSWORD ?? '');
  await page.getByRole('button', { name: 'Увійти' }).click();

  await expect(page.getByRole('heading', { name: 'Адмін-панель' })).toBeVisible();
  await expect(page.getByText('Користувачів', { exact: true })).toBeVisible();
  await expect(page.getByText('Детальна статистика буде додана пізніше')).toHaveCount(0);
  await expect(page.getByText('Налаштування')).toHaveCount(0);

  // Усі картки статистики — числа, а не «—».
  const values = await page.locator('main div[style*="font-size: 22px"]').allTextContents();
  expect(values.length).toBeGreaterThanOrEqual(8);
  for (const v of values) expect(v).toMatch(/^\d+$/);
});
