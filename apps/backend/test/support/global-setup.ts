import { execSync } from 'child_process';
import { join } from 'path';
import { assertTestDatabase, DEFAULT_TEST_DATABASE_URL } from './db-guard';

/**
 * Застосовує міграції до ТЕСТОВОЇ БД (prisma migrate deploy — без reset і без втрати даних).
 * Падає, якщо БД не є тестовою або недоступна.
 */
export default function globalSetup(): void {
  const databaseUrl = assertTestDatabase(process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL);

  try {
    execSync('pnpm exec prisma migrate deploy', {
      cwd: join(__dirname, '..', '..'),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });
  } catch (err) {
    const output = err instanceof Error && 'stderr' in err ? String((err as { stderr: unknown }).stderr) : '';
    throw new Error(
      `[tests] Не вдалося застосувати міграції до тестової БД.\n` +
        `Запустіть її: docker compose -f docker-compose.test.yml up -d --wait\n${output}`,
    );
  }
}
