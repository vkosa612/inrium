import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { Strategy } from 'passport-jwt';
import { ACCESS_COOKIE } from '../../../common/security/security.constants';
import { SecurityConfigService } from '../../../common/security/security-config.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { UserPublic } from '../types/auth-response.type';
import type { JwtAccessPayload } from '../types/jwt-payload.type';

/** Access-токен читається ЛИШЕ з HttpOnly cookie (Authorization header не приймається). */
function extractAccessCookie(request: {
  cookies?: Record<string, string | undefined>;
}): string | null {
  return request.cookies?.[ACCESS_COOKIE] || null;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly security: SecurityConfigService,
  ) {
    super({
      jwtFromRequest: extractAccessCookie,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Кожен запит перевіряє, що сесія жива (не відкликана/не прострочена), а користувач активний.
   * Тому logout, зміна пароля, блокування й видалення скасовують доступ негайно, а не після exp.
   */
  async validate(payload: JwtAccessPayload): Promise<UserPublic> {
    if (!payload.sid) throw new UnauthorizedException('Сесію не знайдено');

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      select: {
        userId: true,
        revokedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            status: true,
            avatarUrl: true,
            bio: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Сесію завершено або обліковий запис неактивний');
    }

    if (this.security.requireEmailVerification && !session.user.emailVerified) {
      throw new UnauthorizedException('Підтвердіть електронну пошту');
    }

    return session.user;
  }
}
