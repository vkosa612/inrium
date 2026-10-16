# INRIUM — реалізація безпеки

## Модель сесії

- **Access cookie** `inrium_at`: HttpOnly, Path `/`, SameSite=Lax (за замовчуванням), Secure у production.
- **Refresh cookie** `inrium_rt`: HttpOnly, Path `/api/auth` (вужче), ротація на кожен refresh.
- **CSRF nonce cookie** `inrium_csrf`: HttpOnly; токен для заголовка видається `GET /api/auth/csrf`.
- Cookie **не** читаються з JavaScript. Frontend не пише JWT у localStorage/sessionStorage.
- У JSON відповідях login/register/refresh **немає** `accessToken`/`refreshToken`.

Refresh у БД зберігається як SHA-256 hash. Повторне використання старого refresh поза grace-вікном відкликає сім'ю сесій. Паралельні refresh у grace-вікні (кілька вкладок) отримують чинну сесію.

Access JWT перевіряється стратегією: користувач має існувати і бути `ACTIVE`. BLOCKED/DELETED → 401.

## CSRF

Підписаний double-submit з прив'язкою до сесії (`familyId` з JWT або `anon`):

- Клієнт шле `X-CSRF-Token` на POST/PUT/PATCH/DELETE.
- Перевіряються cookie-nonce, HMAC і binding сесії.
- Origin/Referer звіряються з CORS allowlist (відсутній Origin на same-site cookie-запит обробляється консервативно в guard).
- Немає wildcard CORS для credentialed requests (`CORS_ORIGIN` не може містити `*`).

## CORS і headers

- Allowlist з `CORS_ORIGIN`, `credentials: true`.
- Helmet на Fastify; CSP frontend — у Next.js (сумісна з App Router).
- Cache-Control для auth/приватних відповідей: no-store (interceptor/headers).

## XSS / UGC

- Markdown рендериться через `react-markdown` без raw HTML.
- Vitest перевіряє, що небезпечний HTML не виконується.
- Описи ігор/профілів — текст, не innerHTML.

## Rate limit і CAPTCHA

- Глобальний throttler + окремі ліміти на login/register/refresh/forgot/resend.
- Ліміти за IP (з урахуванням `TRUSTED_PROXY_HOPS`, без сліпої довіри до клієнтського X-Forwarded-For) і за ідентифікатором акаунта де доречно.
- In-memory: **не** синхронізується між кількома репліками backend. Для горизонтального масштабу потрібен shared store (не реалізовано; P1 інфра).
- CAPTCHA: `CAPTCHA_PROVIDER=none|turnstile|hcaptcha|test`. `test` дозволений лише поза production. `CAPTCHA_REQUIRED=true` без ключів — fail-fast. Перевірка токена на сервері; недоступність провайдера fail-closed.

## Anti-enumeration

- Register: HTTP 202 незалежно від існування email (існуючому користувачу — нейтральний лист).
- Forgot-password / resend: однакова відповідь.
- Login: «Невірна електронна пошта або пароль» без розкриття існування.

## Access control

- Default-deny JWT guard; `@Public()` явно.
- `@Roles()` + RolesGuard.
- Ігри: `findOwnedOrAdmin` / `masterId`.
- Заявки: `{ appId, gameId }` + owner cancel.
- Bookmarks: `{ id, userId }`.
- Public games list: лише OPEN/FULL/IN_PROGRESS/FINISHED (ігнорує `?status=DRAFT`).
- Public profile: без email/tokens/passwordHash.

## Uploads

- Allowlist JPEG/PNG/WebP, magic bytes, max 5 MB, server-generated імена, без path traversal.
- GM cover тільки для власної гри; CMS upload — ADMIN/EDITOR.
- Відповідь містить публічний URL `/uploads/...`, не filesystem path.

## Логи

- Токени/паролі не логуються.
- Email у логах маскується.
- `[dev-only]` посилання лише поза production і лише якщо SMTP не надіслав лист.
- Health: `{ status: 'ok' }` без внутрішніх деталей.

## Production fail-fast

Старт відхиляється при placeholder secrets, `COOKIE_SECURE=false`, HTTP CORS/SITE_URL, `REQUIRE_EMAIL_VERIFICATION!=true`, `CAPTCHA_PROVIDER=test`.
