#!/usr/bin/env bash
# Відновлення INRIUM з копії, створеної scripts/backup.sh.
# УВАГА: ПЕРЕЗАПИСУЄ поточні дані БД і завантаження. Для запуску потрібне явне підтвердження:
#   CONFIRM_RESTORE=yes scripts/restore.sh ./backups/20260101T000000Z
# Рекомендація: спершу перевірте відновлення на окремому (тестовому) стеку, а перед відновленням на бойовому
# зробіть свіжу копію (scripts/backup.sh).
set -euo pipefail

SRC="${1:-}"
PROJECT="${COMPOSE_PROJECT_NAME:-inrium}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml}"

[ -n "$SRC" ] && [ -d "$SRC" ] || { echo "Вкажіть каталог копії: scripts/restore.sh <каталог>" >&2; exit 1; }
[ -s "$SRC/db.dump" ] && [ -s "$SRC/uploads.tar.gz" ] || { echo "У каталозі немає db.dump / uploads.tar.gz" >&2; exit 1; }
[ "${CONFIRM_RESTORE:-}" = "yes" ] || { echo "Відновлення перезапише дані. Повторіть із CONFIRM_RESTORE=yes" >&2; exit 1; }

echo "Перевірка контрольних сум..."
(cd "$SRC" && sha256sum -c SHA256SUMS)

# shellcheck disable=SC2086
[ -n "$(docker compose $COMPOSE_FILES ps -q postgres)" ] || { echo "Сервіс postgres не запущений" >&2; exit 1; }

echo "Зупинка backend/frontend на час відновлення..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES stop frontend backend

echo "[1/2] Відновлення БД..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --exit-on-error' < "$SRC/db.dump"

echo "[2/2] Відновлення завантажень..."
docker run --rm -v "${PROJECT}_uploads_data:/data" -v "$(cd "$SRC" && pwd):/backup:ro" alpine:3.20 \
  sh -c 'find /data -mindepth 1 -delete && tar -xzf /backup/uploads.tar.gz -C /data && chown -R 1000:1000 /data'

echo "Запуск сервісів..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES start backend frontend
echo "Відновлення завершено."
