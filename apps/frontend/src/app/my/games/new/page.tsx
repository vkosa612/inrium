import type { Metadata } from 'next';
import MyGamesNewPageClient from './MyGamesNewPageClient';

export const metadata: Metadata = {
  title: 'Нова гра — INRIUM',
  robots: { index: false, follow: false },
};

export default function MyGamesNewPage() {
  return <MyGamesNewPageClient />;
}
