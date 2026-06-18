import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { API_PREFIX, APP_NAME, SWAGGER_PATH } from './common/constants';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, bodyLimit: 6_291_456 }), // 6 MB (upload max 5 MB)
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('BACKEND_PORT', 4200);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const swaggerEnabled = configService.get<string>('SWAGGER_ENABLED', 'true') === 'true';
  const uploadsDir = configService.get<string>(
    'UPLOADS_DIR',
    join(process.cwd(), 'uploads'),
  );

  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // CORS: supports comma-separated list or single origin
  const rawCors = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const corsOrigins = rawCors.includes(',')
    ? rawCors.split(',').map((o) => o.trim())
    : rawCors;

  // ── Multipart (image uploads) ─────────────────────────────────────────────
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  });

  // ── Static uploads (public GET /uploads/*) ────────────────────────────────
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // ── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix(API_PREFIX);

  // ── Validation pipe ──────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Cookie support (required for refresh_token httpOnly cookie) ──────────
  await app.register(fastifyCookie);

  // ── Swagger (conditional — disabled in production via SWAGGER_ENABLED=false) ──
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('INRIUM API')
      .setDescription('INRIUM — платформа для настільних рольових ігор')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(SWAGGER_PATH, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ── Security headers (Helmet for Fastify) ────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: swaggerEnabled
      ? {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
            scriptSrc: [`'self'`, `'unsafe-inline'`],
            connectSrc: [`'self'`],
            fontSrc: [`'self'`, 'data:'],
          },
        }
      : {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`],
            imgSrc: [`'self'`, 'data:'],
            scriptSrc: [`'self'`],
            connectSrc: [`'self'`],
            fontSrc: [`'self'`],
          },
        },
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  const bind = configService.get<string>('BACKEND_BIND', '0.0.0.0');
  await app.listen(port, bind);

  const separator = '─'.repeat(50);
  console.log(`\n${separator}`);
  console.log(`  ${APP_NAME}`);
  console.log(`${separator}`);
  console.log(`  Environment : ${nodeEnv}`);
  console.log(`  Bind        : ${bind}:${port}`);
  console.log(`  API         : http://localhost:${port}/${API_PREFIX}`);
  console.log(`  Uploads     : ${uploadsDir}`);
  if (swaggerEnabled) {
    console.log(`  Swagger     : http://localhost:${port}/${SWAGGER_PATH}`);
  } else {
    console.log(`  Swagger     : disabled (SWAGGER_ENABLED=false)`);
  }
  console.log(`${separator}\n`);
}

bootstrap();
