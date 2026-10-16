import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SameSiteMode = 'lax' | 'strict' | 'none';

export interface CookieAttributes {
  httpOnly: true;
  secure: boolean;
  sameSite: SameSiteMode;
  path: string;
  domain?: string;
}

/**
 * Єдина типізована точка доступу до security-налаштувань.
 * Валідація значень виконується у `env.validation.ts` під час старту.
 */
@Injectable()
export class SecurityConfigService {
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly cookieSecure: boolean;
  readonly sameSite: SameSiteMode;
  readonly cookieDomain?: string;
  readonly allowedOrigins: string[];
  readonly csrfSecret: string;
  readonly requireEmailVerification: boolean;
  readonly refreshGraceSeconds: number;

  constructor(config: ConfigService) {
    const nodeEnv = config.get<string>('NODE_ENV', 'development');
    this.isProduction = nodeEnv === 'production';
    this.isTest = nodeEnv === 'test';

    const secureRaw = config.get<string>('COOKIE_SECURE');
    this.cookieSecure = this.isProduction ? true : secureRaw === 'true';

    this.sameSite = config.get<SameSiteMode>('COOKIE_SAMESITE', 'lax');
    // SameSite=None працює лише з Secure (інакше браузер відкине cookie).
    const domain = config.get<string>('COOKIE_DOMAIN')?.trim();
    this.cookieDomain = domain ? domain : undefined;

    const origins = new Set<string>();
    for (const raw of config.get<string>('CORS_ORIGIN', '').split(',')) {
      const origin = normalizeOrigin(raw);
      if (origin) origins.add(origin);
    }
    const siteOrigin = normalizeOrigin(config.get<string>('SITE_URL', ''));
    if (siteOrigin) origins.add(siteOrigin);
    this.allowedOrigins = [...origins];

    this.csrfSecret = config.getOrThrow<string>('CSRF_SECRET');
    this.requireEmailVerification =
      config.get<string>('REQUIRE_EMAIL_VERIFICATION', 'false') === 'true';
    this.refreshGraceSeconds = Number(config.get('REFRESH_REUSE_GRACE_SECONDS', 10));
  }

  cookieAttributes(path: string): CookieAttributes {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.sameSite,
      path,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    };
  }

  isOriginAllowed(origin: string): boolean {
    const normalized = normalizeOrigin(origin);
    return normalized !== null && this.allowedOrigins.includes(normalized);
  }
}

/** Повертає `scheme://host[:port]` або null, якщо значення не є коректним origin. */
export function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null') return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}
