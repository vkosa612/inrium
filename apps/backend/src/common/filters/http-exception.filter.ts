import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ApiErrorResponse } from '../types/api-response.type';

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
      return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists', error: 'Conflict' };
    case 'P2025':
      return { statusCode: HttpStatus.NOT_FOUND, message: 'Resource not found', error: 'Not Found' };
    case 'P2003':
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Related resource not found', error: 'Bad Request' };
    case 'P2000':
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Input value too long', error: 'Bad Request' };
    default:
      return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error', error: 'Internal Server Error' };
  }
}

// ── Filter ─────────────────────────────────────────────────────────────────

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<{ code: (n: number) => { send: (b: unknown) => void } }>();
    const request = ctx.getRequest<{ url: string }>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

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
      }
    } else if (isPrismaError(exception)) {
      ({ statusCode, message, error } = mapPrismaError(exception));
    } else {
      console.error('[INRIUM] Unhandled exception:', exception);
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    reply.code(statusCode).send(body);
  }
}
