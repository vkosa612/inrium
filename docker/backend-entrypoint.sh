#!/bin/sh
set -e

cd /app/apps/backend

echo "Generating Prisma client..."
pnpm exec prisma generate

# Apply existing migrations (safe no-op if nothing new)
MIGRATIONS_DIR="prisma/migrations"
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR 2>/dev/null)" ]; then
  echo "Applying pending migrations..."
  pnpm exec prisma migrate deploy
else
  echo "No migrations found — skipping migrate deploy"
fi

ENTRY_FILE="/app/apps/backend/dist/main.js"

if [ ! -f "$ENTRY_FILE" ]; then
  echo "Backend entry file not found: $ENTRY_FILE"
  echo "Available main.js files:"
  find /app -type f -name "main.js" -print
  exit 1
fi

echo "Starting INRIUM backend..."
exec node "$ENTRY_FILE"
