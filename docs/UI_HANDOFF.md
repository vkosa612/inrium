# INRIUM — handoff для авторського UI/UX

Технічна база (auth, CSRF, ACL, тести) готова. Цей файл — що можна міняти у інтерфейсі **без** поломки контрактів.

## Маршрути (App Router)

### Публічні
`/`, `/news`, `/articles`, `/systems`, `/systems/[slug]`, `/help`, `/help/[slug]`, `/content/[slug]`, `/games`, `/games/[slug]`, `/communities`, `/communities/[slug]`, `/users/[id]`, `/about`, `/contacts`, `/advertise`, `/privacy`, `/terms`, `/search`, `/sitemap.xml`, `/robots.txt`

### Auth
`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`  
Не індексувати; не класти в sitemap.

### Приватні (потрібна сесія)
`/profile`, `/my/games`, `/my/games/new`, `/my/games/[id]/edit`, `/my/games/[id]/applications`, `/my/applications`

### Admin
`/admin` — ADMIN або EDITOR (статистика users лише ADMIN)  
`/admin/content`, `/admin/systems`, `/admin/home-blocks` — ADMIN/EDITOR  
`/admin/users`, `/admin/communities` — ADMIN only  
**Немає** `/admin/settings` (прибрано навмисно).

## Ролі

| Роль | UI |
|------|-----|
| PLAYER | Ігри, заявки, профіль, закладки |
| GAME_MASTER | + створення/керування **своїми** іграми |
| EDITOR | CMS content/systems/home-blocks + admin dashboard без users/communities |
| ADMIN | Усе CMS + users + communities + stats.users |

Підписи: `src/lib/labels.ts`. Не показувати сирі enum у UI.

## Статуси ігор

`DRAFT` | `OPEN` | `FULL` | `IN_PROGRESS` | `FINISHED` | `CANCELLED`  
Публічно видно лише OPEN/FULL/IN_PROGRESS/FINISHED.

## Статуси заявок

`PENDING` | `APPROVED` | `REJECTED` | `CANCELLED` | `REMOVED`  
Підписи: `src/lib/game-labels.ts`.

## User flows (не ламати)

1. Register → лист/dev-log → `/verify-email` → login (у prod без verify login блокується).
2. Login → HttpOnly cookies; reload сторінки читає `/auth/me`.
3. Apply на OPEN гру → `/my/applications` → cancel своєї PENDING.
4. GM: create/edit/cover → applications approve/reject/remove → FULL/OPEN автоматично.
5. Self-delete: підтвердження `ВИДАЛИТИ` + пароль.
6. Admin CMS CRUD + image upload JPG/PNG/WebP ≤5MB.

## API-контракти, які не можна порушувати

- Автентифікація **тільки** cookie + `credentials: 'include'`. Не повертати токени в JSON, не писати їх у storage.
- Мутації: заголовок `X-CSRF-Token` (клієнт `src/lib/http.ts` уже робить).
- Обгортка відповіді `{ success, data, timestamp }`.
- Помилки: `{ success: false, statusCode, message, code? }` українською.
- Коди: `AUTH_REQUIRED`, `CSRF_INVALID`, `EMAIL_NOT_VERIFIED`.
- Public `GET /games?status=` не відкриває DRAFT.
- Mass assignment: зайві поля DTO → 400 (`forbidNonWhitelisted`).

Транспорт: `src/lib/http.ts`. Доменні виклики: `src/lib/api.ts`.

## Ключові компоненти

| Компонент | Призначення |
|-----------|-------------|
| `Header` / `Footer` | Навігація; footer уже веде на існуючі маршрути включно з privacy/terms |
| `AuthContext` | Сесія з `/auth/me` |
| `AdminRouteShell` / `ProtectedRouteShell` | Guards |
| `GameForm` / `GameApplyButton` | Ігри |
| `ImageUpload` | Cover |
| `MarkdownContent` / `MarkdownEditor` | Без raw HTML |
| `LegalDraftPage` | Чернетки legal |

Стилі зараз переважно inline + Tailwind утиліти. **Можна** змінювати копірайт, відступи, порожні стани, ієрархію блоків. **Не можна** прибирати CSRF/cookie логіку, guards, `resolveMediaUrl`.

## Контакти

Централізовано: `src/lib/site-config.ts` (`NEXT_PUBLIC_CONTACT_*`).  
Якщо змінні порожні — UI чесно каже, що контакт не налаштований. Не вигадувати `hello@inrium.local` як «реальну» адресу.

## Legal

`/privacy` і `/terms` — **чернетки** (`robots: noindex`), банер DRAFT, питання для власника. Не видаляти дисклеймер, поки юрист не затвердить текст.

## Безпечні зони для наступного UI-етапу

- Тексти головної, about, contacts, advertise, help empty states.
- Візуальна ієрархія карток ігор/спільнот (зберегти cover fallback).
- Форми: підказки, порядок полів (не змінювати імена полів API).
- Адмін: підписи, щільність таблиць (не вигадувати settings page без backend).
- Accessibility: контраст, фокус, aria (не чіпати auth).

## Прогалини UX (не блокери техніки)

- Немає банера «підтвердіть пошту» після login у dev з вимкненим enforcement.
- Немає crop зображень.
- Статистика адмінки — прості count, не графіки.
- Privacy/terms ще не юридично фінальні.
- Контакти порожні, доки не задані env.

## Рекомендований порядок UI-правок

1. Головна: ієрархія, CTA, порожні блоки систем/наборів.
2. Картки ігор/спільнот і detail pages (типографіка, cover).
3. Auth форми (ясність помилок, не логіка).
4. Кабінет GM (`/my/games`) і заявки.
5. CMS адмінка (щільність, не нові розділи).
6. Фінальні legal тексти після відповідей власника.
