import type { Metadata } from 'next';
import MyGameEditPage from './MyGameEditPage';

export const metadata: Metadata = {
  title: 'Редагувати гру — INRIUM',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MyGameEditPageRoute({ params }: Props) {
  const { id } = await params;
  return <MyGameEditPage id={id} />;
}
