'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useRequireGameMaster() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'GAME_MASTER' && user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  return { user, isLoading, allowed: !!user && (user.role === 'GAME_MASTER' || user.role === 'ADMIN') };
}
