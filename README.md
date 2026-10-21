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
# 1. Скопіювати конфіг (НЕ комітити .env!)
cp .env.example .env

# 2. Release build (рекомендовано перед перевіркою)
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d --force-recreate

# Або звичайний запуск:
docker compose up --build -d

# 3. Adminer для роботи з БД (опційно, тільки local):
docker compose --profile tools up -d

# 4. Seed (перший раз або після reset БД; у контейнері вже зібраний скрипт):
docker compose exec backend node dist-scripts/prisma/seed.js
```

### Логи та статус

```bash
docker compose ps
docker compose logs backend --tail=120
docker compose logs frontend --tail=120
```

### Backup проєкту

```bash
scripts/backup.sh ./backups
```

Томи `postgres_data` і `uploads_data`. `.env` зберігати окремо (не в git). Restore: `scripts/restore.sh` лише на ізольованому стенді.

### SMTP локально

```bash
docker compose --profile mail up -d mailpit   # UI http://127.0.0.1:8025
# .env: SMTP_HOST=mailpit  SMTP_PORT=1025
```

Без SMTP посилання verify/reset з’являються в logs backend з префіксом `[dev-only]` (не в production).

### Документація

| Файл | Опис |
|------|------|
| `PROJECT_STATUS.md` | Статус |
| `docs/UI_HANDOFF.md` | Наступний етап UI |
| `docs/SECURITY_IMPLEMENTATION.md` | Auth/CSRF |
| `docs/DEPLOYMENT_READINESS.md` | Production checklist (код) |
| `docs/EMAIL_PRODUCTION_SETUP.md` | SMTP/DNS |
| `MANUAL_TEST_CHECKLIST.md` | Ручні сценарії |

> **`.env` ніколи не комітити.** Перевірка: `git check-ignore -v .env`

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
| 3000 | Frontend (Next.js) | ✅ Так (або лише через reverse proxy) |
| 4200 | Backend API | ❌ Ні; браузер ходить на same-origin `/api` |
| 5432 | PostgreSQL | ❌ Ніколи |
| 8080 | Adminer | ❌ Ніколи |

### Налаштування для публічного тесту (відкрити тимчасово назовні)

```bash
# У .env:
NODE_ENV=production
SWAGGER_ENABLED=false           # вимкнути Swagger docs
CORS_ORIGIN=http://your-ip:3000 # дозволити тільки ваш фронтенд
NEXT_PUBLIC_API_URL=/api        # Docker і так вшиває /api; не вказуйте :4200
NEXT_PUBLIC_SITE_URL=http://your-ip:3000
SITE_URL=http://your-ip:3000

# Запустити:
docker compose up --build -d
```

> Backend у Docker слухає внутрішню мережу (`http://backend:4200/api`). Next.js проксує `/api` і `/uploads`. Не відкривайте порт 4200 назовні і не ставте `NEXT_PUBLIC_API_URL` на прямий URL backend: CSP `connect-src 'self'` заблокує такі запити, а cookies перестануть бути first-party.

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

## Завантаження зображень (Cover upload)

CMS дозволяє ADMIN/EDITOR завантажувати обкладинки для content і systems.

| Параметр | Значення |
|----------|----------|
| Endpoint | `POST /api/uploads/image` (Bearer token, ADMIN/EDITOR) |
| Поле форми | `file` (multipart/form-data) |
| Типи | JPEG, PNG, WebP (SVG заборонено) |
| Макс. розмір | 5 MB |
| Storage (Docker) | `./uploads` на хості → `/app/uploads` у backend |
| Public URL | `/uploads/images/YYYY/MM/{random}.ext` (same-origin через frontend) |

**Backup:** разом із backup PostgreSQL копіюйте папку `./uploads`.

**Git:** uploaded files **не комітити** — у `.gitignore` є `uploads/*` (залишається лише `uploads/.gitkeep`).

**Перевірка в браузері:**

1. Увійти як admin → `/admin/content/new`
2. Завантажити JPG/PNG/WebP у полі «Обкладинка»
3. Опублікувати матеріал
4. Відкрити public page — зображення має відображатись

---

## Профіль і закладки

| Endpoint | Опис |
|----------|------|
| `GET /api/auth/me` | Поточний користувач (без passwordHash) |
| `PATCH /api/users/me` | Оновити displayName, bio, avatarUrl |
| `POST /api/users/me/change-password` | Змінити пароль (revoke усіх refresh sessions) |
| `GET /api/bookmarks` | Список закладок поточного user |
| `POST /api/bookmarks` | Додати закладку `{ targetType, targetId }` |
| `DELETE /api/bookmarks/:id` | Видалити свою закладку |
| `GET /api/bookmarks/check?targetType=&targetId=` | Перевірити, чи збережено |

**Frontend:** `/profile` — редагування профілю, зміна пароля, список «Збережене». Кнопка «Зберегти» на detail pages content/help/systems.

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

# або всередині контейнера (prod-образ без ts-node):
docker compose exec backend node dist-scripts/prisma/seed.js
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
- [x] CMS Admin: CRUD для content, systems
- [x] Content API: news, articles, help, systems (публічні + admin)
- [x] Markdown render (`react-markdown`)
- [x] Пагінація для всіх list-сторінок
- [x] Фільтри (category, tag, genre, complexity, system)
- [x] Глобальний пошук `/api/search`
- [x] SEO: `generateMetadata`, canonical, OpenGraph, Twitter cards
- [x] Sitemap (`/sitemap.xml`) та robots.txt
- [x] Health check `GET /api/health` (мінімальний `{ status: "ok" }`)
- [x] Rate limit: глобальний + суворіший для auth endpoints (10 req/min)
- [x] Swagger умовно вимкнений через `SWAGGER_ENABLED=false`
- [x] Postgres і Adminer тільки на `127.0.0.1` (не LAN/WAN)
- [x] MarkdownEditor у CMS (toolbar + preview)
- [x] Cover image upload (local storage, `/api/uploads/image`)
- [x] User profile edit + change password (`/profile`, `/api/users/me`)
- [x] Bookmarks for content/help/systems
- [x] Games / Sessions API + `/games` + apply flow
- [x] Public profiles `/users/[id]`
- [x] Communities API + `/communities`
- [x] Home blocks admin `/admin/home-blocks`
- [x] Email verify + password reset API (dev tokens in logs)
- [x] Static pages `/about`, `/contacts`, `/advertise`
- [x] GitHub Actions CI (`.github/workflows/ci.yml`)
- [x] Nginx example (`docker/nginx/nginx.conf.example`)
- [x] SMTP integration for email verify / password reset (Gmail demo + dev logs)
- [x] Dynamic homepage from HomePageBlock config
- [x] MVP polish: українська локалізація, footer, media, sitemap
- [x] Cookie auth + CSRF + CAPTCHA adapter + IDOR тести
- [x] Legal drafts `/privacy`, `/terms`
- [x] Документація технічної бази (`docs/*`)

### 🔜 Далі

- [ ] Авторські правки UI (`docs/UI_HANDOFF.md`)
- [ ] Production: домен, HTTPS, SMTP, CAPTCHA keys (`docs/REMAINING_EXTERNAL_TASKS.md`)
- [ ] Object storage / Redis — лише за потреби масштабу
- [ ] Image cropper / resize
- [ ] Error tracking DSN
