# Production deployment checklist

## Before go-live

- [ ] Copy `.env.example` → `.env` on server; **change all JWT secrets**
- [ ] Set `NODE_ENV=production`
- [ ] Set `SWAGGER_ENABLED=false`
- [ ] Set `CORS_ORIGIN` to your real frontend origin(s)
- [ ] Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_API_URL` (HTTPS recommended)
- [ ] Set `BACKEND_BIND=127.0.0.1` if using Nginx reverse proxy
- [ ] Postgres and Adminer **not** exposed to WAN (compose defaults: localhost)
- [ ] Never commit `.env` or `uploads/*` (only `.gitkeep`)
- [ ] Backup `./uploads` volume and Postgres data regularly

## Build & run

```powershell
cd D:\inrium
docker compose down --remove-orphans
docker compose --progress=plain build
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend
```

## Smoke tests

```powershell
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:4200/api/health -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:3000/games -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:3000/about -UseBasicParsing | Select-Object StatusCode
```

## CI

GitHub Actions workflow: `.github/workflows/ci.yml` — typecheck + build on push/PR.

## Reverse proxy

Example Nginx config: `docker/nginx/nginx.conf.example`

## Email / password reset

In development, reset tokens are logged to backend console. Wire SMTP in production before enabling public registration.
