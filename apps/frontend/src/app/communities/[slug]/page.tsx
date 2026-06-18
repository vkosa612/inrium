import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { apiGetCommunityBySlug } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const c = await apiGetCommunityBySlug(slug);
    return { title: `${c.name} — Спільноти — INRIUM`, description: c.description.slice(0, 160) };
  } catch {
    return { title: 'Спільнота — INRIUM' };
  }
}

export default async function CommunityDetailPage({ params }: Props) {
  const { slug } = await params;

  let community;
  try {
    community = await apiGetCommunityBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <Link href="/communities" style={{ color: '#f7971f', fontSize: 13, textDecoration: 'none' }}>← Усі спільноти</Link>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '16px 0 24px' }}>{community.name}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>{community.description}</p>
      </main>
      <Footer />
    </>
  );
}
