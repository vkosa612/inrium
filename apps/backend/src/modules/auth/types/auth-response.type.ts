import { UserRole, UserStatus } from '@prisma/client';

export interface UserPublic {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  bio: string | null;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Токени існують лише у HttpOnly cookie й ніколи не потрапляють у JSON. */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeSeconds: number;
  refreshMaxAgeSeconds: number;
}

/** Результат login: cookie-токени + публічний користувач (для JSON). */
export interface LoginResult {
  tokens: IssuedTokens;
  user: UserPublic;
}

/** Результат refresh. `tokens.refreshToken` порожній, якщо refresh вже ротовано паралельним запитом. */
export interface RefreshResult {
  tokens: Omit<IssuedTokens, 'refreshToken' | 'refreshMaxAgeSeconds'> & {
    refreshToken: string | null;
    refreshMaxAgeSeconds: number | null;
  };
  user: UserPublic;
}

/** Fields returned on GET /auth/me */
export type MeResult = UserPublic;
