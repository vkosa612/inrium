# syntax=docker/dockerfile:1
# Збірка з кореня репозиторію: docker build -f docker/frontend.Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS builder
# NEXT_PUBLIC_* та BACKEND_URL вбудовуються під час збірки (rewrites `/api/*` → backend обчислюються тут).
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG BACKEND_URL=http://backend:4200/api
ARG NEXT_PUBLIC_CAPTCHA_PROVIDER=
ARG NEXT_PUBLIC_CAPTCHA_SITE_KEY=
ARG NEXT_PUBLIC_CONTACT_EMAIL=
ARG NEXT_PUBLIC_ADS_EMAIL=
ARG NEXT_PUBLIC_PRIVACY_EMAIL=
ARG NEXT_PUBLIC_CONTACT_TELEGRAM=
ARG NEXT_PUBLIC_LEGAL_OPERATOR_NAME=
ARG NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    BACKEND_URL=$BACKEND_URL \
    NEXT_PUBLIC_CAPTCHA_PROVIDER=$NEXT_PUBLIC_CAPTCHA_PROVIDER \
    NEXT_PUBLIC_CAPTCHA_SITE_KEY=$NEXT_PUBLIC_CAPTCHA_SITE_KEY \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_ADS_EMAIL=$NEXT_PUBLIC_ADS_EMAIL \
    NEXT_PUBLIC_PRIVACY_EMAIL=$NEXT_PUBLIC_PRIVACY_EMAIL \
    NEXT_PUBLIC_CONTACT_TELEGRAM=$NEXT_PUBLIC_CONTACT_TELEGRAM \
    NEXT_PUBLIC_LEGAL_OPERATOR_NAME=$NEXT_PUBLIC_LEGAL_OPERATOR_NAME \
    NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS=$NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @inrium/frontend...

COPY packages/shared packages/shared
COPY apps/frontend apps/frontend
RUN mkdir -p apps/frontend/public

RUN pnpm --filter @inrium/shared build \
 && pnpm --filter @inrium/frontend build

FROM node:22-alpine AS runner
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=builder --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=node:node /app/apps/frontend/public ./apps/frontend/public
# Кеш Next (оптимізація зображень, ISR) має бути доступний для запису non-root користувачу.
RUN mkdir -p /app/apps/frontend/.next/cache && chown -R node:node /app/apps/frontend/.next

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=6 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/robots.txt',(r)=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/frontend/server.js"]
