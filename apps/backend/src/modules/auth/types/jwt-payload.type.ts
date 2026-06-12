import { UserRole } from '@prisma/client';

export interface JwtAccessPayload {
  /** userId */
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  /** sessionId */
  sub: string;
  userId: string;
  iat?: number;
  exp?: number;
}
