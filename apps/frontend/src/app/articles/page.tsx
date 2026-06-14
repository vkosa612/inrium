import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FilterBar from '@/components/FilterBar';
import { fetchContent, type ContentItem } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Статті — INRIUM',
  description: 'Огляди, гайди та статті про настільні рольові ігри',
};

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ArticleCard({ item }: { item: ContentItem }) {
  return (
    <Link href={`/content/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="card-hover" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', alignItems: 'start', cursor: 'pointer' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#ec4899', background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)', padding: '3px 10px', borderRadius: 20 }}>
              Стаття
            </span>
            {item.isFeatured && <span style={{ fontSize: 11, color: '#a78bfa' }}>★ Обране</span>}
            {item.category && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12 }}>
                {item.category.name}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>{item.title}</h2>
          {item.excerpt && <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{item.excerpt}</p>}
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
            {item.author && <span>{item.author.displayName}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(item.publishedAt ?? item.createdAt)}</span>
        </div>
      </article>
    </Link>
  );
}

interface Props {
  searchParams: Promise<{ category?: string; tag?: string; search?: string }>;
}

export default async function ArticlesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { category, tag, search } = sp;

  let items: ContentItem[] = [];
  let total = 0;

  try {
    const result = await fetchContent({ type: 'ARTICLE', limit: 30, category, tag, search });
    items = result.items;
    total = result.total;
  } catch { /* non-critical */ }

  const activeFilters: Record<string, string | undefined> = { category, tag, search };

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, height: 28, background: '#ec4899', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Статті</h1>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>{total}</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Огляди, гайди та матеріали для гравців і майстрів</p>
          </div>

          <FilterBar
            accentColor="#ec4899"
            activeValues={activeFilters}
            fields={[
              { param: 'search', placeholder: 'Пошук по статтях…', type: 'text' },
              { param: 'category', placeholder: 'Всі категорії', options: [
                { label: 'Гайди', value: 'guides' },
                { label: 'Огляди', value: 'reviews' },
                { label: 'Поради', value: 'tips' },
                { label: 'Кампанії', value: 'campaigns' },
              ]},
            ]}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item) => <ArticleCard key={item.id} item={item} />)}
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <p style={{ marginBottom: 12 }}>{search || category || tag ? 'Нічого не знайдено за фільтрами' : 'Статей поки немає'}</p>
              {(search || category || tag) && (
                <Link href="/articles" style={{ fontSize: 13, color: '#ec4899', textDecoration: 'none' }}>← Скинути фільтри</Link>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
