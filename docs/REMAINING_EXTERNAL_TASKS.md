# Зовнішні задачі (не закриваються кодом у цьому репозиторії)

| Задача | Чому BLOCKED локально | Хто |
|--------|------------------------|-----|
| Домен і DNS A/AAAA | Потрібен реєстратор | Власник |
| TLS сертифікат | Let's Encrypt / інший CA | Власник + reverse proxy |
| Production SMTP | Обліковка провайдера | Власник; див. EMAIL_PRODUCTION_SETUP.md |
| SPF / DKIM / DMARC | DNS записи | Власник |
| Реальна перевірка доставки листів | Inbox, spam score | Власник |
| Turnstile або hCaptcha keys | Акаунт у провайдера | Власник |
| Хостинг / VM | Інфра | Власник |
| ERROR_TRACKING_DSN | Sentry/Glitchtip проєкт | Власник (опційно) |
| Юридичні тексти privacy/terms | Юрист / оператор | Власник; зараз DRAFT у UI |
| Контактні email | Реальні адреси | `NEXT_PUBLIC_CONTACT_*` |
| Object storage (S3/MinIO) | Рішення про інфру | Не обов'язково для MVP на 1 сервері |
| Redis shared rate-limit | Лише якщо >1 репліка backend | P1 при масштабуванні |
| Перевірений restore backup на стенді | Потрібен ізольований сервер | Ops |

Жоден із пунктів вище **не блокує авторське редагування UI** на локальному Docker.
