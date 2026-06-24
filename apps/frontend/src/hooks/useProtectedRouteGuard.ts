'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/lib/api';

export type ProtectedRoleRequirement = 'AUTH' | 'GAME_MASTER_OR_ADMIN';

export type ProtectedGuardStatus = 'loading' | 'redirecting' | 'forbidden' | 'ready';

function hasAccess(user: AuthUser, requirement: ProtectedRoleRequirement): boolean {
  if (requirement === 'AUTH') return true;
  return user.role === 'GAME_MASTER' || user.role === 'ADMIN';
}

export function useProtectedRouteGuard(requirement: ProtectedRoleRequirement = 'AUTH'): {
  status: ProtectedGuardStatus;
  user: AuthUser | null;
} {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [isLoading, user, router, pathname]);

  const status = useMemo((): ProtectedGuardStatus => {
    if (isLoading) return 'loading';
    if (!user) return 'redirecting';
    if (!hasAccess(user, requirement)) return 'forbidden';
    return 'ready';
  }, [isLoading, user, requirement]);

  return { status, user };
}
