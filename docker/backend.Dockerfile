# syntax=docker/dockerfile:1
# Збірка з кореня репозиторію: docker build -f docker/backend.Dockerfile .
# Node 22: залежності backend (content-disposition@3, cookie@2) — ESM-only і потребують require(esm).
FROM node:22-alpine AS base
# openssl потрібен рушіям Prisma на Alpine
RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# ── builder: повні залежності, збірка, потім prod-only копія через `pnpm deploy` ──
FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @inrium/backend...

COPY packages/shared packages/shared
COPY apps/backend apps/backend

RUN pnpm --filter @inrium/shared build \
 && pnpm --filter @inrium/backend exec prisma generate \
 && pnpm --filter @inrium/backend build \
 && pnpm --filter @inrium/backend build:scripts

# Лише production-залежності (без jest/ts-node/nest-cli/typescript).
RUN pnpm --filter @inrium/backend deploy --prod /out \
 && cd /out && node_modules/.bin/prisma generate

# ── runner ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder --chown=node:node /out/ ./
COPY --chown=node:node docker/backend-entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod 0555 /entrypoint.sh \
 && mkdir -p /app/uploads/images && chown -R node:node /app/uploads

ENV UPLOADS_DIR=/app/uploads
USER node
EXPOSE 4200
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=6 \
  CMD node -e "require('http').get('http://127.0.0.1:4200/api/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
