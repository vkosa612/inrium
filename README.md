# INRIUM

Платформа для настільних рольових ігор (TTRPG): гравці, майстри, ігрові події, заявки, спільноти та довідники.

## Стек

| Шар | Технології |
|-----|------------|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS |
| Backend | NestJS 11, Fastify, TypeScript |
| Database | PostgreSQL 16, Prisma ORM 6 |
| Security | @fastify/helmet, @nestjs/throttler, class-validator |
| Infra | Docker Compose, pnpm workspaces |

## Швидкий старт (local dev)

```bash
# 1. Скопіювати конфіг
cp .env.example .env

# 2. Запустити весь стек (frontend + backend + postgres)
docker compose up --build -d

# З Adminer для роботи з БД:
docker compose --profile tools up -d

# 3. Першого разу — засіяти БД (міграції застосовуються автоматично)
docker compose exec backend sh -c "cd /app/apps/backend && node_modules/.bin/ts-node -P prisma/tsconfig.seed.json prisma/seed.ts"
```

## Сервіси після запуску

| Сервіс | URL | Видимість |
|--------|-----|-----------|
| Frontend | http://localhost:3000 | ✅ Публічний |
| Backend API | http://localhost:4200/api | ✅ Публічний (dev) |
| Health check | http://localhost:4200/api/health | ✅ Завжди |
| Swagger | http://localhost:4200/api/docs | ⚠️ Тільки якщо `SWAGGER_ENABLED=true` |
| Adminer (БД) | http://localhost:8080 | 🔒 Тільки localhost (`--profile tools`) |
| PostgreSQL | localhost:5432 | 🔒 Тільки localhost |

### Adminer — підключення до БД

- **Система:** PostgreSQL
- **Сервер:** `postgres`
- **Користувач:** `inrium`
- **Пароль:** `inrium_password`
- **База:** `inrium`

---

## 🔐 Безпека та публічний доступ

### Які порти можна відкривати назовні

| Порт | Сервіс | Відкривати? |
|------|--------|-------------|
| 3000 | Frontend (Next.js) | ✅ Так |
| 4200 | Backend API | ⚠️ Тільки якщо потрібен прямий доступ |
| 5432 | PostgreSQL | ❌ Ніколи |
| 8080 | Adminer | ❌ Ніколи |

### Налаштування для публічного тесту (відкрити тимчасово назовні)

```bash
# У .env:
NODE_ENV=production
SWAGGER_ENABLED=false           # вимкнути Swagger docs
CORS_ORIGIN=http://your-ip:3000 # дозволити тільки ваш фронтенд
NEXT_PUBLIC_API_URL=http://your-ip:4200/api
NEXT_PUBLIC_SITE_URL=http://your-ip:3000

# Якщо хочеш захистити backend від прямого LAN-доступу:
BACKEND_BIND=127.0.0.1          # backend слухає тільки localhost

# Запустити:
docker compose up --build -d
```

> Якщо `BACKEND_BIND=127.0.0.1`, фронтенд і так зв'язується з backend через внутрішню Docker мережу (`http://backend:4200/api`). Браузер-запити через `NEXT_PUBLIC_API_URL` не потрібні, якщо всі API-запити йдуть через Server Components.

### Перед публічним запуском — обов'язково

- [ ] Змінити `JWT_ACCESS_SECRET` і `JWT_REFRESH_SECRET` (мінімум 32 символи)
- [ ] Змінити паролі адміна/редактора (`SEED_ADMIN_PASSWORD`, `SEED_EDITOR_PASSWORD`)
- [ ] Змінити пароль бази (`POSTGRES_PASSWORD`)
- [ ] Встановити `SWAGGER_ENABLED=false`
- [ ] Встановити `CORS_ORIGIN` тільки на дозволені домени
- [ ] **Ніколи не комітити `.env` в git**
- [ ] **Ніколи не відкривати порти 5432 та 8080 назовні**

### Перевірка після запуску

```bash
# Публічні URL (мають повертати 200):
curl http://localhost:3000/
curl http://localhost:3000/sitemap.xml
curl http://localhost:3000/robots.txt
curl http://localhost:4200/api/health

# Swagger (має повертати 404 якщо SWAGGER_ENABLED=false):
curl http://localhost:4200/api/docs

# Adminer (не має бути доступний з WAN, тільки localhost):
# docker compose --profile tools up -d  # запустити тільки якщо потрібно
```

---

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
docker compose exec backend sh -c "cd /app/apps/backend && node_modules/.bin/ts-node -P prisma/tsconfig.seed.json prisma/seed.ts"
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
│   │       │   └── health/            # GET /api/health (з DB check)
│   │       └── prisma/                # PrismaService, PrismaModule
│   └── frontend/
│       └── src/
│           ├── app/                   # Next.js App Router
│           │   ├── sitemap.ts         # /sitemap.xml (динамічний)
│           │   └── robots.ts          # /robots.txt
│           ├── components/            # Header, Cards, Pagination, FilterBar…
│           └── lib/
│               └── api.ts             # API helpers
├── packages/
│   └── shared/                        # Спільні типи (@inrium/shared)
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── backend-entrypoint.sh          # generate + migrate deploy + start
├── docker-compose.yml
├── .env.example                       # шаблон — комітити можна
├── .env                               # ніколи не комітити!
└── pnpm-workspace.yaml
```

---

## Roadmap

### ✅ Реалізовано

- [x] Monorepo (pnpm workspaces, `apps/*`, `packages/shared`)
- [x] Docker Compose: postgres, backend, frontend (adminer тільки через `--profile tools`)
- [x] Backend: NestJS + Fastify, Prisma ORM, JWT auth, RBAC
- [x] Auth: register/login/refresh/logout/me з httpOnly cookie
- [x] CMS Admin: CRUD для content, systems, kits
- [x] Content API: news, articles, help, systems, kits (публічні + admin)
- [x] Markdown render (`react-markdown`)
- [x] Пагінація для всіх list-сторінок
- [x] Фільтри (category, tag, genre, complexity, system)
- [x] Глобальний пошук `/api/search`
- [x] SEO: `generateMetadata`, canonical, OpenGraph, Twitter cards
- [x] Sitemap (`/sitemap.xml`) та robots.txt
- [x] Health check `GET /api/health` з DB latency
- [x] Rate limit: глобальний + суворіший для auth endpoints (10 req/min)
- [x] Swagger умовно вимкнений через `SWAGGER_ENABLED=false`
- [x] Postgres і Adminer тільки на `127.0.0.1` (не LAN/WAN)

### 🔜 Наступні етапи

- [ ] Профільна сторінка (`/profile`)
- [ ] Markdown editor у CMS (SimpleMDE або CodeMirror)
- [ ] Image upload для cover images
- [ ] Redis для refresh tokens та rate limiting
- [ ] Email verification
- [ ] Nginx reverse proxy + HTTPS/SSL
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Logging (Pino)
- [ ] Error tracking (Sentry або Glitchtip)
