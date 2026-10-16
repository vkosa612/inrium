import { defineConfig, devices } from '@playwright/test';

/**
 * Браузерні e2e проти ВЖЕ запущеного стеку (frontend + backend + БД), напр. `docker compose up -d`.
 * Стек для e2e має бути в dev-режимі: REQUIRE_EMAIL_VERIFICATION=false, CAPTCHA_REQUIRED=false
 * (тести реєструють звичайного користувача через UI і одразу входять).
 *
 *   E2E_BASE_URL=http://localhost:3000 pnpm --filter @inrium/frontend e2e
 *
 * Origin має збігатися з CORS_ORIGIN backend (localhost ≠ 127.0.0.1).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    locale: 'uk-UA',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
