import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarkdownContent from '@/components/MarkdownContent';
import BookmarkButton from '@/components/BookmarkButton';
import { fetchContentBySlug, fetchContent, resolveAbsoluteMediaUrl, resolveMediaUrl } from '@/lib/api';
import CoverImage from '@/components/CoverImage';
import { COVER_ASPECT_RATIO, coverFocusFromEntity } from '@/lib/cover-focus';
import { SITE_URL } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

const BASE_URL = SITE_URL;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const item = await fetchContentBySlug(slug);
    const description = item.excerpt ?? `Матеріал "${item.title}" на INRIUM`;
    const image = resolveAbsoluteMediaUrl(item.coverImageUrl);
    return {
      title: `${item.title} — INRIUM`,
      description,
      alternates: { canonical: `${BASE_URL}/content/${slug}` },
      openGraph: {
        title: item.title,
        description,
        url: `${BASE_URL}/content/${slug}`,
        type: 'article',
        ...(image ? { images: [{ url: image, alt: item.title }] } : {}),
      },
      twitter: { card: 'summary_large_image', title: item.title, description },
    };
  } catch {
    return { title: 'Матеріал — INRIUM' };
  }
}

const TYPE_LABEL: Record<string, string> = {
  NEWS: 'Новини', ARTICLE: 'Стаття', GAME_SYSTEM: 'Ігрова система',
  KIT: 'Набір', HELP_PAGE: 'Довідка',
};
const TYPE_COLOR: Record<string, string> = {
  NEWS: '#f59e0b', ARTICLE: '#ec4899', GAME_SYSTEM: '#22d3ee',
  KIT: '#10b981', HELP_PAGE: '#f97316',
};
const TYPE_HREF: Record<string, string> = {
  NEWS: '/news', ARTICLE: '/articles', GAME_SYSTEM: '/systems',
  KIT: '/articles', HELP_PAGE: '/',
};

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ContentSlugPage({ params }: Props) {
  const { slug } = await params;

  let item;
  try {
    item = await fetchContentBySlug(slug);
  } catch {
    notFound();
  }

  // Related: same type, exclude current
  let related: Awaited<ReturnType<typeof fetchContent>>['items'] = [];
  try {
    const r = await fetchContent({ type: item.type as never, limit: 4 });
    related = r.items.filter((i) => i.id !== item.id).slice(0, 3);
  } catch { /* non-critical */ }

  const typeColor = TYPE_COLOR[item.type] ?? '#a78bfa';
  const typeLabel = TYPE_LABEL[item.type] ?? item.type;
  const typeHref = TYPE_HREF[item.type] ?? '/';
  const publishedDate = formatDate(item.publishedAt ?? item.createdAt);

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 24px 64px' }}>

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              Головна
            </Link>
            <span>›</span>
            <Link href={typeHref} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              {typeLabel}
            </Link>
            <span>›</span>
            <span style={{ color: 'var(--text-dim)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
          </nav>

          {/* Cover image */}
          {resolveMediaUrl(item.coverImageUrl) && (
            <CoverImage
              src={resolveMediaUrl(item.coverImageUrl)!}
              alt={item.title}
              focus={coverFocusFromEntity(item)}
              aspectRatio={COVER_ASPECT_RATIO}
              radius={12}
              style={{ marginBottom: 28, border: '1px solid var(--border)' }}
            />
          )}

          {/* Type + meta badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30`, padding: '3px 12px', borderRadius: 20 }}>
              {typeLabel}
            </span>
            {item.isFeatured && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', padding: '3px 10px', borderRadius: 20 }}>
                ★ Обране
              </span>
            )}
            {item.category && (
              <Link href={`${typeHref}?category=${item.category.slug}`} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 20, textDecoration: 'none' }}>
                {item.category.name}
              </Link>
            )}
            <time style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{publishedDate}</time>
            {item.author && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {item.author.displayName}</span>}
          </div>

          {(item.type === 'NEWS' || item.type === 'ARTICLE') && (
            <div style={{ marginBottom: 20 }}>
              <BookmarkButton targetType="CONTENT" targetId={item.id} />
            </div>
          )}

          {/* Title */}
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.02em' }}>
            {item.title}
          </h1>

          {/* Excerpt */}
          {item.excerpt && (
            <p style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.7, marginBottom: 32, paddingLeft: 16, borderLeft: `3px solid ${typeColor}`, fontStyle: 'italic' }}>
              {item.excerpt}
            </p>
          )}

          {/* Divider */}
          <hr style={{ border: 'none', borderTop: '1px solid #1e1e32', marginBottom: 32 }} />

          {/* Content — markdown */}
          <article>
            <MarkdownContent content={item.content} />
          </article>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid #1e1e32' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Теги</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {item.tags.map(({ tag }) => (
                  <Link key={tag.id} href={`${typeHref}?tag=${tag.slug}`} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 20, textDecoration: 'none' }}>
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related */}
          {related.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 16, background: typeColor, borderRadius: 2, display: 'inline-block' }} />
                Схожі матеріали
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {related.map((r) => (
                  <Link key={r.id} href={`/content/${r.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{r.title}</div>
                        {r.excerpt && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>{r.excerpt}</div>}
                      </div>
                      <span style={{ color: typeColor, fontSize: 16, flexShrink: 0 }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <div style={{ marginTop: 40 }}>
            <Link href={typeHref} style={{ fontSize: 14, color: typeColor, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ← Назад до {typeLabel}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
