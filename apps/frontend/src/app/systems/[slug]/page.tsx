import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { apiGetSystemBySlug, resolveAbsoluteMediaUrl, resolveMediaUrl } from '@/lib/api';
import BookmarkButton from '@/components/BookmarkButton';
import { SITE_URL } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

const BASE_URL = SITE_URL;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const system = await apiGetSystemBySlug(slug);
    const description = system.shortDescription ?? `Ігрова система ${system.title} — огляд, правила, складність`;
    return {
      title: `${system.title} — Ігрові системи — INRIUM`,
      description,
      alternates: { canonical: `${BASE_URL}/systems/${slug}` },
      openGraph: {
        title: system.title,
        description,
        url: `${BASE_URL}/systems/${slug}`,
        type: 'article',
        ...(resolveAbsoluteMediaUrl(system.imageUrl)
          ? { images: [{ url: resolveAbsoluteMediaUrl(system.imageUrl)!, alt: system.title }] }
          : {}),
      },
      twitter: { card: 'summary_large_image', title: system.title, description },
    };
  } catch {
    return { title: 'Ігрова система — INRIUM' };
  }
}

const COMPLEXITY_COLOR: Record<string, string> = {
  'Початківець': '#10b981',
  'Середній': '#f59e0b',
  'Просунутий': '#ef4444',
  'Hardcore': '#a855f7',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SystemDetailPage({ params }: Props) {
  const { slug } = await params;

  let system;
  try {
    system = await apiGetSystemBySlug(slug);
  } catch {
    notFound();
  }

  const complexityColor = COMPLEXITY_COLOR[system.complexity ?? ''] ?? '#6b7280';

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Головна</Link>
            <span>/</span>
            <Link href="/systems" style={{ color: 'inherit', textDecoration: 'none' }}>Ігрові системи</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dim)' }}>{system.title}</span>
          </nav>

          {/* Cover */}
          {resolveMediaUrl(system.imageUrl) && (
            <div style={{ width: '100%', height: 240, borderRadius: 16, overflow: 'hidden', marginBottom: 32 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(system.imageUrl)!} alt={system.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Meta badges */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {system.genre && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 20, color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
                {system.genre}
              </span>
            )}
            {system.complexity && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 20, color: complexityColor, background: `${complexityColor}18`, border: `1px solid ${complexityColor}30` }}>
                Рівень: {system.complexity}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
              {system.publishedAt ? new Date(system.publishedAt).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <BookmarkButton targetType="SYSTEM" targetId={system.id} />
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.02em' }}>
            {system.title}
          </h1>

          {/* Short desc */}
          {system.shortDescription && (
            <p style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 32, borderLeft: '3px solid #a78bfa', paddingLeft: 16 }}>
              {system.shortDescription}
            </p>
          )}

          {/* Full description */}
          <article style={{ marginBottom: 40 }}>
            {system.description.split('\n').map((line, idx) =>
              line.trim() === '' ? <br key={idx} /> : (
                <p key={idx} style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: 12 }}>
                  {line}
                </p>
              )
            )}
          </article>

          {/* Tags */}
          {system.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              {system.tags.map((tag) => (
                <span key={tag} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 20 }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Related kits */}
          {system.kits.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                Набори для {system.title}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {system.kits.map((kit) => (
                  <Link
                    key={kit.id}
                    href={`/kits/${kit.slug}`}
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div
                      className="card-hover"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{kit.title}</div>
                      {kit.shortDescription && (
                        <p className="line-clamp-2" style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                          {kit.shortDescription}
                        </p>
                      )}
                      {kit.priceText && (
                        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 8 }}>{kit.priceText}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Back link */}
          <Link href="/systems" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            ← Назад до ігрових систем
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
