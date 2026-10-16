import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCodes } from '../../../common/security/security.constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  /**
   * Єдиний код `AUTH_REQUIRED` для відсутньої/простроченої/відкликаної сесії: клієнт за ним відрізняє
   * «треба refresh» від 401 бізнес-логіки (напр. «невірний поточний пароль») і не повторює такі запити.
   */
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    if (user) return user;
    const message =
      err instanceof UnauthorizedException && typeof err.getResponse() === 'object'
        ? ((err.getResponse() as { message?: string }).message ?? 'Потрібна автентифікація')
        : 'Потрібна автентифікація';
    throw new UnauthorizedException({ message, code: ErrorCodes.AuthRequired });
  }
}
