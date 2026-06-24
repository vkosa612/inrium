import type { Metadata } from 'next';
import GameApplicationsPage from './GameApplicationsPage';

export const metadata: Metadata = {
  title: 'Заявки на гру — INRIUM',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GameApplicationsPageRoute({ params }: Props) {
  const { id } = await params;
  return <GameApplicationsPage gameId={id} />;
}
