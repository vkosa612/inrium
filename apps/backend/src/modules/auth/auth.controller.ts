import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CsrfService } from '../../common/security/csrf.service';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
} from '../../common/security/security.constants';
import { SecurityConfigService } from '../../common/security/security-config.service';
import { AuthService, RequestMeta } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  RequestPasswordResetDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/email.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { IssuedTokens, UserPublic } from './types/auth-response.type';

const CSRF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly security: SecurityConfigService,
    private readonly csrf: CsrfService,
  ) {}

  // ── CSRF token ──────────────────────────────────────────────────────────────

  @Public()
  @Get('csrf')
  @ApiOperation({
    summary: 'Отримати CSRF-токен',
    description:
      'Токен прив\'язаний до поточної сесії. Надсилайте його в заголовку `X-CSRF-Token` для POST/PUT/PATCH/DELETE.',
  })
  getCsrfToken(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const existing = (req.cookies as Record<string, string | undefined> | undefined)?.[CSRF_COOKIE];
    const nonce = existing && /^[A-Za-z0-9_-]{20,64}$/.test(existing) ? existing : this.csrf.generateNonce();

    reply.setCookie(CSRF_COOKIE, nonce, {
      ...this.security.cookieAttributes('/'),
      maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
    });
    return { csrfToken: this.csrf.issueToken(nonce, req) };
  }

  // ── Register ────────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Реєстрація (відповідь не розкриває, чи існує email)' })
  @ApiResponse({ status: 202, description: 'Запит прийнято' })
  register(@Body() dto: RegisterDto, @Req() req: FastifyRequest) {
    return this.authService.register(dto, this.meta(req));
  }

  // ── Login ───────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вхід. Токени встановлюються HttpOnly cookie.' })
  @ApiResponse({ status: 200, description: 'Успішний вхід' })
  @ApiResponse({ status: 401, description: 'Невірні облікові дані' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { tokens, user } = await this.authService.login(dto, this.meta(req));
    this.setAuthCookies(reply, tokens);
    return { user };
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Оновити сесію',
    description: 'Читає refresh-токен з HttpOnly cookie; ротує його та видає новий access.',
  })
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const refreshToken = this.cookie(req, REFRESH_COOKIE);
    if (!refreshToken) {
      throw new UnauthorizedException('Сесію не знайдено');
    }

    try {
      const { tokens, user } = await this.authService.refresh(refreshToken, this.meta(req));
      reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
        ...this.security.cookieAttributes('/'),
        maxAge: tokens.accessMaxAgeSeconds,
      });
      if (tokens.refreshToken && tokens.refreshMaxAgeSeconds) {
        reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
          ...this.security.cookieAttributes(REFRESH_COOKIE_PATH),
          maxAge: tokens.refreshMaxAgeSeconds,
        });
      }
      return { user };
    } catch (err) {
      if (err instanceof UnauthorizedException) this.clearAuthCookies(reply);
      throw err;
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вихід: відкликає сесію та очищає cookie' })
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.authService.logout({
      refreshToken: this.cookie(req, REFRESH_COOKIE),
      accessToken: this.cookie(req, ACCESS_COOKIE),
    });
    this.clearAuthCookies(reply);
    return { message: 'Ви вийшли з акаунта' };
  }

  // ── Me ───────────────────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Поточний користувач' })
  @ApiResponse({ status: 200, description: 'Користувач без passwordHash' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: UserPublic) {
    return this.authService.getMe(user.id);
  }

  // ── Email verification / password reset ─────────────────────────────────────

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Підтвердити email за токеном' })
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: FastifyRequest) {
    return this.authService.verifyEmail(dto.token, this.meta(req));
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повторно надіслати лист підтвердження (нейтральна відповідь)' })
  resendVerification(@Body() dto: ResendVerificationDto, @Req() req: FastifyRequest) {
    return this.authService.resendVerification(dto.email, dto.captchaToken, this.meta(req));
  }

  @Public()
  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запит на скидання пароля (нейтральна відповідь)' })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() req: FastifyRequest) {
    return this.authService.requestPasswordReset(dto.email, dto.captchaToken, this.meta(req));
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Скинути пароль за токеном' })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: FastifyRequest) {
    return this.authService.resetPassword(dto.token, dto.newPassword, this.meta(req));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private meta(req: FastifyRequest): RequestMeta {
    return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
  }

  private cookie(req: FastifyRequest, name: string): string | undefined {
    const value = (req.cookies as Record<string, string | undefined> | undefined)?.[name];
    return value || undefined;
  }

  private setAuthCookies(reply: FastifyReply, tokens: IssuedTokens): void {
    reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.security.cookieAttributes('/'),
      maxAge: tokens.accessMaxAgeSeconds,
    });
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.security.cookieAttributes(REFRESH_COOKIE_PATH),
      maxAge: tokens.refreshMaxAgeSeconds,
    });
  }

  private clearAuthCookies(reply: FastifyReply): void {
    reply.clearCookie(ACCESS_COOKIE, this.security.cookieAttributes('/'));
    reply.clearCookie(REFRESH_COOKIE, this.security.cookieAttributes(REFRESH_COOKIE_PATH));
  }
}