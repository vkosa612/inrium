import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { configureApp, createFastifyAdapter, createNestLogger } from './app.setup';
import { API_PREFIX, APP_NAME, SWAGGER_PATH } from './common/constants';

async function bootstrap() {
  // ConfigModule.forRoot() завантажує .env під час імпорту AppModule → process.env вже заповнений.
  const trustedProxyHops = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createFastifyAdapter(trustedProxyHops),
    { logger: createNestLogger() },
  );
  await configureApp(app);

  const config = app.get(ConfigService);
  const port = config.get<number>('BACKEND_PORT', 4200);
  const bind = config.get<string>('BACKEND_BIND', '0.0.0.0');
  const swaggerEnabled = config.get<string>('SWAGGER_ENABLED', 'false') === 'true';

  app.enableShutdownHooks();
  await app.listen(port, bind);

  const lines = [
    `${APP_NAME}`,
    `Environment : ${config.get<string>('NODE_ENV', 'development')}`,
    `Bind        : ${bind}:${port}`,
    `API         : /${API_PREFIX}`,
    `Swagger     : ${swaggerEnabled ? `/${SWAGGER_PATH}` : 'disabled'}`,
  ];
  console.log(lines.join(' | '));
}

bootstrap().catch((err: unknown) => {
  console.error('[INRIUM] Не вдалося запустити застосунок:', err);
  process.exit(1);
});
