import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { CaptchaService } from '../../common/security/captcha.service';
import {
  RateLimitService,
  TooManyRequestsException,
} from '../../common/security/rate-limit.service';
import { SecurityConfigService } from '../../common/security/security-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type {
  IssuedTokens,
  LoginResult,
  MeResult,
  RefreshResult,
  UserPublic,
} from './types/auth-response.type';
import type { JwtAccessPayload, JwtRefreshPayload } from './types/jwt-payload.type';

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

// ─── Rate-limit policy (in-memory; див. docs/SECURITY_IMPLEMENTATION.md) ──────
const MINUTE = 60_000;
export const RATE_LIMITS = {
  loginPerIp: { limit: 30, windowMs: 15 * MINUTE },
  loginFailuresPerAccount: { limit: 10, windowMs: 15 * MINUTE },
  loginFailuresPerIp: { limit: 20, windowMs: 15 * MINUTE },
  registerPerIp: { limit: 10, windowMs: 60 * MINUTE },
  refreshPerIp: { limit: 120, windowMs: MINUTE },
  forgotPerIp: { limit: 10, windowMs: 15 * MINUTE },
  forgotPerAccount: { limit: 3, windowMs: 60 * MINUTE },
  resendPerIp: { limit: 10, windowMs: 15 * MINUTE },
  resendPerAccount: { limit: 3, windowMs: 60 * MINUTE },
  tokenActionPerIp: { limit: 20, windowMs: 15 * MINUTE },
} as const;

const VERIFICATION_TTL_MS = 24 * 60 * MINUTE;
const RESET_TTL_MS = 60 * MINUTE;
const SESSION_RETENTION_AFTER_EXPIRY_MS = 7 * 24 * 60 * MINUTE;

// Хеш для вирівнювання часу відповіді, коли користувача не існує (захист від timing-enumeration).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('inrium-dummy-password', 10);

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Випадковий одноразовий токен для листів (у БД зберігається лише sha256). */
function generateEmailToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: sha256(raw) };
}

function accountKey(email: string): string {
  return sha256(email.trim().toLowerCase()).slice(0, 32);
}

/** "15m" | "7d" | "1h" | "30s" → секунди. */
export function durationToSeconds(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: "${value}"`);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return parseInt(match[1], 10) * unit;
}

const NEUTRAL_RESET_MESSAGE =
  'Якщо такий email існує, ми надіслали посилання для скидання пароля.';
const NEUTRAL_RESEND_MESSAGE =
  'Якщо акаунт існує і ще не підтверджений, ми надіслали новий лист.';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly security: SecurityConfigService,
    private readonly rateLimit: RateLimitService,
    private readonly captcha: CaptchaService,
  ) {}

  // ── Token helpers ──────────────────────────────────────────────────────────

  private get accessTtl(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
  }

  private get refreshTtl(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  private signAccess(payload: JwtAccessPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: durationToSeconds(this.accessTtl),
    });
  }

  private signRefresh(payload: JwtRefreshPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: durationToSeconds(this.refreshTtl),
    });
  }

  private verifyRefresh(token: string): JwtRefreshPayload {
    try {
      return this.jwt.verify<JwtRefreshPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Недійсний або прострочений токен оновлення');
    }
  }

  private buildAccess(user: UserPublic, sessionId: string, familyId: string) {
    return this.signAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
      fid: familyId,
    });
  }

  // ── Session management ─────────────────────────────────────────────────────

  private async createSession(
    userId: string,
    meta: RequestMeta,
    options: { familyId?: string; sessionId?: string } = {},
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ sessionId: string; familyId: string; refreshToken: string }> {
    const sessionId = options.sessionId ?? randomUUID();
    const familyId = options.familyId ?? randomUUID();
    const refreshToken = this.signRefresh({ sub: sessionId, userId, fid: familyId });

    await client.session.create({
      data: {
        id: sessionId,
        familyId,
        userId,
        refreshTokenHash: sha256(refreshToken),
        userAgent: meta.userAgent?.slice(0, 512),
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + durationToSeconds(this.refreshTtl) * 1000),
      },
    });

    return { sessionId, familyId, refreshToken };
  }

  private issueTokens(
    user: UserPublic,
    session: { sessionId: string; familyId: string; refreshToken: string },
  ): IssuedTokens {
    return {
      accessToken: this.buildAccess(user, session.sessionId, session.familyId),
      refreshToken: session.refreshToken,
      accessMaxAgeSeconds: durationToSeconds(this.accessTtl),
      refreshMaxAgeSeconds: durationToSeconds(this.refreshTtl),
    };
  }

  private revokeFamily(familyId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Відкликає всі сесії користувача (зміна пароля, блокування, видалення тощо). */
  revokeAllSessions(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private purgeExpiredSessions(): void {
    this.prisma.session
      .deleteMany({
        where: { expiresAt: { lt: new Date(Date.now() - SESSION_RETENTION_AFTER_EXPIRY_MS) } },
      })
      .catch((err: unknown) =>
        this.logger.warn(`Не вдалося очистити прострочені сесії: ${String(err)}`),
      );
  }

  // ── Register ───────────────────────────────────────────────────────────────

  /**
   * Відповідь однакова для нової та вже існуючої пошти (без enumeration).
   * Сесію після реєстрації не створюємо — користувач входить окремо.
   */
  async register(dto: RegisterDto, meta: RequestMeta): Promise<{ message: string }> {
    this.rateLimit.consume(
      `register:ip:${meta.ipAddress ?? 'unknown'}`,
      RATE_LIMITS.registerPerIp.limit,
      RATE_LIMITS.registerPerIp.windowMs,
    );
    await this.captcha.assertHuman(dto.captchaToken, meta.ipAddress);

    const email = dto.email.trim().toLowerCase();
    // Хешуємо завжди — вирівнює час відповіді для нових та існуючих адрес.
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const token = generateEmailToken();
    let created = false;
    try {
      await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName.trim(),
          emailVerificationToken: token.hash,
          emailVerificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        },
        select: { id: true },
      });
      created = true;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
        throw err;
      }
    }

    if (created) {
      this.fireAndForget(this.email.sendVerificationEmail(email, token.raw));
    } else {
      this.fireAndForget(this.email.sendAccountExistsEmail(email));
    }

    return {
      message: this.security.requireEmailVerification
        ? 'Перевірте пошту: ми надіслали лист для підтвердження акаунта. Якщо ця адреса вже зареєстрована, лист містить відповідне повідомлення.'
        : 'Запит на реєстрацію прийнято. Тепер ви можете увійти. Якщо ця адреса вже була зареєстрована, скористайтеся входом або відновленням пароля.',
    };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, meta: RequestMeta): Promise<LoginResult> {
    const ip = meta.ipAddress ?? 'unknown';
    const email = dto.email.trim().toLowerCase();
    const acctKey = `login:fail:acct:${accountKey(email)}`;
    const ipFailKey = `login:fail:ip:${ip}`;

    this.rateLimit.consume(
      `login:ip:${ip}`,
      RATE_LIMITS.loginPerIp.limit,
      RATE_LIMITS.loginPerIp.windowMs,
    );
    this.assertNotLockedOut(acctKey, ipFailKey);
    await this.captcha.assertHuman(dto.captchaToken, meta.ipAddress);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { ...USER_SELECT, passwordHash: true },
    });

    // Завжди порівнюємо хеш (dummy, якщо користувача немає) — однаковий час відповіді.
    const passwordValid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordValid || user.status !== UserStatus.ACTIVE) {
      this.recordLoginFailure(acctKey, ipFailKey);
      throw new UnauthorizedException('Невірна електронна пошта або пароль');
    }

    if (this.security.requireEmailVerification && !user.emailVerified) {
      throw new UnauthorizedException({
        message:
          'Підтвердіть електронну пошту перед входом. Перевірте лист або запросіть нове посилання.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    this.rateLimit.reset(acctKey);

    const { passwordHash: _passwordHash, ...userPublic } = user;
    const session = await this.createSession(user.id, meta);
    this.purgeExpiredSessions();

    return { tokens: this.issueTokens(userPublic, session), user: userPublic };
  }

  private assertNotLockedOut(acctKey: string, ipFailKey: string): void {
    const acct = this.rateLimit.isBlocked(acctKey, RATE_LIMITS.loginFailuresPerAccount.limit);
    const ip = this.rateLimit.isBlocked(ipFailKey, RATE_LIMITS.loginFailuresPerIp.limit);
    const blocked = acct.blocked ? acct : ip.blocked ? ip : null;
    if (blocked) throw new TooManyRequestsException(blocked.retryAfterSeconds);
  }

  private recordLoginFailure(acctKey: string, ipFailKey: string): void {
    this.rateLimit.hit(
      acctKey,
      RATE_LIMITS.loginFailuresPerAccount.limit,
      RATE_LIMITS.loginFailuresPerAccount.windowMs,
    );
    this.rateLimit.hit(
      ipFailKey,
      RATE_LIMITS.loginFailuresPerIp.limit,
      RATE_LIMITS.loginFailuresPerIp.windowMs,
    );
  }

  // ── Refresh (rotation + reuse detection) ───────────────────────────────────

  async refresh(rawToken: string, meta: RequestMeta): Promise<RefreshResult> {
    this.rateLimit.consume(
      `refresh:ip:${meta.ipAddress ?? 'unknown'}`,
      RATE_LIMITS.refreshPerIp.limit,
      RATE_LIMITS.refreshPerIp.windowMs,
    );

    const payload = this.verifyRefresh(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sub },
      include: { user: { select: USER_SELECT } },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Сесію завершено або відкликано');
    }

    if (session.refreshTokenHash !== sha256(rawToken) || session.familyId !== payload.fid) {
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException('Недійсний токен оновлення');
    }

    const { user } = session;
    if (user.status !== UserStatus.ACTIVE) {
      await this.revokeAllSessions(user.id);
      throw new UnauthorizedException('Обліковий запис неактивний');
    }
    if (this.security.requireEmailVerification && !user.emailVerified) {
      throw new UnauthorizedException('Підтвердіть електронну пошту');
    }

    if (session.rotatedAt) {
      return this.handleRotatedToken(session, user);
    }

    // Атомарне «захоплення» токена: лише один із паралельних запитів стане переможцем.
    const newSessionId = randomUUID();
    const rotated = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.session.updateMany({
        where: { id: session.id, rotatedAt: null, revokedAt: null },
        data: { rotatedAt: new Date(), replacedById: newSessionId },
      });
      if (claim.count !== 1) return null;
      return this.createSession(
        session.userId,
        { userAgent: session.userAgent ?? undefined, ipAddress: meta.ipAddress ?? session.ipAddress ?? undefined },
        { familyId: session.familyId, sessionId: newSessionId },
        tx,
      );
    });

    if (!rotated) {
      // Інший паралельний запит встиг раніше — перечитуємо стан.
      const fresh = await this.prisma.session.findUnique({ where: { id: session.id } });
      if (!fresh || fresh.revokedAt) {
        throw new UnauthorizedException('Сесію завершено або відкликано');
      }
      return this.handleRotatedToken(fresh, user);
    }

    return {
      tokens: this.issueTokens(user, rotated),
      user,
    };
  }

  /**
   * Токен уже ротовано. У grace-вікні це легітимний паралельний refresh (кілька вкладок/запитів):
   * видаємо лише новий access для сесії-наступника, без нового refresh. Поза вікном — reuse-атака:
   * відкликаємо всю «сім'ю» токенів.
   */
  private async handleRotatedToken(
    session: { id: string; familyId: string; rotatedAt: Date | null; replacedById: string | null },
    user: UserPublic,
  ): Promise<RefreshResult> {
    const graceMs = this.security.refreshGraceSeconds * 1000;
    const withinGrace =
      !!session.rotatedAt && Date.now() - session.rotatedAt.getTime() <= graceMs;

    if (withinGrace && session.replacedById) {
      const successor = await this.prisma.session.findUnique({
        where: { id: session.replacedById },
      });
      if (successor && !successor.revokedAt && successor.expiresAt > new Date()) {
        return {
          tokens: {
            accessToken: this.buildAccess(user, successor.id, successor.familyId),
            refreshToken: null,
            accessMaxAgeSeconds: durationToSeconds(this.accessTtl),
            refreshMaxAgeSeconds: null,
          },
          user,
        };
      }
    }

    await this.revokeFamily(session.familyId);
    this.logger.warn(`Виявлено повторне використання refresh-токена (family ${session.familyId}).`);
    throw new UnauthorizedException('Токен оновлення вже використано');
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  /** Відкликає всю «сім'ю» токенів поточного входу. Ідемпотентно; недійсні токени ігноруються. */
  async logout(tokens: { refreshToken?: string; accessToken?: string }): Promise<void> {
    const familyId = this.extractFamilyId(tokens);
    if (!familyId) return;
    await this.revokeFamily(familyId);
  }

  private extractFamilyId(tokens: { refreshToken?: string; accessToken?: string }): string | null {
    if (tokens.refreshToken) {
      try {
        return this.jwt.verify<JwtRefreshPayload>(tokens.refreshToken, {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          ignoreExpiration: true,
        }).fid;
      } catch {
        // спробуємо access
      }
    }
    if (tokens.accessToken) {
      try {
        return this.jwt.verify<JwtAccessPayload>(tokens.accessToken, {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          ignoreExpiration: true,
        }).fid;
      } catch {
        return null;
      }
    }
    return null;
  }

  // ── Me ─────────────────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<MeResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new UnauthorizedException('Користувача не знайдено');
    return user;
  }

  // ── Email verification ─────────────────────────────────────────────────────

  async verifyEmail(token: string, meta: RequestMeta): Promise<{ message: string }> {
    this.rateLimit.consume(
      `token:ip:${meta.ipAddress ?? 'unknown'}`,
      RATE_LIMITS.tokenActionPerIp.limit,
      RATE_LIMITS.tokenActionPerIp.windowMs,
    );

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: sha256(token),
        emailVerificationExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!user) {
      throw new UnauthorizedException('Посилання для підтвердження пошти прострочене або недійсне');
    }

    // Одноразовість: токен очищається умовно (лише якщо ще не використаний).
    const result = await this.prisma.user.updateMany({
      where: { id: user.id, emailVerificationToken: sha256(token) },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
    if (result.count !== 1) {
      throw new UnauthorizedException('Посилання для підтвердження пошти прострочене або недійсне');
    }
    return { message: 'Пошту успішно підтверджено.' };
  }

  async resendVerification(
    emailRaw: string,
    captchaToken: string | undefined,
    meta: RequestMeta,
  ): Promise<{ message: string }> {
    this.rateLimit.consume(
      `resend:ip:${meta.ipAddress ?? 'unknown'}`,
      RATE_LIMITS.resendPerIp.limit,
      RATE_LIMITS.resendPerIp.windowMs,
    );
    await this.captcha.assertHuman(captchaToken, meta.ipAddress);

    const email = emailRaw.trim().toLowerCase();
    const accountAllowed = this.rateLimit.hit(
      `resend:acct:${accountKey(email)}`,
      RATE_LIMITS.resendPerAccount.limit,
      RATE_LIMITS.resendPerAccount.windowMs,
    ).allowed;

    if (accountAllowed) {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, emailVerified: true, status: true },
      });
      if (user && !user.emailVerified && user.status === UserStatus.ACTIVE) {
        const token = generateEmailToken();
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerificationToken: token.hash,
            emailVerificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
          },
        });
        this.fireAndForget(this.email.sendVerificationEmail(email, token.raw));
      }
    }

    // Однакова відповідь незалежно від існування акаунта чи перевищення ліміту акаунта.
    return { message: NEUTRAL_RESEND_MESSAGE };
  }

  // ── Password reset ─────────────────────────────────────────────────────────

  async requestPasswordReset(
    emailRaw: string,
    captchaToken: string | undefined,
    meta: RequestMeta,
  ): Promise<{ message: string }> {
    this.rateLimit.consume(
      `forgot:ip:${meta.ipAddress ?? 'unknown'}`,
      RATE_LIMITS.forgotPerIp.limit,
      RATE_LIMITS.forgotPerIp.windowMs,
    );
    await this.captcha.assertHuman(captchaToken, meta.ipAddress);

    const email = emailRaw.trim().toLowerCase();
    const accountAllowed = this.rateLimit.hit(
      `forgot:acct:${accountKey(email)}`,
      RATE_LIMITS.forgotPerAccount.limit,
      RATE_LIMITS.forgotPerAccount.windowMs,
    ).allowed;

    if (accountAllowed) {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, status: true },
      });
      if (user && user.status === UserStatus.ACTIVE) {
        const token = generateEmailToken();
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: token.hash,
            passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
          },
        });
        this.fireAndForget(this.email.sendPasswordResetEmail(email, token.raw));
      }
    }

    return { message: NEUTRAL_RESET_MESSAGE };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    meta: RequestMeta,
  ): Promise<{ message: string }> {
    this.rateLimit.consume(
      `token:ip:${meta.ipAddress ?? 'unknown'}`,
      RATE_LIMITS.tokenActionPerIp.limit,
      RATE_LIMITS.tokenActionPerIp.windowMs,
    );

    const tokenHash = sha256(token);
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!user) {
      throw new UnauthorizedException('Посилання для скидання пароля прострочене або недійсне');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const consumed = await this.prisma.$transaction(async (tx) => {
      // Одноразовість: умовне оновлення за хешем токена.
      const updated = await tx.user.updateMany({
        where: { id: user.id, passwordResetToken: tokenHash },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
      });
      if (updated.count !== 1) return false;
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    });

    if (!consumed) {
      throw new UnauthorizedException('Посилання для скидання пароля прострочене або недійсне');
    }
    return { message: 'Пароль змінено. Увійдіть знову.' };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Листи не повинні впливати на час відповіді (anti-enumeration) та не валити запит. */
  private fireAndForget(task: Promise<unknown>): void {
    task.catch((err: unknown) => this.logger.error(`Помилка фонового завдання: ${String(err)}`));
  }
}
