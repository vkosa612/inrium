'use client';

import ProtectedRouteShell from '@/components/ProtectedRouteShell';
import MyGamesPageClient from './MyGamesPageClient';

export default function MyGamesPage() {
  return (
    <ProtectedRouteShell requirement="GAME_MASTER_OR_ADMIN">
      <MyGamesPageClient />
    </ProtectedRouteShell>
  );
}
