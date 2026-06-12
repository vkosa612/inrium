import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserPublic } from '../types/auth-response.type';

/**
 * Injects the authenticated user from the JWT into a controller parameter.
 * @example getMe(@CurrentUser() user: UserPublic)
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPublic => {
    const request = ctx.switchToHttp().getRequest<{ user: UserPublic }>();
    return request.user;
  },
);
