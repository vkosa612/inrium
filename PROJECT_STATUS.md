# INRIUM — статус проєкту (Release Candidate)

Останнє оновлення: червень 2026

## Поточний статус

**MVP Release Candidate** — платформа технічно стабільна для:

- подальших **авторських/продуктових правок** UI та контенту;
- **staging**-перевірок на Docker;
- підготовки до **production deploy** (після окремого security phase).

Критерій локальної готовності: повний цикл Docker (`build --no-cache`, `up -d --force-recreate`) без помилок.

## Готові модулі

| Модуль | Статус | Примітки |
|--------|--------|----------|
| Auth (register/login/refresh/logout) | ✅ | Українські помилки; опційна перевірка email через `REQUIRE_EMAIL_VERIFICATION` |
| Email verify / password reset | ✅ | SMTP (Gmail demo) або dev-logs `[dev-only]` |
| RBAC (PLAYER, GAME_MASTER, EDITOR, ADMIN) | ✅ | Guards на backend + AdminRouteShell |
| CMS (content, systems, kits) | ✅ | Markdown, cover upload, CRUD admin |
| Games + applications | ✅ | Apply, approve/reject/cancel/remove, auto OPEN/FULL |
| Communities | ✅ | Public + admin CRUD |
| Profiles + bookmarks | ✅ | Avatar, bio, change password, self-delete |
| Uploads | ✅ | JPG/PNG/WebP, 5 MB, magic-byte validation |
| Home blocks | ✅ | Admin edit, dynamic homepage sections |
| SEO | ✅ | sitemap.xml, robots.txt, metadata |
| Docker stack | ✅ | postgres + backend + frontend (+ adminer profile) |
| Локалізація UI | ✅ | Українська для основних flows |
| Access control (IDOR/BOLA) | ✅ | Аудит + fix public games list; див. `docs/ACCESS_CONTROL_AUDIT.md` |

## Відомі обмеження (не блокери MVP)

- **Uploads** — локальна папка `./uploads`, не object storage (S3/MinIO).
- **Refresh token** — у БД; Redis не використовується.
- **Email verification** — за замовчуванням **не блокує** login (`REQUIRE_EMAIL_VERIFICATION=false` для demo).
- **Cookies migration** — refresh token передається в body/cookie гібридно; повна cookie-only модель — security phase.
- **CAPTCHA / advanced rate limit** — не реалізовано.
- **Admin delete users** — не реалізовано (лише self-delete).
- **Analytics dashboard** — placeholder «—» в admin.
- **Production SMTP** — потрібен окремий сервіс (не Gmail demo).

## Що можна правити далі (без зміни архітектури)

- Тексти, empty states, візуальні дрібниці UI.
- Контент seed / реальні матеріали CMS.
- Home blocks конфігурація.
- SEO copy (about, contacts, advertise).
- Нові публічні сторінки за існуючими патернами.

## Що НЕ варто робити без окремого плану

- Production deploy без `PRODUCTION_CHECKLIST.md`.
- Зміна auth core, cookies, CSRF.
- Нові таблиці / migrations без потреби.
- Redesign або великі нові фічі (forum, payments, messaging).

## Документація

| Файл | Призначення |
|------|-------------|
| `README.md` | Швидкий старт, Docker, backup |
| `MANUAL_TEST_CHECKLIST.md` | Ручні сценарії QA |
| `PRODUCTION_CHECKLIST.md` | Pre-deploy production |
| `docs/ACCESS_CONTROL_AUDIT.md` | IDOR/BOLA аудит і API smoke |
| `.env.example` | Placeholder-и (без секретів) |

## Access control / IDOR

- Публічні ігри: лише OPEN/FULL/IN_PROGRESS/FINISHED (`resolvePublicListStatus`).
- GM mutations: `findOwnedOrAdmin` + `masterId`.
- Заявки: composite `{ appId, gameId }`; cancel — лише власник.
- Bookmarks: filter `userId`.
- Public profile: без email/secrets.
- Деталі: `docs/ACCESS_CONTROL_AUDIT.md`.

## Cleanup (access-control chunk)

- Сміттєвих файлів (`del.json`, `test-*.json`, `*.log`) у repo **не знайдено**.
- Build artifacts (`node_modules`, `.next`, `dist`) — у `.gitignore`, не видалялись з диска.
- Мертвий код масово не видалявся — route wrappers Next.js залишені (потрібні для App Router).

---

## Seed-акаунти (dev)

Після seed (див. README): admin, editor, game master — паролі з `.env` (`SEED_*`). **Змінити перед публічним доступом.**
