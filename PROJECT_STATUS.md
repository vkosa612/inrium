# INRIUM — статус проєкту

Останнє оновлення: жовтень 2026

## Поточний статус

**Технічна база стабілізована** для:

- авторських/продуктових правок UI та контенту (`docs/UI_HANDOFF.md`);
- staging на Docker;
- підготовки production (зовнішні кроки: `docs/REMAINING_EXTERNAL_TASKS.md`).

**GO** для UI-правок і staging.
**NO-GO** для публічного production, поки немає домену, HTTPS, SMTP, CAPTCHA keys і перевіреного backup/restore.

## Готові модулі

| Модуль | Статус |
|--------|--------|
| Cookie HttpOnly auth + refresh rotation | ✅ |
| CSRF + CORS allowlist | ✅ |
| Rate limit + CAPTCHA adapter | ✅ |
| Email verify/reset/resend, anti-enumeration | ✅ |
| RBAC + IDOR тести | ✅ |
| CMS, games, applications, communities | ✅ |
| Admin stats з БД | ✅ |
| Uploads JPEG/PNG/WebP + magic bytes | ✅ |
| `/privacy`, `/terms` (чернетки DRAFT) | ✅ |
| Docker + CI (lint, tests, e2e) | ✅ |

## Документація

| Файл | Призначення |
|------|-------------|
| `docs/TECHNICAL_BASELINE.md` | Аудит поточного коду |
| `docs/SECURITY_IMPLEMENTATION.md` | Сесії, CSRF, ACL |
| `docs/TEST_MATRIX.md` | Що і як тестується |
| `docs/EMAIL_PRODUCTION_SETUP.md` | SMTP / DNS |
| `docs/DEPLOYMENT_READINESS.md` | Prod compose, backup |
| `docs/REMAINING_EXTERNAL_TASKS.md` | Зовнішні BLOCKED |
| `docs/UI_HANDOFF.md` | Для наступного UI-етапу |
| `docs/ACCESS_CONTROL_AUDIT.md` | IDOR аудит |
| `.env.example` / `.env.production.example` | Env без секретів |

## Що можна правити далі

Див. `docs/UI_HANDOFF.md`: тексти, верстка, empty states, CMS-контент. Не чіпати cookie/CSRF/DTO.

## Що не робити без окремого плану

- Production deploy без зовнішнього чекліста.
- Object storage / Redis, якщо немає другої репліки.
- Admin delete users.
- Прибирати DRAFT-банер з legal без затверджених текстів.
