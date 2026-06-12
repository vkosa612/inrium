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
import { AppModule } from './app.module';
import { API_PREFIX, APP_NAME, SWAGGER_PATH } from './common/constants';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('BACKEND_PORT', 4200);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

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
    origin: corsOrigin,
    credentials: true,
  });

  // ── Cookie support (required for refresh_token httpOnly cookie) ──────────
  await app.register(fastifyCookie);

  // ── Swagger (must be set up BEFORE helmet so assets are registered) ──────
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

  // ── Security headers (Helmet for Fastify) ────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `'unsafe-inline'`],
        connectSrc: [`'self'`],
        fontSrc: [`'self'`, 'data:'],
      },
    },
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');

  const separator = '─'.repeat(50);
  console.log(`\n${separator}`);
  console.log(`  ${APP_NAME}`);
  console.log(`${separator}`);
  console.log(`  Environment : ${nodeEnv}`);
  console.log(`  Port        : ${port}`);
  console.log(`  API         : http://localhost:${port}/${API_PREFIX}`);
  console.log(`  Swagger     : http://localhost:${port}/${SWAGGER_PATH}`);
  console.log(`${separator}\n`);
}

bootstrap();
