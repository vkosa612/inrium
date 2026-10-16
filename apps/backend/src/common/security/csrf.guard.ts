import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CsrfService } from './csrf.service';
import { CSRF_HEADER, ErrorCodes } from './security.constants';
import { SecurityConfigService, normalizeOrigin } from './security-config.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Глобальний захист усіх state-changing запитів (включно з публічними: login, register, logout…).
 * 1) Origin/Referer має входити в allowlist; відсутність обох заголовків = відмова.
 * 2) `X-CSRF-Token` має збігатися з підписаним токеном, прив'язаним до сесії.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly security: SecurityConfigService,
    private readonly csrf: CsrfService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    this.assertOrigin(request);

    const header = request.headers[CSRF_HEADER];
    const token = Array.isArray(header) ? header[0] : header;
    if (!this.csrf.isValid(request, token)) {
      throw new ForbiddenException({
        message: 'Недійсний або відсутній CSRF-токен. Оновіть сторінку та повторіть дію.',
        code: ErrorCodes.CsrfInvalid,
      });
    }
    return true;
  }

  private assertOrigin(request: FastifyRequest): void {
    const origin = firstHeader(request.headers.origin);
    const referer = firstHeader(request.headers.referer);

    // Origin має пріоритет; "null" (sandbox/редіректи) не допускається.
    if (origin !== undefined) {
      if (!this.security.isOriginAllowed(origin)) this.rejectOrigin();
      return;
    }

    if (referer !== undefined) {
      const refererOrigin = normalizeOrigin(referer);
      if (!refererOrigin || !this.security.isOriginAllowed(refererOrigin)) this.rejectOrigin();
      return;
    }

    // Ні Origin, ні Referer — браузер так не робить для POST/PUT/PATCH/DELETE.
    this.rejectOrigin();
  }

  private rejectOrigin(): never {
    throw new ForbiddenException({
      message: 'Запит із недозволеного джерела',
      code: ErrorCodes.OriginNotAllowed,
    });
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
