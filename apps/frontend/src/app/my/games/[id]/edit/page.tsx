import type { Metadata } from 'next';
import MyGameEditPageClient from './MyGameEditPageClient';

export const metadata: Metadata = {
  title: 'Редагувати гру — INRIUM',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MyGameEditPage({ params }: Props) {
  const { id } = await params;
  return <MyGameEditPageClient id={id} />;
}
