import * as Joi from 'joi';

/** Значення з `.env.example`, які не можна використовувати в production. */
const PLACEHOLDER_SECRETS = [
  'change_me_access_secret_min_32_chars',
  'change_me_refresh_secret_min_32_chars',
  'change_me_csrf_secret_min_32_chars',
  'dev-only-csrf-secret-do-not-use-in-production',
];

function productionSecret(value: string, helpers: Joi.CustomHelpers) {
  const nodeEnv = helpers.state.ancestors[0]?.NODE_ENV as string | undefined;
  if (nodeEnv === 'production') {
    if (value.length < 32) {
      return helpers.error('string.min', { limit: 32 });
    }
    if (PLACEHOLDER_SECRETS.includes(value) || /^change_?me/i.test(value)) {
      return helpers.error('any.invalid');
    }
  }
  return value;
}

/** Секрет із мінімальною довжиною 16 (32 і без плейсхолдерів — у production). */
function secretField(name: string) {
  return Joi.string()
    .min(16)
    .required()
    .custom(productionSecret)
    .messages({
      'any.required': `${name} is required`,
      'string.min': `${name} must be at least 16 characters (32 in production)`,
      'any.invalid': `${name} must not use placeholder values in production`,
    });
}

const bool = () => Joi.string().valid('true', 'false');

/**
 * Крос-полькові правила, які неможливо виразити окремими полями.
 * Помилка тут зупиняє старт застосунку (fail-fast).
 */
function crossFieldRules(env: Record<string, string | undefined>) {
  const production = env.NODE_ENV === 'production';
  const problems: string[] = [];

  const origins = (env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (origins.some((o) => o === '*' || o.includes('*'))) {
    problems.push('CORS_ORIGIN не може містити wildcard (*): запити з cookie потребують явного allowlist');
  }

  if (env.COOKIE_SAMESITE === 'none' && !production && env.COOKIE_SECURE !== 'true') {
    problems.push('COOKIE_SAMESITE=none вимагає COOKIE_SECURE=true');
  }

  if (env.CAPTCHA_REQUIRED === 'true') {
    const remote = env.CAPTCHA_PROVIDER === 'turnstile' || env.CAPTCHA_PROVIDER === 'hcaptcha';
    if (!remote && !(env.CAPTCHA_PROVIDER === 'test' && !production)) {
      problems.push(
        'CAPTCHA_REQUIRED=true потребує CAPTCHA_PROVIDER=turnstile|hcaptcha (test-адаптер дозволений лише поза production)',
      );
    }
    if (remote && !env.CAPTCHA_SECRET_KEY?.trim()) {
      problems.push('CAPTCHA_REQUIRED=true потребує CAPTCHA_SECRET_KEY');
    }
  }

  if (production) {
    if (env.CAPTCHA_PROVIDER === 'test') {
      problems.push('CAPTCHA_PROVIDER=test заборонений у production');
    }
    if (env.REQUIRE_EMAIL_VERIFICATION !== 'true') {
      problems.push('REQUIRE_EMAIL_VERIFICATION має бути true у production');
    }
    if (env.COOKIE_SECURE === 'false') {
      problems.push('COOKIE_SECURE=false заборонений у production (cookie завжди Secure)');
    }
    if (origins.some((o) => !o.startsWith('https://'))) {
      problems.push('CORS_ORIGIN у production має містити лише https:// origin');
    }
    if (env.SITE_URL && !env.SITE_URL.startsWith('https://')) {
      problems.push('SITE_URL у production має починатися з https://');
    }
    if (env.SMTP_HOST?.trim() && !env.SMTP_FROM?.trim()) {
      problems.push('SMTP_FROM обов\'язковий, якщо задано SMTP_HOST');
    }
  }

  if (problems.length > 0) {
    throw new Error(`Небезпечна конфігурація:\n - ${problems.join('\n - ')}`);
  }
  return env;
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  BACKEND_PORT: Joi.number().default(4200),

  // Database
  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL is required. Format: postgresql://user:pass@host:5432/db',
  }),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),

  // CORS
  CORS_ORIGIN: Joi.string().required().messages({
    'any.required': 'CORS_ORIGIN is required (e.g. http://localhost:3000)',
  }),

  // JWT / CSRF
  JWT_ACCESS_SECRET: secretField('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: secretField('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('7d'),
  REFRESH_REUSE_GRACE_SECONDS: Joi.number().integer().min(0).max(60).default(10),
  CSRF_SECRET: Joi.string()
    .min(16)
    .custom(productionSecret)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.any().default('dev-only-csrf-secret-do-not-use-in-production'),
    })
    .messages({
      'any.required': 'CSRF_SECRET is required in production',
      'string.min': 'CSRF_SECRET must be at least 16 characters (32 in production)',
      'any.invalid': 'CSRF_SECRET must not use placeholder values in production',
    }),

  // Cookies
  COOKIE_SECURE: bool().when('NODE_ENV', {
    is: 'production',
    then: Joi.any().default('true'),
    otherwise: Joi.any().default('false'),
  }),
  COOKIE_SAMESITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  COOKIE_DOMAIN: Joi.string().optional().allow(''),

  // Proxy / client IP
  TRUSTED_PROXY_HOPS: Joi.number().integer().min(0).max(5).default(0),

  // Rate limiting (global baseline; auth-specific limits — у коді AuthService)
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // CAPTCHA
  CAPTCHA_PROVIDER: Joi.string().valid('none', 'turnstile', 'hcaptcha', 'test').default('none'),
  CAPTCHA_REQUIRED: bool().default('false'),
  CAPTCHA_SECRET_KEY: Joi.string().optional().allow(''),

  // Feature flags
  SWAGGER_ENABLED: bool().when('NODE_ENV', {
    is: 'production',
    then: Joi.any().default('false'),
    otherwise: Joi.any().default('true'),
  }),
  REQUIRE_EMAIL_VERIFICATION: bool().when('NODE_ENV', {
    is: 'production',
    then: Joi.any().default('true'),
    otherwise: Joi.any().default('false'),
  }),

  // Local file uploads (cover images)
  UPLOADS_DIR: Joi.string().default('uploads'),

  // Public site URL for email links
  SITE_URL: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'SITE_URL is required in production (e.g. https://your-domain.example)',
      }),
      otherwise: Joi.optional(),
    }),

  // SMTP (optional in dev — links logged when unset or send fails)
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: bool().default('false'),
  SMTP_REQUIRE_TLS: bool().optional(),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  SMTP_FROM: Joi.string().optional().allow(''),

  // Observability (необов'язково)
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  ERROR_TRACKING_DSN: Joi.string().optional().allow(''),
})
  .custom(crossFieldRules)
  .options({
    allowUnknown: true,
    abortEarly: false,
  });
