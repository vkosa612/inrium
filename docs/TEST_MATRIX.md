# INRIUM — матриця тестів

Статуси: **PASS** / **FAIL** / **BLOCKED** / **NOT RUN**.

## Backend (Jest, ізольована БД `inrium_test`)

| Файл | Що покриває | Примітка |
|------|-------------|----------|
| `access-control.e2e-spec.ts` | Permission matrix, IDOR/BOLA, DRAFT leak, mass assignment, race approve, blocked session | ~40 кейсів |
| `auth-session.e2e-spec.ts` | Cookie auth, refresh rotation, reuse, parallel refresh, logout | |
| `csrf-cors.e2e-spec.ts` | CSRF, Origin, wildcard CORS | |
| `rate-limit-captcha.e2e-spec.ts` | Auth limits, CAPTCHA required/fail-closed, enumeration | |
| `email-lifecycle.e2e-spec.ts` | Register → verify → login, reset, resend, unverified block | |
| `email-smtp.integration.spec.ts` | Реальний SMTP у Mailpit | Потребує Mailpit |
| `uploads.e2e-spec.ts` | MIME, magic, size, 403 чужої гри | |
| `image-validation.spec.ts` | Magic bytes unit | |
| `admin-stats.e2e-spec.ts` | Реальні агрегати, рольова видимість users | |
| `auth-required-code.e2e-spec.ts` | Код `AUTH_REQUIRED` vs бізнес-401 | |
| `env-validation.spec.ts` | Production fail-fast | |
| `security-config.spec.ts` | Cookie attributes | |
| `seed-guard.spec.ts` | Seed не в production без прапорця | |

Запуск:

```bash
docker compose -f docker-compose.test.yml up -d --wait
pnpm --filter @inrium/backend test --runInBand
```

`db-guard` відмовляється працювати з URL без суфікса `_test`.

## Frontend (Vitest)

| Файл | Що покриває |
|------|-------------|
| `tests/http.test.ts` | CSRF header, credentials, no localStorage tokens, refresh single-flight |
| `tests/markdown-xss.test.tsx` | Небезпечний HTML у markdown |
| `tests/auth-redirect.test.ts` | Guard redirect |

```bash
pnpm --filter @inrium/frontend test
pnpm --filter @inrium/frontend typecheck
pnpm --filter @inrium/frontend lint
```

## Browser e2e (Playwright)

| Файл | Що покриває | Умова |
|------|-------------|--------|
| `e2e/auth.spec.ts` | Публічні сторінки, login/register, HttpOnly cookies, logout | Потрібен живий стек `E2E_BASE_URL` |
| `e2e/admin.spec.ts` | Реальні лічильники адмінки | Skip без `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` → **NOT RUN**, не PASS |

CI job `e2e` піднімає Docker stack, `scripts/smoke-api.mjs`, потім Playwright.

Локальний прогін 2026-10-17 (Docker, `E2E_BASE_URL=http://localhost:3000`): **14 PASS**, admin spec **NOT RUN** (skip без `E2E_ADMIN_*`). Раніше той самий auth-сценарій падав із `Failed to fetch`, бо образ фронтенду вшивав `NEXT_PUBLIC_API_URL=http://localhost:4200/api` з `.env` — виправлено: Docker завжди вшиває `/api`.

## Інфра

| Перевірка | Де |
|-----------|-----|
| Compose config dev | CI job `docker` |
| Prod compose без секретів має падати | CI job `docker` |
| Backup script fail-fast | `scripts/backup.sh` |
| Restore | `scripts/restore.sh` — **restore на ізольованому стенді в цьому прогоні: NOT RUN** |

## Що не є доказом PASS

- Моки замість HTTP до test-app.
- Playwright skip без credentials.
- Відсутній SMTP-провайдер (реальна доставка — BLOCKED).
