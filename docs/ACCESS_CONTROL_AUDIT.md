# INRIUM — аудит access control (IDOR/BOLA)

Останнє оновлення: червень 2026

## Підсумок

- **Критичний IDOR виправлено:** `GET /api/games?status=DRAFT` більше не повертає приватні чернетки.
- **Ownership checks** на іграх, заявках, закладках, профілі — на backend.
- **Публічний профіль** не містить email, passwordHash, tokens, sessions.

## Правила доступу

| Ресурс | Хто бачить / змінює |
|--------|---------------------|
| Публічні ігри (slug/list) | Усі; лише статуси OPEN/FULL/IN_PROGRESS/FINISHED |
| Чернетки ігор (DRAFT) | Лише master через `/my/games`, `by-id/:id` |
| Заявки на гру | Master/ADMIN — список; гравець — лише своя |
| Approve/reject/remove | Master гри або ADMIN; `appId` + `gameId` разом |
| Cancel заявки | Власник заявки або ADMIN |
| Bookmarks | Лише `userId` з JWT |
| `/api/users/:id` | Public safe fields; ACTIVE only |
| `/api/users`, role patch | ADMIN only |
| CMS (content/systems/kits/blocks) | ADMIN/EDITOR |
| Communities admin | ADMIN only |
| Upload image | ADMIN/EDITOR; GM cover — через owned game |

## Перевірені сценарії

1. USER A не бачить заявки USER B (`/api/games/my/applications` scoped).
2. USER A не може cancel чужу заявку → 403.
3. GM A не може edit/delete/cover/applications чужої гри GM B → 403.
4. GM A не може approve `appId` з іншої гри через чужий `gameId` → 404.
5. USER/EDITOR не може `/api/users` або PATCH role → 403.
6. `GET /api/users/:id` — без email/passwordHash.
7. `GET /api/games?status=DRAFT` — не повертає DRAFT (IDOR fix).

## Ручна перевірка через API

Потрібні два акаунти (player A, GM B) + токени з `/api/auth/login`.

```powershell
# 1. Публічний список не має DRAFT
Invoke-RestMethod 'http://localhost:4200/api/games?status=DRAFT' | Select-Object -ExpandProperty data
# items не повинні містити status=DRAFT

# 2. Чужа гра (підставити id гри GM B, token GM A)
$headers = @{ Authorization = 'Bearer <GM_A_TOKEN>' }
Invoke-WebRequest -Uri 'http://localhost:4200/api/games/by-id/<GAME_B_ID>' -Headers $headers
# Очікується 403

# 3. Admin users без ADMIN
Invoke-WebRequest -Uri 'http://localhost:4200/api/users' -Headers @{ Authorization = 'Bearer <PLAYER_TOKEN>' }
# Очікується 403
```

## Залишкові ризики (не IDOR)

| P | Ризик |
|---|--------|
| P1 | Tokens у JSON body login/register (XSS surface) |
| P1 | Production security phase (cookies, CSRF, CAPTCHA) |
| P2 | Public profile показує `role` |
| P2 | EDITOR може редагувати будь-який CMS item (by design) |
