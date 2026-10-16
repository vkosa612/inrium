import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCodes } from './security.constants';

export type CaptchaProvider = 'none' | 'turnstile' | 'hcaptcha' | 'test';

/** Токен, який приймає детермінований test-адаптер. Адаптер заборонений у production. */
export const TEST_CAPTCHA_PASS_TOKEN = 'test-captcha-pass';

const VERIFY_ENDPOINTS: Record<'turnstile' | 'hcaptcha', string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  hcaptcha: 'https://hcaptcha.com/siteverify',
};
const VERIFY_TIMEOUT_MS = 5_000;

/**
 * Серверна перевірка CAPTCHA.
 *
 * - `CAPTCHA_REQUIRED=false` → перевірка пропускається (токен, якщо надісланий, не перевіряється).
 * - `CAPTCHA_REQUIRED=true`  → токен обов'язковий і перевіряється провайдером.
 * - Якщо провайдер недоступний — fail CLOSED: 503 `CAPTCHA_UNAVAILABLE` (захист важливіший за доступність).
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly provider: CaptchaProvider;
  private readonly required: boolean;
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.provider = config.get<CaptchaProvider>('CAPTCHA_PROVIDER', 'none');
    this.required = config.get<string>('CAPTCHA_REQUIRED', 'false') === 'true';
    this.secret = config.get<string>('CAPTCHA_SECRET_KEY', '');
  }

  isRequired(): boolean {
    return this.required;
  }

  async assertHuman(token: string | undefined, remoteIp?: string): Promise<void> {
    if (!this.required) return;

    if (!token) {
      throw new BadRequestException({
        message: 'Підтвердіть, що ви не робот (CAPTCHA).',
        code: ErrorCodes.CaptchaRequired,
      });
    }

    const ok = await this.verify(token, remoteIp);
    if (!ok) {
      throw new BadRequestException({
        message: 'Перевірку CAPTCHA не пройдено. Спробуйте ще раз.',
        code: ErrorCodes.CaptchaFailed,
      });
    }
  }

  private async verify(token: string, remoteIp?: string): Promise<boolean> {
    switch (this.provider) {
      case 'test':
        return token === TEST_CAPTCHA_PASS_TOKEN;
      case 'turnstile':
      case 'hcaptcha':
        return this.verifyRemote(this.provider, token, remoteIp);
      default:
        // CAPTCHA_REQUIRED=true без провайдера блокується валідацією env під час старту.
        return false;
    }
  }

  private async verifyRemote(
    provider: 'turnstile' | 'hcaptcha',
    token: string,
    remoteIp?: string,
  ): Promise<boolean> {
    const body = new URLSearchParams({ secret: this.secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    try {
      const response = await fetch(VERIFY_ENDPOINTS[provider], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch (err) {
      this.logger.error(
        `CAPTCHA (${provider}) недоступна: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      throw new ServiceUnavailableException({
        message: 'Сервіс перевірки CAPTCHA тимчасово недоступний. Спробуйте пізніше.',
        code: ErrorCodes.CaptchaUnavailable,
      });
    }
  }
}
