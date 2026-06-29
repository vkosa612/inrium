import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserPublic } from '../types/auth-response.type';

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Адміністратор',
  [UserRole.EDITOR]: 'Редактор',
  [UserRole.GAME_MASTER]: 'Майстер',
  [UserRole.PLAYER]: 'Гравець',
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: UserPublic }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Потрібна авторизація');
    }

    if (!requiredRoles.includes(user.role)) {
      const labels = requiredRoles.map((r) => ROLE_LABEL[r] ?? r).join(' або ');
      throw new ForbiddenException(`Недостатньо прав. Потрібна роль: ${labels}`);
    }

    return true;
  }
}
