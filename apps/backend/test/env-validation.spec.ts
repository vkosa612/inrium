import { envValidationSchema } from '../src/config/env.validation';

const SAFE_PROD: Record<string, string> = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db:5432/app',
  POSTGRES_USER: 'u',
  POSTGRES_PASSWORD: 'p',
  POSTGRES_DB: 'app',
  CORS_ORIGIN: 'https://app.example.test',
  SITE_URL: 'https://app.example.test',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  CSRF_SECRET: 'c'.repeat(48),
  SMTP_HOST: 'smtp.example.test',
  SMTP_FROM: 'INRIUM <noreply@example.test>',
};

function validate(env: Record<string, string>) {
  return envValidationSchema.validate(env, { allowUnknown: true, abortEarly: false });
}

describe('Валідація env (production fail-fast)', () => {
  it('безпечна production-конфігурація проходить і отримує безпечні дефолти', () => {
    const { error, value } = validate(SAFE_PROD);
    expect(error).toBeUndefined();
    expect(value.SWAGGER_ENABLED).toBe('false');
    expect(value.REQUIRE_EMAIL_VERIFICATION).toBe('true');
    expect(value.COOKIE_SAMESITE).toBe('lax');
  });

  it.each([
    ['REQUIRE_EMAIL_VERIFICATION=false', { REQUIRE_EMAIL_VERIFICATION: 'false' }],
    ['COOKIE_SECURE=false', { COOKIE_SECURE: 'false' }],
    ['CAPTCHA_PROVIDER=test', { CAPTCHA_PROVIDER: 'test' }],
    ['CAPTCHA_REQUIRED=true без провайдера', { CAPTCHA_REQUIRED: 'true' }],
    ['CAPTCHA_REQUIRED=true без ключа', { CAPTCHA_REQUIRED: 'true', CAPTCHA_PROVIDER: 'turnstile' }],
    ['wildcard у CORS_ORIGIN', { CORS_ORIGIN: '*' }],
    ['http у CORS_ORIGIN', { CORS_ORIGIN: 'http://app.example.test' }],
    ['http у SITE_URL', { SITE_URL: 'http://app.example.test' }],
    ['короткий JWT-секрет', { JWT_ACCESS_SECRET: 'short-secret-1234567' }],
    ['плейсхолдер JWT-секрету', { JWT_REFRESH_SECRET: 'change_me_refresh_secret_min_32_chars' }],
    ['плейсхолдер CSRF-секрету', { CSRF_SECRET: 'change_me_csrf_secret_min_32_chars' }],
    ['SMTP_HOST без SMTP_FROM', { SMTP_FROM: '' }],
  ])('production відхиляє: %s', (_label, override) => {
    const { error } = validate({ ...SAFE_PROD, ...override });
    expect(error).toBeDefined();
  });

  it('production вимагає CSRF_SECRET та SITE_URL', () => {
    const { CSRF_SECRET: _csrf, ...withoutCsrf } = SAFE_PROD;
    expect(validate(withoutCsrf).error).toBeDefined();
    const { SITE_URL: _site, ...withoutSite } = SAFE_PROD;
    expect(validate(withoutSite).error).toBeDefined();
  });

  it('production із CAPTCHA_REQUIRED=true та ключем проходить', () => {
    const { error } = validate({
      ...SAFE_PROD,
      CAPTCHA_REQUIRED: 'true',
      CAPTCHA_PROVIDER: 'hcaptcha',
      CAPTCHA_SECRET_KEY: 'server-side-key',
    });
    expect(error).toBeUndefined();
  });

  it('поза production test-адаптер дозволений, а wildcard CORS і SameSite=None без Secure — ні', () => {
    const dev = { ...SAFE_PROD, NODE_ENV: 'development', CORS_ORIGIN: 'http://localhost:3000', SITE_URL: 'http://localhost:3000' };
    expect(validate({ ...dev, CAPTCHA_PROVIDER: 'test', CAPTCHA_REQUIRED: 'true' }).error).toBeUndefined();
    expect(validate({ ...dev, CORS_ORIGIN: '*' }).error).toBeDefined();
    expect(validate({ ...dev, COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'false' }).error).toBeDefined();
    expect(validate({ ...dev, COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'true' }).error).toBeUndefined();
  });

  it('development має зручні дефолти (Swagger увімкнений, верифікація email вимкнена)', () => {
    const { value } = validate({ ...SAFE_PROD, NODE_ENV: 'development', CORS_ORIGIN: 'http://localhost:3000', SITE_URL: 'http://localhost:3000' });
    expect(value.SWAGGER_ENABLED).toBe('true');
    expect(value.REQUIRE_EMAIL_VERIFICATION).toBe('false');
  });
});
