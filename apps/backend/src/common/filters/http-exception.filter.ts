import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TooManyRequestsException } from '../security/rate-limit.service';
import type { ApiErrorResponse } from '../types/api-response.type';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// ── Prisma error detection ─────────────────────────────────────────────────

function isPrismaError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as Record<string, unknown>).code === 'string' &&
    /^P\d{4}$/.test((err as Record<string, unknown>).code as string)
  );
}

interface PrismaErrorResult {
  statusCode: number;
  message: string;
  error: string;
}

function mapPrismaError(err: unknown): PrismaErrorResult {
  const { code } = err as { code: string };

  switch (code) {
    case 'P2002':
      return { statusCode: HttpStatus.CONFLICT, message: 'Запис уже існує', error: 'Conflict' };
    case 'P2025':
      return { statusCode: HttpStatus.NOT_FOUND, message: 'Запис не знайдено', error: 'Not Found' };
    case 'P2003':
      return { statusCode: HttpStatus.BAD_REQUEST, message: "Пов'язаний запис не знайдено", error: 'Bad Request' };
    case 'P2000':
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Значення занадто довге', error: 'Bad Request' };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: isProduction() ? 'Внутрішня помилка сервера' : 'Помилка бази даних',
        error: 'Internal Server Error',
      };
  }
}

// ── Filter ─────────────────────────────────────────────────────────────────

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = isProduction()
      ? 'Внутрішня помилка сервера'
      : 'Internal server error';
    let error = 'Internal Server Error';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        error = HttpStatus[statusCode] ?? 'Error';
      } else {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string | string[]) ?? message;
        error = (obj.error as string) ?? HttpStatus[statusCode] ?? 'Error';
        if (typeof obj.code === 'string') code = obj.code;
      }

      if (exception instanceof TooManyRequestsException) {
        reply.header('Retry-After', String(exception.retryAfterSeconds));
      }

      if (isProduction() && statusCode >= 500) {
        message = 'Внутрішня помилка сервера';
      }
    } else if (isPrismaError(exception)) {
      ({ statusCode, message, error } = mapPrismaError(exception));
    } else {
      if (isProduction()) {
        message = 'Внутрішня помилка сервера';
      }
    }

    if (statusCode >= 500) {
      // Стек/текст помилки лише у серверному лозі (з requestId), не у відповіді.
      this.logger.error(
        `[${request.id}] ${request.method} ${request.url.split('?')[0]} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      ...(code ? { code } : {}),
      path: request.url.split('?')[0],
      requestId: String(request.id),
      timestamp: new Date().toISOString(),
    };

    void reply.code(statusCode).send(body);
  }
}
