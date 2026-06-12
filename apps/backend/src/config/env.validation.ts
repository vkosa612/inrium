import * as Joi from 'joi';

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
  JWT_ACCESS_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_ACCESS_SECRET is required',
    'string.min': 'JWT_ACCESS_SECRET must be at least 16 characters',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_REFRESH_SECRET is required',
    'string.min': 'JWT_REFRESH_SECRET must be at least 16 characters',
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
}).options({
  allowUnknown: true,
  abortEarly: false,
});
