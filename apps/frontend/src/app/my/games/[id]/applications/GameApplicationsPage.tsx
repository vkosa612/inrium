'use client';

import ProtectedRouteShell from '@/components/ProtectedRouteShell';
import GameApplicationsPageClient from './GameApplicationsPageClient';

interface Props {
  gameId: string;
}

export default function GameApplicationsPage({ gameId }: Props) {
  return (
    <ProtectedRouteShell requirement="GAME_MASTER_OR_ADMIN">
      <GameApplicationsPageClient gameId={gameId} />
    </ProtectedRouteShell>
  );
}
