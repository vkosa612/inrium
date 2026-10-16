# INRIUM — технічний baseline

Дата аудиту: 2026-10-17  
HEAD (на момент аудиту): `3447c0f` — Admin stats, Mailpit SMTP test, Playwright e2e, CI e2e

## Що є в репозиторії (факт)

| Шар | Стан |
|-----|------|
| Monorepo pnpm (`apps/backend`, `apps/frontend`, `packages/shared`) | Так |
| Lockfile `pnpm-lock.yaml` | Так; CI: `pnpm install --frozen-lockfile` |
| NestJS 11 + Fastify 5 + Prisma 6 + PostgreSQL 16 | Так |
| Next.js 15 App Router | Так |
| Docker Compose (dev override + prod overlay + test DB) | Так |
| Cookie HttpOnly auth (`inrium_at`, `inrium_rt`) | Так — **не** localStorage |
| CSRF (signed double-submit + session binding) | Так |
| Rate limit (IP + account, окремі ліміти auth) | Так; in-memory (обмеження multi-replica задокументовано) |
| CAPTCHA adapter (none / turnstile / hcaptcha / test) | Так; test заборонений у production |
| Email: verify, resend, reset; anti-enumeration | Так |
| IDOR/BOLA тести + public DRAFT clamp | Так |
| Admin stats з БД | Так |
| `/privacy`, `/terms` (чернетки DRAFT) | Так |
| CI: lint, typecheck, unit/integration, frontend tests, compose config, e2e | Так |
| Автотести проти ізольованої `_test` БД (`db-guard`) | Так |

## Git

- `.env` ігнорується.
- Реальних секретів у tracked files немає; `.env.example` — лише placeholder-и.

## Docker

- `docker-compose.yml` — postgres без WAN-портів, volumes `postgres_data` + `uploads_data`, healthchecks, non-root.
- `docker-compose.override.yml` — локальні порти, Adminer (`--profile tools`), Mailpit (`--profile mail`).
- `docker-compose.prod.yml` — секрети обов'язкові, `REQUIRE_EMAIL_VERIFICATION=true`.
- `docker-compose.test.yml` — Postgres `127.0.0.1:55432` (tmpfs) + Mailpit profile.
- Backend image: Node 22 alpine, `pnpm deploy --prod`, `tini`, `prisma migrate deploy` на старті.

## Auth / session (факт)

- Access + refresh у HttpOnly cookies; JSON login **не** повертає токени, лише `{ user }`.
- Refresh: ротація, hash у БД, reuse detection з grace-вікном для вкладок.
- Logout / password change / reset / delete-account відкликають сесії.
- JWT strategy перевіряє користувача в БД (role/status).
- Frontend: `credentials: 'include'`, CSRF header, single-flight refresh.

## Відомі обмеження (не P0 коду)

- Rate limit in-memory — не shared між репліками.
- Uploads — локальний том, не object storage.
- Реальна доставка email, CAPTCHA keys, домен/HTTPS — зовнішні.
- Playwright admin e2e без `E2E_ADMIN_*` — skip (NOT RUN).
- Docker frontend **завжди** вшиває `NEXT_PUBLIC_API_URL=/api`. Значення з `.env` на кшталт `http://localhost:4200/api` ламає cookie-auth у браузері (CSP `connect-src 'self'` → `Failed to fetch`).
