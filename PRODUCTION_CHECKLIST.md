# Production deployment checklist — INRIUM

Чекліст перед реальним production-виходом. Не замінює security phase.

---

## 1. Секрети та `.env`

- [ ] `.env` створено з `.env.example` **на сервері** (не в git)
- [ ] `git check-ignore -v .env` → ignored
- [ ] `JWT_ACCESS_SECRET` і `JWT_REFRESH_SECRET` — унікальні, ≥32 символів, **не** placeholder
- [ ] `POSTGRES_PASSWORD` змінено з dev-default
- [ ] `SEED_*` паролі змінено або seed не запускається на prod
- [ ] Секрети не в tracked files (`git grep SMTP_PASS`, `JWT_SECRET`)

---

## 2. Environment

- [ ] `NODE_ENV=production`
- [ ] `SWAGGER_ENABLED=false`
- [ ] `SITE_URL=https://your-domain.ua` (HTTPS)
- [ ] `NEXT_PUBLIC_SITE_URL` і `NEXT_PUBLIC_API_URL` — production URLs
- [ ] `CORS_ORIGIN` — лише дозволені frontend origin(s), без `*`
- [ ] `REQUIRE_EMAIL_VERIFICATION=true` (рекомендовано для prod)
- [ ] `BACKEND_BIND=127.0.0.1` якщо backend за reverse proxy

---

## 3. Домен, HTTPS, reverse proxy

- [ ] DNS A/AAAA на сервер
- [ ] TLS сертифікат (Let's Encrypt або інший)
- [ ] Nginx/Caddy — приклад: `docker/nginx/nginx.conf.example`
- [ ] Frontend :443 → Next.js :3000
- [ ] API `/api` → backend :4200 (internal)
- [ ] `/uploads` proxy до backend або shared volume
- [ ] HSTS (після перевірки HTTPS)

---

## 4. Database

- [ ] Production PostgreSQL (не dev compose password)
- [ ] `DATABASE_URL` на prod host
- [ ] Migrations: `prisma migrate deploy` (entrypoint робить автоматично)
- [ ] **Backups**: щоденний pg_dump + retention policy
- [ ] Restore протестовано хоча б раз
- [ ] Postgres port **не** exposed to WAN

---

## 5. Uploads / storage

- [ ] `./uploads` на persistent volume
- [ ] Backup uploads разом з DB
- [ ] План міграції на object storage (S3/MinIO) — future, якщо потрібно
- [ ] Max 5 MB, JPG/PNG/WebP — перевірено

---

## 6. Email (production SMTP)

- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — production provider
- [ ] **Не** використовувати Gmail demo-акаунт у prod
- [ ] Test: verify email + password reset доставляються
- [ ] SPF/DKIM/DMARC для домену (рекомендовано)
- [ ] Backend log: немає `[dev-only]` links у production

---

## 7. Security (мінімум перед go-live; повний phase окремо)

- [ ] Helmet headers увімкнено (backend `main.ts`)
- [ ] Rate limit на auth endpoints
- [ ] Stack traces не показуються користувачу (`NODE_ENV=production`)
- [ ] Adminer **не** запущений на prod (`--profile tools` only local)
- [ ] Access control audit пройдено — `docs/ACCESS_CONTROL_AUDIT.md`
- [ ] IDOR fix: `GET /api/games?status=DRAFT` не leak чернеток
- [ ] Security phase backlog: cookies-only refresh, CSRF, CAPTCHA, audit log

---

## 8. Deploy commands

```powershell
cd D:\inrium   # або шлях на сервері
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d --force-recreate
docker compose ps
docker compose logs backend --tail=160
docker compose logs frontend --tail=160
```

---

## 9. Smoke tests (production URLs)

```powershell
Invoke-WebRequest https://your-domain.ua/ -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest https://your-domain.ua/api/health -UseBasicParsing
Invoke-WebRequest https://your-domain.ua/sitemap.xml -UseBasicParsing
Invoke-WebRequest https://your-domain.ua/robots.txt -UseBasicParsing
```

- [ ] `/api/docs` → 404 (Swagger off)
- [ ] Login / register / games / admin flows — див. `MANUAL_TEST_CHECKLIST.md`

---

## 10. Logging & monitoring

- [ ] Centralized logs (journald, Loki, CloudWatch — на вибір)
- [ ] Disk space alert для uploads + postgres volume
- [ ] Uptime check на `/api/health`
- [ ] Error tracking (Sentry/Glitchtip) — recommended P1

---

## 11. Rollback

- [ ] Попередній Docker image tag збережено
- [ ] DB backup перед migrate deploy
- [ ] Документовано: `docker compose down` + restore backup + попередній image

---

## 12. Post-go-live

- [ ] Seed admin password rotated
- [ ] Моніторинг 24–48 год
- [ ] `MANUAL_TEST_CHECKLIST.md` на prod URLs

---

## Що залишається після MVP (не блокує RC)

| Пункт | Пріоритет |
|-------|-----------|
| Object storage для uploads | P1 |
| Redis refresh tokens | P2 |
| CAPTCHA на register/login | P1 |
| Full cookies migration | P1 |
| Email verification enforcement policy | P1 (env готовий) |
| Admin delete users | P3 |
| Analytics dashboard | P3 |
| Image resize/crop | P2 |
| IDOR re-audit після нових endpoints | P1 |
