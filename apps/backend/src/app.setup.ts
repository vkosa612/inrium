import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import type { IncomingMessage } from 'http';
import { join } from 'path';
import { API_PREFIX, SWAGGER_PATH } from './common/constants';
import { ACCESS_COOKIE, REQUEST_ID_HEADER } from './common/security/security.constants';
import { SecurityConfigService } from './common/security/security-config.service';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;
const UPLOAD_BODY_LIMIT_BYTES = 6_291_456; // 6 MB (максимум файлу — 5 MB)

/**
 * Fastify adapter. `trustProxy` — кількість довірених reverse-proxy hops:
 * IP клієнта береться з X-Forwarded-For лише за цією кількістю hops (0 = заголовок ігнорується).
 */
export function createFastifyAdapter(trustedProxyHops = 0): FastifyAdapter {
  return new FastifyAdapter({
    logger: false,
    bodyLimit: UPLOAD_BODY_LIMIT_BYTES,
    // proxy-addr: hop — індекс адреси в ланцюжку від найближчого до нас проксі.
    trustProxy: trustedProxyHops > 0 ? (_address: string, hop: number) => hop < trustedProxyHops : false,
    genReqId: (req: IncomingMessage) => {
      const incoming = req.headers[REQUEST_ID_HEADER];
      const value = Array.isArray(incoming) ? incoming[0] : incoming;
      return value && REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
    },
  });
}

/** Structured (JSON) логи у production, зрозумілі — у development, тиша у тестах. */
export function createNestLogger(): LoggerService | false {
  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'test') return false;
  const level = process.env.LOG_LEVEL ?? 'info';
  const levels = {
    debug: ['fatal', 'error', 'warn', 'log', 'debug'],
    info: ['fatal', 'error', 'warn', 'log'],
    warn: ['fatal', 'error', 'warn'],
    error: ['fatal', 'error'],
  } as const;
  return new ConsoleLogger({
    json: env === 'production',
    colors: env !== 'production',
    logLevels: [...(levels[level as keyof typeof levels] ?? levels.info)],
  });
}

/**
 * Єдина конфігурація застосунку для `main.ts` і для інтеграційних тестів
 * (тести перевіряють саме ту конфігурацію, яка працює в runtime).
 */
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  const config = app.get(ConfigService);
  const security = app.get(SecurityConfigService);
  const swaggerEnabled = config.get<string>('SWAGGER_ENABLED', 'false') === 'true';
  const uploadsDir = config.get<string>('UPLOADS_DIR', join(process.cwd(), 'uploads'));

  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  const fastify = app.getHttpAdapter().getInstance();

  // ── Security headers (реєструємо першими, щоб вони діяли на всі наступні маршрути) ─────
  await app.register(fastifyHelmet, {
    strictTransportSecurity: security.isProduction
      ? { maxAge: 15_552_000, includeSubDomains: true }
      : false,
    contentSecurityPolicy: {
      directives: swaggerEnabled
        ? {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
            scriptSrc: [`'self'`, `'unsafe-inline'`],
            connectSrc: [`'self'`],
            fontSrc: [`'self'`, 'data:'],
          }
        : {
            // API віддає лише JSON та зображення — жодних активних ресурсів.
            defaultSrc: [`'none'`],
            frameAncestors: [`'none'`],
            baseUri: [`'none'`],
            formAction: [`'none'`],
          },
    },
  });

  // ── Cookies ───────────────────────────────────────────────────────────────
  await app.register(fastifyCookie);

  // ── Multipart (image uploads) ─────────────────────────────────────────────
  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  // ── Static uploads (public GET /uploads/*) ────────────────────────────────
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
    // Файли користувачів — лише як зображення; нічого не виконуємо та не «вгадуємо» тип.
    dotfiles: 'deny',
    index: false,
    list: false,
    setHeaders: (reply) => {
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('Content-Security-Policy', `default-src 'none'; sandbox`);
    },
  });

  // ── Request id, cache-control, structured access log ──────────────────────
  const httpLogger = new Logger('HTTP');
  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header(REQUEST_ID_HEADER, request.id);
    const path = request.url.split('?')[0];
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    if (path.startsWith(`/${API_PREFIX}/auth`) || cookies?.[ACCESS_COOKIE]) {
      // Відповіді, що залежать від сесії, не можна кешувати (браузер, CDN, проксі).
      reply.header('Cache-Control', 'private, no-store');
    }
    return payload;
  });
  fastify.addHook('onResponse', async (request, reply) => {
    const path = request.url.split('?')[0]; // query може містити токени — не логуємо
    if (path === `/${API_PREFIX}/health`) return;
    httpLogger.log(
      JSON.stringify({
        reqId: request.id,
        method: request.method,
        path,
        status: reply.statusCode,
        ms: Math.round(reply.elapsedTime),
      }),
    );
  });

  // ── Global prefix + validation ────────────────────────────────────────────
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── CORS: строгий allowlist, без wildcard (credentials = true) ───────────
  app.enableCors({
    origin: (origin, callback) => {
      // Запити без Origin (curl, server-to-server) CORS не стосуються; браузерні перевіряються.
      if (!origin || security.isOriginAllowed(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  });

  // ── Swagger (SWAGGER_ENABLED=false за замовчуванням у production) ────────
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('INRIUM API')
      .setDescription('INRIUM — платформа для настільних рольових ігор')
      .setVersion('0.1.0')
      .addCookieAuth(ACCESS_COOKIE)
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(SWAGGER_PATH, app, document);
  }
}
