# INRIUM — Project Plan & Roadmap

> Останнє оновлення: 2026-06-19  
> Джерело: фактичний стан репозиторію після MVP completion chunk.

---

## Current Status

INRIUM — self-hosted TTRPG-платформа (monorepo, Docker-first). **MVP готовий** для подальших UI/content/security правок.

| Область | Стан |
|---------|------|
| Docker Compose (postgres, backend, frontend) | ✅ |
| Auth (JWT + refresh sessions, RBAC) | ✅ |
| Profile + bookmarks | ✅ |
| CMS (content, systems, uploads) | ✅ |
| Public pages (/about, /contacts, /advertise) | ✅ |
| SEO (sitemap, robots, metadata) | ✅ |
| Games API + UI + applications (GM/players) | ✅ |
| Communities API + public UI | ✅ |
| Public profiles `/users/[id]` | ✅ |
| Admin home-blocks | ✅ |
| Homepage ← HomePageBlock (dynamic sections) | ✅ |
| Games section on homepage | ✅ |
| Communities in Header | ✅ |
| Розділ наборів (Kits) вилучено з продукту | ✅ |
| Email UI (verify/forgot/reset) | ✅ |
| SMTP env + EmailService | ✅ |
| Admin users (list + role change) | ✅ |
| Admin communities CRUD UI | ✅ |
| GM game cover upload | ✅ |
| CI typecheck/build | ✅ |
| Nginx example + production checklist | ✅ |

**Prisma migrations (8):**

1. `20260612203123_init_schema`
2. `20260612210348_add_session_model`
3. `20260614182900_add_systems_kits`
4. `20260619000000_add_bookmarks`
5. `20260619120000_add_games_applications`
6. `20260619130000_add_communities_email`
7. `20260619140000_mvp_games_cover_blocks`

---

## Architecture

```
inrium/
├── apps/
│   ├── backend/     NestJS 11 + Fastify, Prisma 6, PostgreSQL
│   └── frontend/    Next.js 15 App Router
├── packages/shared/
├── docker/
├── uploads/
└── docker-compose.yml
```

**Key backend modules:** auth, content, systems, help, home, home-blocks, games, communities, users, bookmarks, uploads, email, health

**Key frontend routes:** `/`, `/games`, `/my/games`, `/communities`, `/users/[id]`, `/admin/*`, `/verify-email`, `/forgot-password`, `/reset-password`

---

## Completed (MVP completion chunk)

- Homepage sections driven by `HomePageBlock` (fallback if DB empty)
- Games preview block on homepage via `/api/home`
- SMTP configuration (`SITE_URL`, `SMTP_*`) + dev console fallback for links
- Email flows UI wired to existing auth API
- Admin `/admin/users` — list, search, role assignment
- Admin `/admin/communities` — list, create, edit, delete
- `POST /api/games/:id/cover` — GM owner or ADMIN upload
- `Game.coverImageUrl` field + migration

---

## Next Phase — Security & Production

| # | Task | Priority |
|---|------|----------|
| 1 | localStorage tokens → httpOnly / in-memory | Critical |
| 2 | Sanitize Markdown (XSS) | High |
| 3 | Enforce email verification on sensitive actions | High |
| 4 | CAPTCHA on register | High |
| 5 | Per-endpoint rate limits | Medium |
| 6 | Next.js middleware for admin/GM routes | Medium |
| 7 | Production deploy (HTTPS, Nginx, secrets) | High |
| 8 | Backups postgres + uploads | High |
| 9 | Observability / structured logging | Medium |

---

## Later Backlog

- Homepage blocks: edit title/subtitle in admin UI (beyond enable/disable)
- Category/Tag admin CRUD
- Image pipeline (resize/crop, S3)
- Automated tests (unit/e2e)
- Community features beyond listing (events, chat)

---

## Manual Verification

```powershell
cd D:\inrium
docker compose down --remove-orphans
docker compose build
docker compose up -d
```

**Smoke tests:**

- `http://localhost:3000/` — dynamic homepage + games block
- `http://localhost:3000/communities` — in header nav
- `http://localhost:3000/forgot-password` — form works
- `http://localhost:3000/admin/users` — ADMIN only
- `http://localhost:3000/admin/communities` — ADMIN CRUD
- GM: edit game → upload cover
- Admin: `/admin/home-blocks` toggle blocks

**Email (dev without SMTP):** check backend logs for `[dev-only]` verification/reset links after register or forgot-password.

---

## Security Rules

- Never commit `.env` or `uploads/*`
- Postgres/Adminer localhost only
- `SWAGGER_ENABLED=false` in production
- Change JWT secrets before public deploy
- Configure SMTP before open registration in production
