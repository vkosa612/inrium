import type { Metadata } from 'next';
import GameApplicationsPageClient from './GameApplicationsPageClient';

export const metadata: Metadata = {
  title: 'Заявки на гру — INRIUM',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GameApplicationsPage({ params }: Props) {
  const { id } = await params;
  return <GameApplicationsPageClient gameId={id} />;
}
