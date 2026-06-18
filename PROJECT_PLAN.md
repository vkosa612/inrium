# INRIUM — Project Plan & Roadmap

> Останнє оновлення: 2026-06-19  
> Джерело: фактичний стан репозиторію (`apps/`, `packages/`, `docker/`, Prisma migrations, routes, modules).

---

## Current Status

INRIUM — self-hosted TTRPG-платформа (monorepo, Docker-first). **Робочий MVP** для публічного контенту, CMS, auth, SEO та базової взаємодії користувача.

| Область | Стан |
|---------|------|
| Docker Compose (postgres, backend, frontend) | ✅ Працює |
| Auth (JWT access + refresh, RBAC, sessions) | ✅ Працює |
| CMS (content, systems, kits) | ✅ Працює |
| Public pages (news, articles, help, systems, kits, search) | ✅ Працює |
| SEO (metadata, sitemap, robots) + pagination | ✅ Працює |
| Markdown editor + cover upload у CMS | ✅ Працює |
| Public access hardening | ✅ Реалізовано в коді |
| Profile + bookmarks | ✅ Реалізовано в коді |
| Games / Sessions / Community | ❌ Не реалізовано |
| CI/CD, production deploy automation | ❌ Немає |

**Prisma migrations (5):**

1. `20260612203123_init_schema`
2. `20260612210348_add_session_model`
3. `20260614182900_add_systems_kits`
4. `20260619000000_add_bookmarks`

---

## Architecture

```
inrium/
├── apps/
│   ├── backend/          NestJS 11 + Fastify, Prisma 6, PostgreSQL
│   │   ├── prisma/       schema, migrations, seed
│   │   └── src/modules/  auth, content, systems, kits, help, home,
│   │                     health, uploads, users, bookmarks
│   └── frontend/         Next.js 15 App Router, React 19, Tailwind 4
│       └── src/app/      public + admin + profile routes
├── packages/shared/      @inrium/shared (types)
├── docker/               Dockerfiles, backend-entrypoint
├── uploads/              local image storage (gitignored, .gitkeep only)
├── docker-compose.yml
├── .env.example
└── README.md
```

**Runtime (Docker Compose):**

| Service | Port | Notes |
|---------|------|-------|
| frontend | 3000 | Public entry point |
| backend | 4200 | API `/api/*`, static `/uploads/*` |
| postgres | 127.0.0.1:5432 | Localhost only |
| adminer | 127.0.0.1:8080 | Profile `tools` only |

**Backend modules → API prefix `/api`:**

| Module | Key routes |
|--------|------------|
| auth | `POST register/login/refresh/logout`, `GET me` |
| content | public list/detail; admin CRUD |
| help | `GET /help`, `GET /help/:slug` |
| systems | public + admin CRUD |
| kits | public + admin CRUD |
| home | `GET /home`, `GET /search`, `GET /sitemap` |
| health | `GET /health` (+ DB ping) |
| uploads | `POST /uploads/image` (ADMIN/EDITOR) |
| users | `PATCH /users/me`, `POST /users/me/change-password` |
| bookmarks | `GET/POST /bookmarks`, `DELETE /bookmarks/:id`, `GET /bookmarks/check` |

**Frontend public routes:**

`/`, `/news`, `/articles`, `/content/[slug]`, `/help`, `/help/[slug]`, `/systems`, `/systems/[slug]`, `/kits`, `/kits/[slug]`, `/search`, `/login`, `/register`, `/profile`

**Frontend admin routes:**

`/admin`, `/admin/content`, `/admin/systems`, `/admin/kits` (+ new/edit)

**Prisma models (in use):** User, Session, Category, Tag, ContentItem, ContentTag, GameSystem, Kit, Bookmark, HomePageBlock (seed only), Game (schema only, no API)

---

## Completed Milestones

### 1. Monorepo & Docker foundation
- pnpm workspaces (`apps/*`, `packages/shared`)
- Multi-stage Dockerfiles, `docker compose up --build`
- Postgres healthcheck, backend healthcheck (`node` probe), `depends_on: service_healthy`
- Auto migrate on backend start (`backend-entrypoint.sh`)

### 2. Backend foundation & security layer
- Env validation (joi), global ValidationPipe, exception filter, response wrapper
- Helmet, throttler (global + stricter auth endpoints)
- JWT auth + refresh sessions in DB, `@Public()`, `@Roles()`, RBAC guards
- `SWAGGER_ENABLED` toggle

### 3. Content CMS & public API
- ContentItem (NEWS, ARTICLE, HELP_PAGE, …), categories, tags
- Public filters + pagination (`hasNextPage`, `hasPrevPage`)
- Admin CRUD for content (ADMIN/EDITOR)

### 4. Game Systems & Kits
- Dedicated `GameSystem` / `Kit` models (not only ContentItem)
- Public list/detail + admin CRUD
- Filters on listing pages

### 5. Help / knowledge base
- `HELP_PAGE` content type, `/api/help`, `/help`, `/help/[slug]`
- Search integration, homepage section

### 6. Homepage & global search
- `GET /api/home` aggregated data
- `GET /api/search?q=`
- Homepage uses **real API** (inline components in `app/page.tsx`)

### 7. Markdown & CMS UX
- `MarkdownEditor` (toolbar, preview via `MarkdownContent`)
- Integrated in ContentForm, SystemForm, KitForm

### 8. Image / cover upload
- `POST /api/uploads/image`, local storage `./uploads`
- `ImageUpload` component, Next.js proxy `/uploads/[...path]`
- Docker volume persistence

### 9. SEO & pagination
- `generateMetadata` on detail pages, static metadata on listings
- `sitemap.ts`, `robots.ts`, `GET /api/sitemap`
- Reusable `Pagination` + `PaginationWrapper`

### 10. Public access hardening
- Postgres/Adminer bound to `127.0.0.1`
- Adminer in compose profile `tools`
- `BACKEND_BIND`, CORS allowlist, README security section

### 11. User profile & bookmarks
- `PATCH /api/users/me`, change password with session revoke
- Bookmark model + CRUD/check API
- `/profile` (edit, password, saved items)
- `BookmarkButton` on content/help/systems/kits detail pages

---

## Partially Done / Needs Verification

| Item | Detail |
|------|--------|
| **Bookmarks migration in production DB** | Migration file exists; потрібно `docker compose up` + перевірити, що `migrate deploy` застосував `add_bookmarks` |
| **Legacy frontend components** | `HeroSection.tsx`, `MainFeed.tsx`, `SystemsGrid.tsx`, `KitsGrid.tsx`, `Sidebar.tsx`, `ContentCard.tsx`, `TopPicksPanel.tsx` + `lib/mock-data.ts` — **не імпортуються** ніде; homepage має власну реалізацію. Мертвий код / плутанина для розробників |
| **HomePageBlock CMS** | Model + seed є; **немає API/admin UI** — homepage hardcoded sections, не керується через blocks |
| **Game model** | У schema є `Game` + `GameStatus`; **немає module/API/frontend** |
| **Placeholder header links** | `/about`, `/advertise`, `/contacts` — посилання в Header, **сторінок немає** (404) |
| **Kits listing thumbnails** | `/kits` list cards **без** `imageUrl` (на відміну від `/systems`) |
| **Original stack extras** | TanStack Query, React Hook Form, Zod — **не встановлені** у `apps/frontend/package.json`; forms на `useState` |
| **Automated tests** | Немає unit/e2e test suite у repo |
| **CI/CD** | Немає `.github/workflows` |
| **Production HTTPS / reverse proxy** | Документовано в README частково; Nginx/Caddy config **не в repo** |
| **Git commit hygiene** | Переконатися, що `.env` і `uploads/*` не в індексі перед push |

---

## Risks / Technical Debt

1. **Dead mock-data layer** — ризик випадкового повернення до mock замість API; варто видалити або явно позначити deprecated.
2. **Backend exposed on `:4200`** — у dev браузер ходить на `NEXT_PUBLIC_API_URL`; для public prod краще same-origin proxy або `BACKEND_BIND=127.0.0.1`.
3. **Uploads on local disk** — без backup policy uploads губляться при втраті volume; README згадує backup, але немає скрипта.
4. **No automated migration verification** — нові migrations (bookmarks) можуть не застосуватись, якщо container стартує з помилкою непомітно.
5. **HomePageBlock unused** — schema complexity без функціоналу.
6. **Game entity orphan** — schema без implementation; або implement, або document as future.
7. **No rate limit on upload endpoint** — окремий throttle тільки на auth; upload захищений role, але без per-IP upload cap.
8. **README vs PROJECT_PLAN** — README має скорочений roadmap; цей файл — source of truth для планування.

---

## Next Priority

### Рекомендований перший крок: **Stabilization & cleanup sprint**

**Чому саме це:**

- Великий блок функціоналу вже злитий (profile, bookmarks, uploads, SEO); перед новими фічами варто **зменшити техборг і ризики**.
- Є конкретні quick wins без нових доменних модулей.

**Scope (без нових product features):**

1. **Verify & document** — прогнати Docker build, застосувати migrations, manual checklist profile/bookmarks/uploads.
2. **Remove or archive dead mock components** — `mock-data.ts`, unused `HeroSection`/`MainFeed`/… (або один PR «cleanup»).
3. **Fix placeholder routes** — мінімальні сторінки `/about`, `/contacts` (static markdown) або прибрати links з Header.
4. **Optional:** thumbnails на `/kits` listing (reuse pattern from `/systems`).

> **Не починати** Games/Sessions/Community, поки не закрито stabilization — інакше schema drift і mock-debt зростуть.

---

## Later Backlog

Пріоритет після stabilization (орієнтовно):

| # | Етап | Опис |
|---|------|------|
| 1 | **Homepage blocks CMS** | Admin UI для `HomePageBlock`, dynamic homepage layout |
| 2 | **Category/Tag admin** | CRUD для categories/tags (зараз тільки через seed/DB) |
| 3 | **Games / Sessions** | `Game` model → API → `/games`, заявки гравців |
| 4 | **Email verification & password reset** | Self-service flows |
| 5 | **Public user profiles** | `/users/[id]` read-only для GM/players |
| 6 | **Production infra** | Nginx/Caddy, HTTPS, env templates for prod |
| 7 | **CI/CD** | GitHub Actions: lint, build, optional deploy |
| 8 | **Observability** | Structured logging (Pino), error tracking |
| 9 | **Image pipeline** | Crop/resize on upload, optional S3 later |
| 10 | **Community features** | Коментарі, події — **не раніше** ніж sessions stable |

---

## Manual Verification Commands

### Docker lifecycle

```powershell
cd D:\inrium
docker compose down --remove-orphans
docker compose --progress=plain build
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

### HTTP smoke tests

```powershell
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:3000/news -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:3000/help -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:3000/sitemap.xml -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:3000/robots.txt -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:3000/profile -UseBasicParsing | Select-Object StatusCode
(Invoke-WebRequest http://localhost:4200/api/health -UseBasicParsing).Content | ConvertFrom-Json
```

### Security checks

```powershell
# Swagger off in prod (.env: SWAGGER_ENABLED=false)
Invoke-WebRequest http://localhost:4200/api/docs -UseBasicParsing | Select-Object StatusCode

# Adminer NOT running by default
docker compose ps
netstat -ano | findstr ":8080"

# Postgres localhost only
netstat -ano | findstr ":5432"
```

### Git hygiene (before commit/push)

```powershell
cd D:\inrium
git status -sb
git ls-files .env
git ls-files uploads/
git check-ignore -v uploads/.gitkeep
```

### Browser checklist (profile + bookmarks)

1. Login → `/profile` → edit displayName/bio/avatar → save
2. Open article, help, system, kit → «Зберегти»
3. `/profile` → items in «Збережене»
4. Toggle off bookmark → item removed
5. Logout → detail pages show «Увійдіть, щоб зберегти»
6. Change password → redirect login, old refresh invalid

---

## Security Rules (mandatory)

| Rule | Implementation |
|------|----------------|
| **Never commit `.env`** | Listed in `.gitignore`; use `.env.example` only |
| **Never commit uploaded files** | `uploads/*` gitignored; only `uploads/.gitkeep` tracked |
| **Never expose Adminer/Postgres to WAN** | `127.0.0.1` bindings; Adminer profile `tools` |
| **Do not break Docker/auth/CMS casually** | Test with `docker compose build` after infra/auth changes |
| **Change JWT secrets before public deploy** | Documented in README |
| **Swagger off in public mode** | `SWAGGER_ENABLED=false` |
| **CORS allowlist** | No `*` in production; set `CORS_ORIGIN` to frontend origin(s) |

---

## Document maintenance

- Оновлювати цей файл після кожного завершеного етапу або значного refactor.
- README — quick start + security; **PROJECT_PLAN.md** — roadmap і technical truth.
- Наступна реалізація фіч — **тільки після явного підтвердження** в task/chat.
