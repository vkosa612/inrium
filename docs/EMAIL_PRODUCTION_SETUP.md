# Налаштування пошти для production

> Статус: **код і локальна SMTP-інтеграція перевірені; реальна доставка — BLOCKED** (потрібні домен, DNS і SMTP-провайдер власника).

## Що є в коді

| Лист | Коли | Особливості |
|------|------|-------------|
| Підтвердження email | реєстрація, повторне надсилання | токен одноразовий, діє 24 год; у БД зберігається лише хеш (`@unique`) |
| Скидання пароля | `POST /auth/request-password-reset` | діє 1 год; після використання всі сесії відкликаються |
| «Акаунт уже існує» | повторна реєстрація існуючого email | замість `409`, щоб не розкривати наявність акаунта (anti-enumeration) |

- Відповіді API **однакові** для існуючого й неіснуючого email (реєстрація → `202`, скидання → однакове повідомлення).
- Вхід без підтвердженого email → код `EMAIL_NOT_VERIFIED`; UI пропонує надіслати лист повторно (`/auth/resend-verification`, з rate limit і CAPTCHA).
- Адреси в логах маскуються (`a***@domain`); тіла листів і токени не логуються. Посилання виводяться в лог лише при `NODE_ENV=development` і лише якщо SMTP не налаштований/відмовив.
- Відмова SMTP **не ламає запит**: `sendMail` повертає `false` після 3 спроб (з паузами), HTTP-відповідь для користувача не змінюється.
- Production: STARTTLS обов'язковий (`SMTP_REQUIRE_TLS` за замовчуванням `true`), сертифікат сервера перевіряється, TLS ≥ 1.2.
- Старт у production **відхиляється**, якщо `REQUIRE_EMAIL_VERIFICATION != true`, `SITE_URL` не `https://`, або задано `SMTP_HOST` без `SMTP_FROM`.

## Локальна перевірка (Mailpit)

```bash
# 1) локально (Docker)
docker compose -f docker-compose.test.yml --profile mail up -d --wait mailpit-test
MAILPIT_API_URL=http://127.0.0.1:18025 MAILPIT_SMTP_PORT=11025 pnpm --filter @inrium/backend test email-smtp
docker compose -f docker-compose.test.yml --profile mail down

# 2) ручна перевірка в dev-стеку
docker compose --profile mail up -d mailpit      # UI: http://127.0.0.1:8025
# у .env: SMTP_HOST=mailpit  SMTP_PORT=1025  REQUIRE_EMAIL_VERIFICATION=true
```

Тест `email-smtp.integration.spec.ts` реально надсилає листи по SMTP у Mailpit і читає їх через його API (тема, відправник, посилання, кодування токена, екранування HTML, поведінка при недоступному SMTP). У CI Mailpit піднімається як service-контейнер.

**Чого цей тест не доводить:** потрапляння у «Вхідні», підписи SPF/DKIM/DMARC, репутацію домену, ліміти провайдера.

## Що потрібно зробити власнику (BLOCKED без цього)

1. **Домен і поштова адреса відправника**, наприклад `no-reply@<your-domain>`.
2. **SMTP-провайдер** (Postmark, Mailgun, SES, Brevo, Resend SMTP тощо) — отримати `SMTP_HOST`, `SMTP_PORT` (587 + STARTTLS або 465 + `SMTP_SECURE=true`), `SMTP_USER`, `SMTP_PASS`.
3. **DNS-записи домену** (значення дає провайдер):
   - **SPF**: `TXT @ "v=spf1 include:<provider> -all"`
   - **DKIM**: `TXT <selector>._domainkey ...` (або CNAME від провайдера)
   - **DMARC**: `TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@<your-domain>"` (стартово можна `p=none`, потім посилити)
   - За потреби — Return-Path/CNAME для bounce-обробки.
4. Заповнити в `.env` на сервері (шаблон — `.env.production.example`): `SMTP_*`, `SMTP_FROM`, `SITE_URL=https://<your-domain>`, `REQUIRE_EMAIL_VERIFICATION=true`.
5. **Перевірка після запуску** (вручну, фіксується у `docs/MANUAL_TEST_CHECKLIST.md`):
   - реєстрація з реальної скриньки → лист у «Вхідні», а не «Спам»;
   - перевірка заголовків листа: `spf=pass`, `dkim=pass`, `dmarc=pass` (Gmail → «Показати оригінал», або mail-tester.com);
   - скидання пароля → вхід зі старим паролем неможливий, зі старими сесіями — теж;
   - відправити лист на неіснуючу адресу й переконатися, що застосунок не падає, а помилки видно в логах.
6. Налаштувати оброблення bounce/complaint у кабінеті провайдера (сповіщення власнику).

## Діагностика

| Симптом | Ймовірна причина |
|---------|------------------|
| У логах `Помилка SMTP ... ECONNREFUSED/ETIMEDOUT` | неправильний host/port або фаєрвол хостингу (порт 25/587 часто закритий) |
| `self-signed certificate` / `ERR_TLS_CERT_ALTNAME_INVALID` | неправильний `SMTP_HOST` (має збігатися з CN/SAN сертифіката); перевірку сертифіката вимикати **не можна** |
| `535 Authentication failed` | неправильні `SMTP_USER/SMTP_PASS` (у Gmail — лише App Password) |
| Користувач не отримує лист | перевірте «Спам», SPF/DKIM/DMARC, логи провайдера; відповідь API навмисно не розкриває наявність акаунта |
