import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FilterBar from '@/components/FilterBar';
import PaginationWrapper from '@/components/PaginationWrapper';
import { fetchContent, type ContentItem } from '@/lib/api';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

export const metadata: Metadata = {
  title: 'Новини — INRIUM',
  description: 'Останні новини зі світу настільних рольових ігор',
  openGraph: {
    title: 'Новини — INRIUM',
    description: 'Останні новини зі світу настільних рольових ігор',
    type: 'website',
  },
};

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function NewsCard({ item }: { item: ContentItem }) {
  return (
    <Link href={`/content/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', padding: '3px 10px', borderRadius: 20 }}>
            Новини
          </span>
          {item.isFeatured && <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa' }}>★ Обране</span>}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(item.publishedAt ?? item.createdAt)}</span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8, lineHeight: 1.35 }}>{item.title}</h2>
        {item.excerpt && <p className="line-clamp-2" style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>{item.excerpt}</p>}
        {(item.author || item.category) && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
            {item.author && <span>{item.author.displayName}</span>}
            {item.author && item.category && <span>·</span>}
            {item.category && <span>{item.category.name}</span>}
          </div>
        )}
      </article>
    </Link>
  );
}

interface Props {
  searchParams: Promise<{ category?: string; tag?: string; search?: string; page?: string }>;
}

export default async function NewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { category, tag, search } = sp;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  let items: ContentItem[] = [];
  let total = 0;
  let totalPages = 1;
  let hasNextPage = false;
  let hasPrevPage = false;

  try {
    const result = await fetchContent({ type: 'NEWS', limit: ITEMS_PER_PAGE, page, category, tag, search });
    items = result.items;
    total = result.total;
    totalPages = result.totalPages;
    hasNextPage = result.hasNextPage ?? false;
    hasPrevPage = result.hasPrevPage ?? false;
  } catch { /* non-critical */ }

  const activeFilters: Record<string, string | undefined> = { category, tag, search };

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, height: 28, background: '#f59e0b', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Новини</h1>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>{total}</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Останні події зі світу настільних рольових ігор</p>
          </div>

          <FilterBar
            accentColor="#f59e0b"
            activeValues={activeFilters}
            fields={[
              { param: 'search', placeholder: 'Пошук по новинах…', type: 'text' },
              { param: 'category', placeholder: 'Всі категорії', options: [
                { label: 'Анонси', value: 'announcements' },
                { label: 'Огляди', value: 'reviews' },
                { label: 'Новинки', value: 'releases' },
                { label: 'Спільнота', value: 'community' },
              ]},
            ]}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item) => <NewsCard key={item.id} item={item} />)}
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <p style={{ marginBottom: 12 }}>{search || category || tag ? 'Нічого не знайдено за фільтрами' : 'Новин поки немає'}</p>
              {(search || category || tag) && (
                <Link href="/news" style={{ fontSize: 13, color: '#f59e0b', textDecoration: 'none' }}>← Скинути фільтри</Link>
              )}
            </div>
          )}

          <PaginationWrapper
            page={page}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            accentColor="#f59e0b"
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
