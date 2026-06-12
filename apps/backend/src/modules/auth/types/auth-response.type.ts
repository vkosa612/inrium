import { UserRole, UserStatus } from '@prisma/client';

export interface UserPublic {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: UserPublic;
}

/** Fields returned on GET /auth/me */
export type MeResult = UserPublic;
