'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthResult, AuthUser } from '@/lib/api';
import { apiLogout } from '@/lib/api';
import {
  clearAuth,
  getRefreshToken,
  getStoredUser,
  setAuth as storeAuth,
} from '@/lib/auth-storage';

interface AuthContextValue {
  user: AuthUser | null;
  /** True while reading initial state from localStorage (avoid flash) */
  isLoading: boolean;
  /** Call after successful login/register API response */
  login: (result: AuthResult) => void;
  /** Revokes session on backend and clears local storage */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Runs only on the client after hydration
    setUser(getStoredUser());
    setIsLoading(false);
  }, []);

  const login = useCallback((result: AuthResult) => {
    storeAuth(result);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = getRefreshToken();
      if (rt) await apiLogout(rt);
    } catch {
      // Ignore backend errors during logout
    } finally {
      clearAuth();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
