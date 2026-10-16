#!/usr/bin/env bash
# Резервна копія INRIUM: дамп PostgreSQL (custom-формат) + архів тому завантажень.
# Використання:  scripts/backup.sh [каталог_призначення]   (за замовчуванням ./backups)
# Змінні: COMPOSE_FILES ("-f docker-compose.yml -f docker-compose.prod.yml"), COMPOSE_PROJECT_NAME (inrium),
#         KEEP_BACKUPS (скільки останніх копій лишати; 0 = не чистити, за замовчуванням 0).
# Скрипт завершується з помилкою при будь-якому збої (fail-fast) і не лишає «часткових» копій.
set -euo pipefail

DEST="${1:-./backups}"
PROJECT="${COMPOSE_PROJECT_NAME:-inrium}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml}"
KEEP="${KEEP_BACKUPS:-0}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${DEST}/${STAMP}"
TMP="${DEST}/.tmp-${STAMP}"

command -v docker >/dev/null || { echo "docker не знайдено" >&2; exit 1; }

# shellcheck disable=SC2086
if [ -z "$(docker compose $COMPOSE_FILES ps -q postgres)" ]; then
  echo "Сервіс postgres не запущений - нічого копіювати" >&2
  exit 1
fi

mkdir -p "$TMP"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "[1/3] Дамп бази даних..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' > "$TMP/db.dump"
[ -s "$TMP/db.dump" ] || { echo "Дамп порожній" >&2; exit 1; }

echo "[2/3] Архів завантажень (том ${PROJECT}_uploads_data)..."
docker run --rm -v "${PROJECT}_uploads_data:/data:ro" -v "$(cd "$TMP" && pwd):/backup" alpine:3.20 \
  tar -czf /backup/uploads.tar.gz -C /data .

echo "[3/3] Контрольні суми..."
(cd "$TMP" && sha256sum db.dump uploads.tar.gz > SHA256SUMS)

mkdir -p "$DEST"
mv "$TMP" "$TARGET"
trap - EXIT
echo "Готово: $TARGET"

if [ "$KEEP" -gt 0 ]; then
  # shellcheck disable=SC2012
  ls -1dt "$DEST"/20* 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -rf
fi
