'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser } from '@/lib/api';
import { apiGetMe, apiLogout } from '@/lib/api';
import { ApiRequestError, invalidateCsrfToken, onSessionExpired } from '@/lib/http';

interface AuthContextValue {
  /** Поточний користувач або null (гість). Джерело правди — сервер (`/auth/me`), не браузерне сховище. */
  user: AuthUser | null;
  /** true, поки триває первинна перевірка сесії (щоб не мигала шапка/не було хибних редіректів). */
  isLoading: boolean;
  /** Викликати після успішного входу (cookie вже встановлено сервером). */
  login: (user: AuthUser) => void;
  /** Оновити користувача в контексті після редагування профілю. */
  updateUser: (user: AuthUser) => void;
  /** Відкликає сесію на сервері, чистить cookie та повідомляє інші вкладки. */
  logout: () => Promise<void>;
  /** Перечитати користувача з сервера (напр. після зміни ролі). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: () => {},
  updateUser: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

type AuthBroadcast = 'login' | 'logout';
const CHANNEL_NAME = 'inrium-auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const broadcast = useCallback((message: AuthBroadcast) => {
    channelRef.current?.postMessage(message);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      setUser(await apiGetMe());
    } catch (err) {
      // 401 після невдалого refresh = гість. Мережеві/5xx помилки не вважаємо «розлогіненням»,
      // але для відображення поводимось як із гостем, доки сервер недоступний.
      if (!(err instanceof ApiRequestError) || err.status >= 500) {
        // залишаємо попереднього користувача, якщо він був
        return;
      }
      setUser(null);
    }
  }, []);

  // Первинне визначення сесії.
  useEffect(() => {
    let cancelled = false;
    void loadSession().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  // Синхронізація між вкладками: вихід/вхід в одній вкладці відображається в усіх.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<AuthBroadcast>) => {
      invalidateCsrfToken();
      if (event.data === 'logout') {
        setUser(null);
      } else if (event.data === 'login') {
        void loadSession();
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [loadSession]);

  // Сесію завершено (refresh не вдався) — переходимо в режим гостя; guards самі відредіректять.
  useEffect(() => onSessionExpired(() => setUser(null)), []);

  const login = useCallback(
    (next: AuthUser) => {
      invalidateCsrfToken();
      setUser(next);
      broadcast('login');
    },
    [broadcast],
  );

  const updateUser = useCallback((next: AuthUser) => {
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Сервер міг уже відкликати сесію (напр. після зміни пароля) — локально все одно виходимо.
    } finally {
      setUser(null);
      broadcast('logout');
    }
  }, [broadcast]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, updateUser, logout, refreshUser: loadSession }),
    [user, isLoading, login, updateUser, logout, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
