import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { FastifyRequest } from 'fastify';
import type { JwtAccessPayload, JwtRefreshPayload } from '../../modules/auth/types/jwt-payload.type';
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from './security.constants';
import { SecurityConfigService } from './security-config.service';

const ANONYMOUS_BINDING = 'anon';

/**
 * CSRF: підписаний double-submit, прив'язаний до сесії.
 *
 * - `nonce` — випадкове значення в HttpOnly cookie (прив'язка до браузера).
 * - токен = `nonce.HMAC(secret, nonce | binding)`, де binding = familyId поточного входу
 *   (з access- або refresh-cookie) або `anon` до входу.
 * - Клієнт отримує токен з `GET /api/auth/csrf` і надсилає його в `X-CSRF-Token`.
 *
 * Зловмисник не може ні прочитати токен жертви (CORS allowlist), ні підробити його (HMAC),
 * ні підставити свій токен (cookie-nonce жертви інший; binding не збігається).
 */
@Injectable()
export class CsrfService {
  constructor(
    private readonly security: SecurityConfigService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  generateNonce(): string {
    return randomBytes(24).toString('base64url');
  }

  /** Токен для даного nonce та поточної сесії запиту. */
  issueToken(nonce: string, req: FastifyRequest): string {
    return `${nonce}.${this.sign(nonce, this.bindingFor(req))}`;
  }

  /** Перевіряє токен із заголовка проти cookie-nonce та поточної сесії. */
  isValid(req: FastifyRequest, headerToken: string | undefined): boolean {
    const cookieNonce = (req.cookies as Record<string, string | undefined> | undefined)?.[
      CSRF_COOKIE
    ];
    if (!cookieNonce || !headerToken) return false;

    const separator = headerToken.indexOf('.');
    if (separator <= 0) return false;
    const tokenNonce = headerToken.slice(0, separator);
    const signature = headerToken.slice(separator + 1);

    if (!safeEqual(tokenNonce, cookieNonce)) return false;
    return safeEqual(signature, this.sign(cookieNonce, this.bindingFor(req)));
  }

  /** familyId входу з cookie (access може бути прострочений — підпис все одно має бути чинним). */
  bindingFor(req: FastifyRequest): string {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;

    const access = cookies[ACCESS_COOKIE];
    if (access) {
      const payload = this.tryVerify<JwtAccessPayload>(
        access,
        this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      );
      if (payload?.fid) return payload.fid;
    }

    const refresh = cookies[REFRESH_COOKIE];
    if (refresh) {
      const payload = this.tryVerify<JwtRefreshPayload>(
        refresh,
        this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      );
      if (payload?.fid) return payload.fid;
    }

    return ANONYMOUS_BINDING;
  }

  private tryVerify<T extends object>(token: string, secret: string): T | null {
    try {
      return this.jwt.verify<T>(token, { secret, ignoreExpiration: true });
    } catch {
      return null;
    }
  }

  private sign(nonce: string, binding: string): string {
    return createHmac('sha256', this.security.csrfSecret)
      .update(`${nonce}|${binding}`)
      .digest('base64url');
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
