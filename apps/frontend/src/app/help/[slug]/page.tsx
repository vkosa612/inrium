import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarkdownContent from '@/components/MarkdownContent';
import { apiGetHelpBySlug, apiGetHelp } from '@/lib/api';

export const dynamic = 'force-dynamic';

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function HelpSlugPage({ params }: Props) {
  const { slug } = await params;

  let item;
  try {
    item = await apiGetHelpBySlug(slug);
  } catch {
    notFound();
  }

  // Related help by category (same category, exclude current)
  let related: Awaited<ReturnType<typeof apiGetHelp>>['items'] = [];
  try {
    const r = await apiGetHelp({ category: item.category?.slug, limit: 5 });
    related = r.items.filter((i) => i.id !== item.id).slice(0, 3);
  } catch { /* non-critical */ }

  const publishedDate = formatDate(item.publishedAt ?? item.createdAt);

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 24px 64px' }}>

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Головна</Link>
            <span>›</span>
            <Link href="/help" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Довідка</Link>
            <span>›</span>
            <span style={{ color: 'var(--text-dim)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
          </nav>

          {/* Type badge + meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f7971f', background: 'rgba(247,151,31,0.12)', border: '1px solid rgba(247,151,31,0.25)', padding: '3px 12px', borderRadius: 20 }}>
              📖 Довідка
            </span>
            {item.category && (
              <Link href={`/help?category=${item.category.slug}`} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 20, textDecoration: 'none' }}>
                {item.category.name}
              </Link>
            )}
            <time style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{publishedDate}</time>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2, marginBottom: 18, letterSpacing: '-0.02em' }}>
            {item.title}
          </h1>

          {/* Excerpt */}
          {item.excerpt && (
            <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, marginBottom: 28, paddingLeft: 16, borderLeft: '3px solid #f7971f', fontStyle: 'italic' }}>
              {item.excerpt}
            </p>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #1e1e32', marginBottom: 28 }} />

          {/* Markdown content */}
          <article>
            <MarkdownContent content={item.content} />
          </article>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #1e1e32' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Теги</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {item.tags.map(({ tag }) => (
                  <Link key={tag.id} href={`/help?tag=${tag.slug}`} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 20, textDecoration: 'none' }}>
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related help */}
          {related.length > 0 && (
            <div style={{ marginTop: 44 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 16, background: '#f7971f', borderRadius: 2, display: 'inline-block' }} />
                Схожі матеріали
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {related.map((r) => (
                  <Link key={r.id} href={`/help/${r.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{r.title}</div>
                        {r.excerpt && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>{r.excerpt}</div>}
                      </div>
                      <span style={{ color: '#f7971f', fontSize: 16, flexShrink: 0 }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <div style={{ marginTop: 36 }}>
            <Link href="/help" style={{ fontSize: 14, color: '#f7971f', textDecoration: 'none', fontWeight: 600 }}>
              ← Назад до довідки
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
