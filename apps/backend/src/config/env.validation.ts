import * as Joi from 'joi';

const DEV_JWT_PLACEHOLDERS = [
  'change_me_access_secret_min_32_chars',
  'change_me_refresh_secret_min_32_chars',
];

function rejectDevJwtInProduction(value: string, helpers: Joi.CustomHelpers) {
  const nodeEnv = helpers.state.ancestors[0]?.NODE_ENV as string | undefined;
  if (nodeEnv === 'production') {
    if (value.length < 32) {
      return helpers.error('string.min', { limit: 32 });
    }
    if (DEV_JWT_PLACEHOLDERS.includes(value)) {
      return helpers.error('any.invalid');
    }
  }
  return value;
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

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

  // JWT
  JWT_ACCESS_SECRET: Joi.string()
    .min(16)
    .required()
    .custom(rejectDevJwtInProduction)
    .messages({
      'any.required': 'JWT_ACCESS_SECRET is required',
      'string.min': 'JWT_ACCESS_SECRET must be at least 16 characters (32 in production)',
      'any.invalid': 'JWT_ACCESS_SECRET must not use placeholder values in production',
    }),
  JWT_REFRESH_SECRET: Joi.string()
    .min(16)
    .required()
    .custom(rejectDevJwtInProduction)
    .messages({
      'any.required': 'JWT_REFRESH_SECRET is required',
      'string.min': 'JWT_REFRESH_SECRET must be at least 16 characters (32 in production)',
      'any.invalid': 'JWT_REFRESH_SECRET must not use placeholder values in production',
    }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Feature flags
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),
  REQUIRE_EMAIL_VERIFICATION: Joi.string().valid('true', 'false').default('false'),

  // Local file uploads (cover images)
  UPLOADS_DIR: Joi.string().default('uploads'),

  // Public site URL for email links
  SITE_URL: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'SITE_URL is required in production (e.g. https://inrium.ua)',
      }),
      otherwise: Joi.optional(),
    }),

  // SMTP (optional in dev — links logged when unset or send fails)
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  SMTP_FROM: Joi.string().optional().allow(''),
}).options({
  allowUnknown: true,
  abortEarly: false,
});
