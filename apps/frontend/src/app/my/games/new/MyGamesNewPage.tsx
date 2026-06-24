'use client';

import ProtectedRouteShell from '@/components/ProtectedRouteShell';
import MyGamesNewPageClient from './MyGamesNewPageClient';

export default function MyGamesNewPage() {
  return (
    <ProtectedRouteShell requirement="GAME_MASTER_OR_ADMIN">
      <MyGamesNewPageClient />
    </ProtectedRouteShell>
  );
}
