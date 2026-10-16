import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { PrismaClient } from '@prisma/client';
import { applyTestEnv } from './env';
import { MailOutbox } from './mail-outbox';
import { TestClient } from './test-client';

export interface TestContext {
  app: NestFastifyApplication;
  prisma: PrismaClient;
  mail: MailOutbox;
  /** Новий клієнт із власним cookie jar. */
  client(options?: { ip?: string; origin?: string | null }): TestClient;
  close(): Promise<void>;
  rateLimit: { resetAll(): void };
}

/**
 * Піднімає ПОВНИЙ застосунок (ті самі guards, filters, hooks, що й у runtime — `configureApp`)
 * проти ізольованої тестової БД. Конфігурація читається з env під час імпорту AppModule,
 * тому модулі завантажуються заново з потрібними overrides.
 */
export async function createTestApp(envOverrides: Record<string, string> = {}): Promise<TestContext> {
  applyTestEnv(envOverrides);
  let ctx: TestContext | undefined;
  await new Promise<void>((resolve, reject) => {
    jest.isolateModules(() => {
      // Усі Nest-пакети мають завантажуватись в одному (ізольованому) registry.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const testing = require('@nestjs/testing') as typeof import('@nestjs/testing');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const setup = require('../../src/app.setup') as typeof import('../../src/app.setup');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { EmailService } = require('../../src/modules/email/email.service') as typeof import('../../src/modules/email/email.service');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaService } = require('../../src/prisma/prisma.service') as typeof import('../../src/prisma/prisma.service');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RateLimitService } = require('../../src/common/security/rate-limit.service') as typeof import('../../src/common/security/rate-limit.service');

      const mail = new MailOutbox();
      testing.Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(EmailService)
        .useValue(mail)
        .compile()
        .then(async (moduleRef) => {
          const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);
          const app = moduleRef.createNestApplication<NestFastifyApplication>(
            setup.createFastifyAdapter(hops),
            { logger: false },
          );
          await setup.configureApp(app);
          await app.init();
          await app.getHttpAdapter().getInstance().ready();

          const prisma = app.get(PrismaService);
          const rateLimit = app.get(RateLimitService);
          ctx = {
            app,
            prisma,
            mail,
            rateLimit,
            client: (options) => new TestClient(app, options),
            close: () => app.close(),
          };
          resolve();
        })
        .catch(reject);
    });
  });

  if (!ctx) throw new Error('Не вдалося створити тестовий застосунок');
  return ctx;
}
