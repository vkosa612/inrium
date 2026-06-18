/**
 * Centralised localStorage helpers for auth tokens.
 * All auth state is stored under namespaced keys.
 * Never import this in Server Components — client-only.
 */
import type { AuthResult, AuthUser } from './api';

const KEY = {
  ACCESS: 'inrium_access_token',
  REFRESH: 'inrium_refresh_token',
  USER: 'inrium_user',
} as const;

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY.ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY.REFRESH);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY.USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setAuth(result: AuthResult): void {
  localStorage.setItem(KEY.ACCESS, result.accessToken);
  localStorage.setItem(KEY.REFRESH, result.refreshToken);
  localStorage.setItem(KEY.USER, JSON.stringify(result.user));
}

export function updateStoredUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY.USER, JSON.stringify(user));
}

export function clearAuth(): void {
  Object.values(KEY).forEach((k) => localStorage.removeItem(k));
  // Also clear old-style keys from previous implementation
  ['access_token', 'refresh_token', 'user'].forEach((k) => localStorage.removeItem(k));
}
