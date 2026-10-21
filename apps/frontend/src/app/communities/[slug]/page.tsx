import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { apiGetCommunityBySlug, resolveMediaUrl } from '@/lib/api';
import CoverImage from '@/components/CoverImage';
import { COVER_ASPECT_RATIO, coverFocusFromEntity } from '@/lib/cover-focus';

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

  const coverSrc = resolveMediaUrl(community.coverImageUrl);

  return (
    <>
      <Header />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <Link href="/communities" style={{ color: '#f7971f', fontSize: 13, textDecoration: 'none' }}>← Усі спільноти</Link>

        {coverSrc ? (
          <CoverImage
            src={coverSrc}
            alt={community.name}
            focus={coverFocusFromEntity(community)}
            aspectRatio={COVER_ASPECT_RATIO}
            radius={12}
            style={{ marginTop: 16, marginBottom: 20, border: '1px solid var(--border)' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 160,
              marginTop: 16,
              marginBottom: 20,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(16,185,129,0.08) 100%)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
            }}
            aria-hidden
          >
            👥
          </div>
        )}

        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 24px' }}>{community.name}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>{community.description}</p>
      </main>
      <Footer />
    </>
  );
}
