import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { apiGetKitBySlug, resolveAbsoluteMediaUrl, resolveMediaUrl } from '@/lib/api';
import BookmarkButton from '@/components/BookmarkButton';
import { SITE_URL } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

const BASE_URL = SITE_URL;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const kit = await apiGetKitBySlug(slug);
    const description = kit.shortDescription ?? `Набір ${kit.title} для настільних рольових ігор`;
    return {
      title: `${kit.title} — Набори — INRIUM`,
      description,
      alternates: { canonical: `${BASE_URL}/kits/${slug}` },
      openGraph: {
        title: kit.title,
        description,
        url: `${BASE_URL}/kits/${slug}`,
        type: 'article',
        ...(resolveAbsoluteMediaUrl(kit.imageUrl)
          ? { images: [{ url: resolveAbsoluteMediaUrl(kit.imageUrl)!, alt: kit.title }] }
          : {}),
      },
      twitter: { card: 'summary_large_image', title: kit.title, description },
    };
  } catch {
    return { title: 'Набір — INRIUM' };
  }
}

const CATEGORY_COLOR: Record<string, string> = {
  'Стартовий': '#10b981',
  'GM': '#f59e0b',
  'Гравець': '#22d3ee',
  'One-Shot': '#ec4899',
  'Цифровий': '#a78bfa',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function KitDetailPage({ params }: Props) {
  const { slug } = await params;

  let kit;
  try {
    kit = await apiGetKitBySlug(slug);
  } catch {
    notFound();
  }

  const catColor = CATEGORY_COLOR[kit.category ?? ''] ?? '#6b7280';

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Головна</Link>
            <span>/</span>
            <Link href="/kits" style={{ color: 'inherit', textDecoration: 'none' }}>Набори</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dim)' }}>{kit.title}</span>
          </nav>

          {/* Cover */}
          {resolveMediaUrl(kit.imageUrl) && (
            <div style={{ width: '100%', height: 200, borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(kit.imageUrl)!} alt={kit.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
            {kit.category && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 20, color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30` }}>
                {kit.category}
              </span>
            )}
            {kit.priceText && (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{kit.priceText}</span>
            )}
            {kit.system && (
              <Link
                href={`/systems/${kit.system.slug}`}
                style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                🎲 {kit.system.title}
              </Link>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <BookmarkButton targetType="KIT" targetId={kit.id} />
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginBottom: 14, letterSpacing: '-0.02em' }}>
            {kit.title}
          </h1>

          {/* Short desc */}
          {kit.shortDescription && (
            <p style={{ fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 28, borderLeft: '3px solid #10b981', paddingLeft: 16 }}>
              {kit.shortDescription}
            </p>
          )}

          {/* Full description */}
          <article style={{ marginBottom: 36 }}>
            {kit.description.split('\n').map((line, idx) =>
              line.trim() === '' ? <br key={idx} /> : (
                <p key={idx} style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: 12 }}>
                  {line}
                </p>
              )
            )}
          </article>

          {/* Back link */}
          <div style={{ paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 20 }}>
            <Link href="/kits" style={{ color: '#10b981', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              ← Назад до наборів
            </Link>
            {kit.system && (
              <Link href={`/systems/${kit.system.slug}`} style={{ color: '#a78bfa', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                🎲 Про систему {kit.system.title}
              </Link>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
