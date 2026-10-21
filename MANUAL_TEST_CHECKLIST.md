# INRIUM — чекліст ручного тестування

Використовуйте після `docker compose up -d` або перед релізом/staging.

П позначає пункт для перевірки. Статус: ☐ / ✅ / ❌

---

## 0. Pre-flight

- [ ] `docker compose ps` — backend **healthy**, postgres **healthy**, frontend **up**
- [ ] `GET http://localhost:4200/api/health` → 200
- [ ] `.env` не в git (`git check-ignore -v .env`)
- [ ] Swagger доступний лише якщо `SWAGGER_ENABLED=true`

---

## 1. Auth / Email flow

### Реєстрація
- [ ] `/register` — нова пошта → успіх, redirect
- [ ] `/register` — існуюча пошта → «Користувач з такою поштою вже існує»
- [ ] Лист підтвердження приходить (SMTP) або посилання в `docker compose logs backend` з `[dev-only]`

### Verify email
- [ ] `/verify-email?token=...` — валідний token → успіх українською
- [ ] прострочений/невалідний token → помилка українською

### Login
- [ ] `/login` — правильні дані → вхід
- [ ] `/login` — неправильний пароль → «Невірна електронна пошта або пароль»
- [ ] Logout → сесія завершена

### Password reset
- [ ] `/forgot-password` — запит → повідомлення (надсилання або dev-log)
- [ ] `/reset-password?token=...` — новий пароль → успіх
- [ ] Login з новим паролем

### Email verification enforcement (production)
- [ ] `REQUIRE_EMAIL_VERIFICATION=true` → login без verify блокується з зрозумілою помилкою
- [ ] `REQUIRE_EMAIL_VERIFICATION=false` (demo) → login працює без verify

---

## 2. Player flow

- [ ] Register + login як PLAYER
- [ ] `/profile` — зміна displayName, bio
- [ ] Avatar upload (URL або `/uploads/...`)
- [ ] `/games` — список ігор, cover/fallback
- [ ] `/games/[slug]` — cover, опис, apply button
- [ ] Подача заявки на гру (OPEN)
- [ ] `/my/applications` — заявка зі статусом «Очікує рішення»
- [ ] Скасування заявки (CANCELLED)
- [ ] Закладка на content/system — «Зберегти» на detail page
- [ ] `/profile` — список закладок, видалення
- [ ] Self-delete account (`ВИДАЛИТИ` + пароль) → logout, акаунт недоступний

---

## 3. Game Master flow

Login: `gm@inrium.local` (або користувач з роллю GAME_MASTER)

- [ ] `/my/games/new` — створення гри
- [ ] Slug auto-generate з title
- [ ] Upload cover → public `/games/[slug]` показує cover
- [ ] Edit game (`/my/games/[id]/edit`)
- [ ] `/my/games/[id]/applications` — список заявок
- [ ] Approve → гравець у roster, статус «Схвалено»
- [ ] Reject → «Відхилено»
- [ ] При досягненні maxPlayers → статус FULL
- [ ] Remove approved player → «Виключено майстром», набір знову OPEN (якщо був FULL)

---

## 4. Admin flow

Login: `admin@inrium.local`

- [ ] `/admin` — dashboard, роль «Адміністратор», статистика «—» з підписом
- [ ] `/admin/users` — список, ролі/статуси українською, зміна ролі
- [ ] `/admin/content` — CRUD, image upload, publish
- [ ] `/admin/systems` — CRUD + cover
- [ ] `/admin/communities` — CRUD, empty state українською
- [ ] `/admin/home-blocks` — edit blocks, типи українською
- [ ] Після publish — public pages відображають контент

---

## 5. Upload flow

- [ ] JPG / PNG / WebP — успіх
- [ ] SVG або .exe — відхилено з українською помилкою
- [ ] Файл > 5 MB — відхилено
- [ ] Public URL `/uploads/...` відображається на frontend (same-origin proxy)

---

## 6. SEO / Static pages

- [ ] `/` — homepage
- [ ] `/news`, `/articles`, `/systems`, `/help`
- [ ] `/about`, `/contacts`, `/advertise`
- [ ] `/sitemap.xml` — static + dynamic slugs (games, communities, content, help)
- [ ] `/robots.txt`
- [ ] Footer — усі посилання без 404

---

## 7. Public profiles & communities

- [ ] `/users/[id]` — avatar fallback, роль українською
- [ ] `/communities` — cover thumbnails
- [ ] `/communities/[slug]` — cover або fallback

---

## 9. Access control / IDOR

Потрібні 2 акаунти: PLAYER + GAME_MASTER (seed: `gm@inrium.local`).

- [ ] `GET /api/games?status=DRAFT` — **не** повертає ігри зі status DRAFT
- [ ] PLAYER: `GET /api/users` → 403
- [ ] EDITOR: `PATCH /api/users/:id/role` → 403
- [ ] GM A: `GET /api/games/by-id/<id_гри_GM_B>` → 403, повідомлення українською
- [ ] GM A: `PATCH .../applications/:appId/approve` для гри GM B → 403
- [ ] PLAYER A: cancel заявки PLAYER B → 403
- [ ] `GET /api/users/:id` — немає поля `email`
- [ ] `/my/games/<чужий-id>/edit` — frontend показує «Доступ заборонено» або помилку завантаження

Деталі: `docs/ACCESS_CONTROL_AUDIT.md`

---

## 10. Негативні сценарії

- [ ] `/admin/*` без auth → redirect/login
- [ ] API без token на protected endpoint → 401
- [ ] PLAYER на admin endpoint → 403
- [ ] 404 на неіснуючий slug — коректна сторінка, не 500

---

## Примітки тестувальника

_Дата: ___________  
Версія / commit: ___________  
Середовище: Docker local / staging  
SMTP: налаштовано / dev-logs  

Знайдені проблеми:_

```
1.
2.
```
