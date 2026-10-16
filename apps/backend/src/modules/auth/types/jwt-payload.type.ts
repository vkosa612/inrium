import { UserRole } from '@prisma/client';

export interface JwtAccessPayload {
  /** userId */
  sub: string;
  email: string;
  role: UserRole;
  /** sessionId (refresh-токен, з яким видано access) */
  sid: string;
  /** familyId — стабільний ідентифікатор входу між ротаціями refresh */
  fid: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  /** sessionId */
  sub: string;
  userId: string;
  /** familyId */
  fid: string;
  iat?: number;
  exp?: number;
}
