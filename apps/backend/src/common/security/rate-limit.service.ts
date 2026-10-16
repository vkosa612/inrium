import { HttpException, HttpStatus, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ErrorCodes } from './security.constants';

interface Bucket {
  count: number;
  resetAt: number;
}

export class TooManyRequestsException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      {
        message: 'Забагато спроб. Спробуйте пізніше.',
        code: ErrorCodes.TooManyRequests,
        error: 'Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

const MAX_BUCKETS = 100_000;

/**
 * Лічильник спроб у пам'яті процесу (фіксоване вікно).
 *
 * ОБМЕЖЕННЯ: стан не поділяється між репліками й скидається при рестарті.
 * Для кількох інстансів потрібен спільний store (наприклад Redis) — інтерфейс
 * `hit/peek/reset` навмисно мінімальний, щоб його можна було замінити.
 */
@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly buckets = new Map<string, Bucket>();
  private readonly sweeper: NodeJS.Timeout;

  constructor() {
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweeper);
  }

  /** Збільшує лічильник; `allowed=false`, коли ліміт перевищено. */
  hit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (!bucket && this.buckets.size >= MAX_BUCKETS) this.sweep();
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  /** Кидає 429, якщо ліміт перевищено. */
  consume(key: string, limit: number, windowMs: number): void {
    const result = this.hit(key, limit, windowMs);
    if (!result.allowed) throw new TooManyRequestsException(result.retryAfterSeconds);
  }

  /** Поточний стан без збільшення лічильника. */
  isBlocked(key: string, limit: number): { blocked: boolean; retryAfterSeconds: number } {
    const bucket = this.buckets.get(key);
    const now = Date.now();
    if (!bucket || bucket.resetAt <= now) return { blocked: false, retryAfterSeconds: 0 };
    return {
      blocked: bucket.count >= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Для тестів та обслуговування. */
  resetAll(): void {
    this.buckets.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
