#!/bin/sh
# Запуск backend у контейнері. Fail-fast: будь-яка помилка міграції зупиняє старт (без «напівживого» сервісу).
set -eu

cd /app

# Лише `migrate deploy` — застосовує вже існуючі міграції, ніколи не скидає й не видаляє дані.
if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "Applying pending migrations (prisma migrate deploy)..."
    node_modules/.bin/prisma migrate deploy
  else
    echo "No migrations found - skipping migrate deploy"
  fi
else
  echo "SKIP_MIGRATIONS=true - migrations are expected to be applied separately"
fi

ENTRY_FILE="/app/dist/main.js"
if [ ! -f "$ENTRY_FILE" ]; then
  echo "Backend entry file not found: $ENTRY_FILE" >&2
  exit 1
fi

mkdir -p "${UPLOADS_DIR:-/app/uploads}/images"
echo "Starting INRIUM backend..."
exec node "$ENTRY_FILE"
