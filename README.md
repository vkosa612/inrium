# INRIUM

Платформа для настільних рольових ігор (TTRPG): гравці, майстри, ігрові події, заявки, спільноти та довідники.

## Стек

| Шар | Технології |
|-----|------------|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS |
| Backend | NestJS 11, Fastify, TypeScript |
| Database | PostgreSQL 16, Prisma ORM 6 |
| Security | @fastify/helmet, @nestjs/throttler, class-validator |
| Infra | Docker Compose, pnpm workspaces, Adminer |

## Швидкий старт

```bash
# 1. Скопіювати конфіг
cp .env.example .env

# 2. Запустити весь стек
docker compose up --build

# 3. Першого разу — застосувати міграцію та засіяти БД
docker compose exec backend pnpm exec prisma migrate dev --name init_schema
docker compose exec backend pnpm exec prisma db seed
```

## Сервіси після запуску

| Сервіс | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4200/api |
| Health check | http://localhost:4200/api/health |
| Swagger | http://localhost:4200/api/docs |
| Adminer (БД) | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

### Adminer — підключення до БД

- **Система:** PostgreSQL
- **Сервер:** `postgres`
- **Користувач:** `inrium`
- **Пароль:** `inrium_password`
- **База:** `inrium`

## pnpm / Docker scripts

```bash
pnpm docker:up      # docker compose up --build
pnpm docker:down    # docker compose down
pnpm dev            # локальний dev (backend + frontend)
pnpm build          # збірка всіх workspace
```

## Prisma scripts (backend workspace)

```bash
pnpm --filter @inrium/backend prisma:generate   # генерація Prisma Client
pnpm --filter @inrium/backend prisma:migrate     # prisma migrate dev
pnpm --filter @inrium/backend prisma:seed        # prisma db seed
pnpm --filter @inrium/backend prisma:studio      # Prisma Studio UI

# або всередині контейнера:
docker compose exec backend pnpm exec prisma migrate dev --name <назва>
docker compose exec backend pnpm exec prisma db seed
docker compose exec backend pnpm exec prisma studio
```

## Структура проєкту

```
inrium/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Prisma schema (всі моделі)
│   │   │   ├── seed.ts                # Seed script
│   │   │   ├── tsconfig.seed.json     # tsconfig для seed
│   │   │   └── migrations/            # SQL міграції
│   │   └── src/
│   │       ├── common/
│   │       │   ├── constants/
│   │       │   ├── decorators/        # @SkipResponseWrap
│   │       │   ├── dto/               # PaginationQueryDto
│   │       │   ├── filters/           # AllExceptionsFilter
│   │       │   ├── interceptors/      # ResponseInterceptor
│   │       │   └── types/             # ApiSuccessResponse, ApiErrorResponse
│   │       ├── config/
│   │       │   └── env.validation.ts  # joi schema для .env
│   │       ├── modules/
│   │       │   └── health/
│   │       └── prisma/                # PrismaService, PrismaModule
│   └── frontend/
│       └── src/
│           ├── app/                   # Next.js App Router
│           ├── components/            # Header, Hero, Cards, Footer…
│           └── lib/
│               └── mock-data.ts       # Тимчасові mock-дані
├── packages/
│   └── shared/                        # Спільні типи (@inrium/shared)
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── backend-entrypoint.sh          # generate + migrate deploy + start
├── docker-compose.yml
├── .env.example
└── pnpm-workspace.yaml
```

---

## Roadmap

### ✅ Етап 1 — Базова структура і Docker

- [x] Monorepo (pnpm workspaces, `apps/*`, `packages/shared`)
- [x] Docker Compose: postgres, adminer, backend, frontend
- [x] Backend: `GET /api/health`, Swagger `/api/docs`
- [x] Frontend: темна RPG/media portal сторінка (mock-data)
- [x] Prisma: підключення до PostgreSQL (`PrismaService`)
- [x] Shared: пакет `@inrium/shared` зі спільними типами

---

### ✅ Етап 2 — Backend foundation / security / common layer

- [x] Env validation при старті (`@nestjs/config` + `joi`) — обов'язкові змінні: `DATABASE_URL`, `CORS_ORIGIN`, `POSTGRES_*`
- [x] Security headers (`@fastify/helmet`) — CSP, HSTS, X-Frame-Options та ін.
- [x] Rate limiting (`@nestjs/throttler`) — глобально; `THROTTLE_TTL`/`THROTTLE_LIMIT` через `.env`
- [x] Global `ValidationPipe` — `whitelist`, `forbidNonWhitelisted`, `transform`
- [x] Global exception filter — уніфікований формат `{ success, statusCode, message, error, path, timestamp }` + Prisma error mapping
- [x] Global response interceptor — уніфікований формат `{ success, data, timestamp }`; декоратор `@SkipResponseWrap()`
- [x] Common layer: `common/filters`, `interceptors`, `decorators`, `dto`, `types`, `constants`
- [x] Startup log: ENV, PORT, API URL, Swagger URL

---

### ✅ Етап 3 — Prisma schema + initial migration + seed

- [x] Повна Prisma schema: `User`, `ContentItem`, `Category`, `Tag`, `ContentTag`, `HomePageBlock`, `Game`
- [x] Enums: `UserRole`, `UserStatus`, `ContentType`, `ContentStatus`, `HomePageBlockType`, `GameStatus`
- [x] Індекси для пошуку/фільтрації по типу, статусу, featured, publishedAt
- [x] Migration `init_schema` — застосована, файли зафіксовані в репозиторії
- [x] Seed script (`bcryptjs`): 2 users, 5 categories, 10 tags, 12 content items, 6 home page blocks
- [x] `prisma migrate deploy` в `backend-entrypoint.sh` — автозастосування міграцій при старті
- [x] Volume mount `./apps/backend/prisma` — migration файли зберігаються на хості

---

### 🔜 Етап 4 — Auth + RBAC foundation

- [ ] `POST /api/auth/register`
- [ ] `POST /api/auth/login`
- [ ] `POST /api/auth/refresh`
- [ ] `POST /api/auth/logout`
- [ ] `GET /api/auth/me`
- [ ] JWT access + refresh tokens (`@nestjs/jwt`)
- [ ] Refresh token — зберігання хешу в БД (модель `Session` або поле у `User`)
- [ ] `JwtAuthGuard` — перевірка access token
- [ ] `RolesGuard` + декоратор `@Roles(UserRole.ADMIN)` — RBAC
- [ ] `@Public()` декоратор для публічних маршрутів
- [ ] Swagger: `addBearerAuth()` + `@ApiBearerAuth()` на захищених контролерах

---

### 🔜 Етап 5 — CMS API (backend)

- [ ] `ContentItemModule`: CRUD для всіх типів контенту
- [ ] `GET /api/content?type=GAME_SYSTEM&status=PUBLISHED` — публічна вибірка
- [ ] `POST /api/admin/content` — створення (EDITOR+)
- [ ] `PATCH /api/admin/content/:id` — редагування
- [ ] `DELETE /api/admin/content/:id` — видалення (ADMIN)
- [ ] `PATCH /api/admin/content/:id/publish` — публікація
- [ ] `PATCH /api/admin/content/:id/archive` — архівування
- [ ] Фільтрація: тип, статус, featured, категорія, теги, пагінація
- [ ] `CategoryModule`, `TagModule` — CRUD
- [ ] `HomePageBlockModule` — керування блоками головної сторінки
- [ ] Image upload — `POST /api/admin/upload` (local storage або S3-compatible)
- [ ] Swagger-документація всіх endpoint-ів

---

### 🔜 Етап 6 — Admin UI (CMS-адмінка)

- [ ] Маршрут `/admin` (Next.js App Router або окремий Next.js app)
- [ ] Захист `/admin` — лише EDITOR/ADMIN
- [ ] Список матеріалів з фільтрацією, пошуком, пагінацією
- [ ] CRUD-форми для ContentItem (markdown editor, image upload, slug auto-генерація)
- [ ] Управління категоріями та тегами
- [ ] Управління блоками головної сторінки (`HomePageBlock`)
- [ ] Preview матеріалу перед публікацією
- [ ] Dashboard: статистика (кількість матеріалів за типом/статусом)

---

### 🔜 Етап 7 — Frontend → реальний API

- [ ] Підключення TanStack Query до backend
- [ ] Замінити `mock-data.ts` на реальні API-запити
- [ ] `GET /api/content?type=GAME_SYSTEM&status=PUBLISHED` → SystemsGrid
- [ ] `GET /api/content?type=KIT` → KitsGrid
- [ ] `GET /api/content?type=NEWS` → MainFeed
- [ ] `GET /api/content?isFeatured=true` → Hero / TopPicksPanel
- [ ] `GET /api/homepage-blocks` → динамічна структура головної сторінки
- [ ] Сторінки: `/articles/:slug`, `/systems/:slug`, `/kits/:slug`, `/help/:slug`
- [ ] SEO: `generateMetadata`, Open Graph

---

### 🔜 Етап 8 — Games / Sessions module

- [ ] `GameModule`: CRUD ігрових сесій
- [ ] `GET /api/games` — список відкритих ігор
- [ ] `POST /api/games` — створити сесію (GAME_MASTER+)
- [ ] `POST /api/games/:id/apply` — подати заявку (PLAYER)
- [ ] `PATCH /api/games/:id/applications/:appId` — прийняти/відхилити заявку
- [ ] Прив'язка до ігрової системи (ContentItem типу GAME_SYSTEM)
- [ ] Сторінка `/games` на frontend

---

### 🔜 Етап 9 — Profiles / Community

- [ ] `GET /api/users/:id` — публічний профіль
- [ ] `PATCH /api/users/me` — редагування профілю
- [ ] Avatar upload
- [ ] Сторінка `/profile/:id` на frontend

---

### 🔜 Етап 10 — Production hardening

- [ ] Redis для refresh tokens та rate limiting
- [ ] Email verification при реєстрації
- [ ] Password reset flow
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Health checks для всіх сервісів
- [ ] Logging (Pino або Winston)
- [ ] Error tracking (Sentry або self-hosted Glitchtip)
- [ ] Nginx reverse proxy
- [ ] SSL / HTTPS
