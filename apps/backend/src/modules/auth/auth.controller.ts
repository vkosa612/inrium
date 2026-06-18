import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import type { UserPublic } from './types/auth-response.type';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/api/auth',
};

// Stricter rate limit for auth endpoints: max 10 requests per minute per IP
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Register ────────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already taken' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.register(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(reply, result.refreshToken);
    return result;
  }

  // ── Login ───────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(reply, result.refreshToken);
    return result;
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Pass refresh token in body OR via `refresh_token` httpOnly cookie.',
  })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = this.extractRefreshToken(req, dto.refreshToken);
    const tokens = await this.authService.refresh(token);
    this.setRefreshCookie(reply, tokens.refreshToken);
    return tokens;
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh session' })
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = this.extractRefreshToken(req, dto.refreshToken, false);
    if (token) {
      await this.authService.logout(token);
    }
    this.clearRefreshCookie(reply);
    return { message: 'Logged out' };
  }

  // ── Me ───────────────────────────────────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns user without passwordHash' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: UserPublic) {
    return this.authService.getMe(user.id);
  }

  // ── Cookie helpers ───────────────────────────────────────────────────────────

  private setRefreshCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(REFRESH_COOKIE, token, {
      ...COOKIE_BASE,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });
  }

  private clearRefreshCookie(reply: FastifyReply): void {
    reply.clearCookie(REFRESH_COOKIE, { ...COOKIE_BASE });
  }

  private extractRefreshToken(
    req: FastifyRequest,
    bodyToken?: string,
    required = true,
  ): string {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const token = cookieToken ?? bodyToken;
    if (required && !token) {
      throw new BadRequestException('Refresh token is required');
    }
    return token ?? '';
  }
}
