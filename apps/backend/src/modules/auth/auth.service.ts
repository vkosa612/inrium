import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type {
  AuthResult,
  AuthTokens,
  MeResult,
  UserPublic,
} from './types/auth-response.type';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './types/jwt-payload.type';

// ─── Prisma select that never includes passwordHash ──────────────────────────
const USER_SELECT = {
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
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Convert a string like "15m", "7d", "1h" to a future Date.
 */
function expiresInToDate(expiresIn: string): Date {
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid JWT expiresIn format: "${expiresIn}"`);
  const ms = parseInt(match[1]) * (units[match[2]] ?? 1) * 1000;
  return new Date(Date.now() + ms);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Token helpers ──────────────────────────────────────────────────────────

  private signAccess(payload: JwtAccessPayload): string {
    const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const expiresIn = (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as never;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.jwt.sign(payload as any, { secret, expiresIn });
  }

  private signRefresh(payload: JwtRefreshPayload): string {
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const expiresIn = (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as never;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.jwt.sign(payload as any, { secret, expiresIn });
  }

  private verifyRefresh(token: string): JwtRefreshPayload {
    try {
      return this.jwt.verify<JwtRefreshPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Session management ─────────────────────────────────────────────────────

  private async createSession(
    userId: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{ refreshToken: string }> {
    const sessionId = randomUUID();
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const refreshPayload: JwtRefreshPayload = { sub: sessionId, userId };
    const refreshToken = this.signRefresh(refreshPayload);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: hashToken(refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: expiresInToDate(expiresIn),
      },
    });

    return { refreshToken };
  }

  private buildTokens(user: UserPublic, refreshToken: string): AuthResult {
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.signAccess(accessPayload),
      refreshToken,
      user,
    };
  }

  // ── Auth operations ────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        emailVerificationToken: randomUUID(),
        emailVerificationExpiresAt: new Date(Date.now() + 86400000),
      },
      select: USER_SELECT,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Email verification token for ${user.email}: check user record`);
    }

    const { refreshToken } = await this.createSession(user.id, meta);
    return this.buildTokens(user, refreshToken);
  }

  async login(
    dto: LoginDto,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...USER_SELECT, passwordHash: true },
    });

    // Generic message — do not reveal whether email exists
    const INVALID = new UnauthorizedException('Invalid email or password');

    if (!user) throw INVALID;
    if (user.status !== UserStatus.ACTIVE) throw INVALID;

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw INVALID;

    // Strip passwordHash before returning
    const { passwordHash: _pw, ...userPublic } = user;

    const { refreshToken } = await this.createSession(user.id, meta);
    return this.buildTokens(userPublic, refreshToken);
  }

  async refresh(rawToken: string): Promise<AuthTokens> {
    const payload = this.verifyRefresh(rawToken);

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sub },
      include: { user: { select: USER_SELECT } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // Verify stored hash matches incoming token
    if (session.refreshTokenHash !== hashToken(rawToken)) {
      // Possible token reuse attack — revoke the session immediately
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token already used');
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Rotation: revoke old session, issue new one
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const { refreshToken: newRefreshToken } = await this.createSession(
      session.userId,
      {
        userAgent: session.userAgent ?? undefined,
        ipAddress: session.ipAddress ?? undefined,
      },
    );

    const accessPayload: JwtAccessPayload = {
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };

    return {
      accessToken: this.signAccess(accessPayload),
      refreshToken: newRefreshToken,
    };
  }

  async logout(rawToken: string): Promise<void> {
    let payload: JwtRefreshPayload;
    try {
      payload = this.verifyRefresh(rawToken);
    } catch {
      // Token already invalid → treat as successful logout
      return;
    }

    await this.prisma.session.updateMany({
      where: { id: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string): Promise<MeResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: { gt: new Date() },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid or expired verification token');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
    return { message: 'Email verified successfully' };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If the email exists, a reset link was sent' };
    }

    const token = randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiresAt: new Date(Date.now() + 3600000),
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Password reset token for ${email}: ${token}`);
    }

    return { message: 'If the email exists, a reset link was sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successful. Please sign in.' };
  }
}
