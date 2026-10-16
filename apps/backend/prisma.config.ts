import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Конфігурація Prisma CLI (замінює застарілий блок `prisma` у package.json).
 *
 * Якщо є файл prisma.config.ts, Prisma сам не читає `.env` — підвантажуємо його вручну.
 * `process.loadEnvFile` НЕ перезаписує змінні, що вже задані в середовищі (Docker/CI мають пріоритет).
 */
for (const envFile of [resolve(__dirname, '.env'), resolve(__dirname, '../../.env')]) {
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --project prisma/tsconfig.seed.json --transpile-only prisma/seed.ts',
  },
});
