# INRIUM — готовність до розгортання

Це **не** інструкція «натисніть deploy». Production не виконується з цього репозиторію автоматично.

## Рекомендований запуск production (на сервері власника)

```bash
cp .env.production.example .env   # заповнити реальними секретами НА СЕРВЕРІ
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=160 backend
```

Frontend слухає `127.0.0.1:3000` — перед ним reverse proxy (TLS). Приклад: `docker/nginx/nginx.conf.example`.

Docker-збірка фронтенду **завжди** вшиває `NEXT_PUBLIC_API_URL=/api` (same-origin проксі). Не передавайте в образ прямий URL backend (`http://host:4200/api`): CSP `connect-src 'self'` заблокує клієнтські `fetch`, cookie перестануть бути first-party. Порт 4200 у production не публікувати.

## Обов'язково перед go-live

- [ ] Унікальні `JWT_*`, `CSRF_SECRET` ≥32, не placeholder
- [ ] `POSTGRES_PASSWORD` не dev-default
- [ ] `SITE_URL` / `CORS_ORIGIN` / `NEXT_PUBLIC_SITE_URL` = `https://...`
- [ ] `REQUIRE_EMAIL_VERIFICATION=true`
- [ ] `SWAGGER_ENABLED=false`
- [ ] Production SMTP + SPF/DKIM/DMARC (`docs/EMAIL_PRODUCTION_SETUP.md`)
- [ ] CAPTCHA ключі (`CAPTCHA_REQUIRED=true`, не `test`)
- [ ] `TRUSTED_PROXY_HOPS` відповідає топології (зазвичай 2: nginx + Next.js)
- [ ] Seed **не** запускати в production без `ALLOW_PRODUCTION_SEED` і сильних паролів
- [ ] Backup: `scripts/backup.sh`; periodic cron; перевірений restore
- [ ] Volume `uploads_data` у backup разом із БД
- [ ] Моніторинг: `ERROR_TRACKING_DSN` (необов'язково), health `GET /api/health`

## Seed

Локально (після up):

```bash
docker compose exec backend node dist-scripts/prisma/seed.js
```

У production seed за замовчуванням відмовляється. Демо-паролі `*.local` не для публічного сервера.

## Backup / restore

```bash
scripts/backup.sh ./backups
# restore — лише на ізольованому стенді, див. scripts/restore.sh
```

Restore на робочій БД без підтвердження не робити.

## Health

`GET /api/health` → `{ "success": true, "data": { "status": "ok" } }` або 503. Без версій, latency, шляхів.

## Обмеження масштабу

- Один інстанс backend: in-memory rate limit і CAPTCHA test-adapter не shared.
- Uploads на локальному томі — потрібен sticky volume або майбутній object storage.
