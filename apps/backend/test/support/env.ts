import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { assertTestDatabase, DEFAULT_TEST_DATABASE_URL } from './db-guard';

/**
 * Базове тестове середовище. Усі ключі задаються явно (а не лишаються Joi-дефолтам),
 * щоб кожен тест міг детерміновано їх перевизначати.
 * Значення секретів — публічні тестові рядки, не пов'язані з жодним реальним середовищем.
 */
export const BASE_TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: assertTestDatabase(process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL),
  POSTGRES_USER: 'inrium_test',
  POSTGRES_PASSWORD: 'inrium_test_password',
  POSTGRES_DB: 'inrium_test',
  CORS_ORIGIN: 'http://localhost:3000',
  SITE_URL: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef',
  JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef',
  CSRF_SECRET: 'test-csrf-secret-0123456789abcdef-xyz',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  REFRESH_REUSE_GRACE_SECONDS: '10',
  COOKIE_SECURE: 'false',
  COOKIE_SAMESITE: 'lax',
  COOKIE_DOMAIN: '',
  TRUSTED_PROXY_HOPS: '0',
  CAPTCHA_PROVIDER: 'none',
  CAPTCHA_REQUIRED: 'false',
  CAPTCHA_SECRET_KEY: '',
  REQUIRE_EMAIL_VERIFICATION: 'false',
  SWAGGER_ENABLED: 'false',
  THROTTLE_TTL: '60000',
  THROTTLE_LIMIT: '100000',
  SMTP_HOST: '',
  SMTP_FROM: '',
  BACKEND_PORT: '0',
};

const uploadsDir = mkdtempSync(join(tmpdir(), 'inrium-test-uploads-'));

export function applyTestEnv(overrides: Record<string, string> = {}): void {
  Object.assign(process.env, BASE_TEST_ENV, { UPLOADS_DIR: uploadsDir }, overrides);
  assertTestDatabase(process.env.DATABASE_URL);
}

applyTestEnv();
