'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/lib/api';

export type AdminRoleRequirement = 'ADMIN' | 'ADMIN_OR_EDITOR';

export type AdminGuardStatus = 'loading' | 'redirecting' | 'forbidden' | 'ready';

function hasAccess(user: AuthUser, requirement: AdminRoleRequirement): boolean {
  if (requirement === 'ADMIN') return user.role === 'ADMIN';
  return user.role === 'ADMIN' || user.role === 'EDITOR';
}

export function useAdminRouteGuard(requirement: AdminRoleRequirement = 'ADMIN'): {
  status: AdminGuardStatus;
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

  const status = useMemo((): AdminGuardStatus => {
    if (isLoading) return 'loading';
    if (!user) return 'redirecting';
    if (!hasAccess(user, requirement)) return 'forbidden';
    return 'ready';
  }, [isLoading, user, requirement]);

  return { status, user };
}
