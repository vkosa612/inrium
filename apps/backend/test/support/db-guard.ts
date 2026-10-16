/**
 * Захист від запуску тестів проти dev/prod БД.
 * Тести дозволені лише для локальної БД, ім'я якої закінчується на `_test`.
 */
export const DEFAULT_TEST_DATABASE_URL =
  'postgresql://inrium_test:inrium_test_password@127.0.0.1:55432/inrium_test?schema=public';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'postgres-test']);

export function assertTestDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('[tests] DATABASE_URL не задано');
  }
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('[tests] DATABASE_URL має некоректний формат');
  }
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `[tests] ВІДМОВА: база "${dbName}" не є тестовою (ім'я має закінчуватися на "_test"). Тести стирають дані!`,
    );
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`[tests] ВІДМОВА: хост "${parsed.hostname}" не є локальним тестовим сервером`);
  }
  return databaseUrl;
}
