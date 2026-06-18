import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FilterBar from '@/components/FilterBar';
import PaginationWrapper from '@/components/PaginationWrapper';
import { apiGetHelp, type ContentItem } from '@/lib/api';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 12;

export const metadata: Metadata = {
  title: 'Довідка — INRIUM',
  description: 'База знань INRIUM: як почати грати, ролі, ігрові системи, набори та відповіді на часті питання',
  openGraph: {
    title: 'Довідка — INRIUM',
    description: 'База знань INRIUM: як почати грати, ролі, ігрові системи, набори та відповіді на часті питання',
    type: 'website',
  },
};

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function HelpCard({ item }: { item: ContentItem }) {
  return (
    <Link href={`/help/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', cursor: 'pointer', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(247,151,31,0.1)', border: '1px solid rgba(247,151,31,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          📖
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {item.category && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#f7971f', background: 'rgba(247,151,31,0.1)', border: '1px solid rgba(247,151,31,0.2)', padding: '2px 8px', borderRadius: 12 }}>
                {item.category.name}
              </span>
            )}
            {item.isFeatured && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa' }}>★ Рекомендовано</span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {formatDate(item.publishedAt ?? item.createdAt)}
            </span>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 5, lineHeight: 1.35 }}>{item.title}</h2>
          {item.excerpt && (
            <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{item.excerpt}</p>
          )}
        </div>
        <span style={{ color: '#f7971f', fontSize: 16, flexShrink: 0, marginTop: 2 }}>→</span>
      </article>
    </Link>
  );
}

interface Props {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}

export default async function HelpPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { category, search } = sp;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  let items: ContentItem[] = [];
  let total = 0;
  let totalPages = 1;
  let hasNextPage = false;
  let hasPrevPage = false;

  try {
    const result = await apiGetHelp({ category, search, page, limit: ITEMS_PER_PAGE });
    items = result.items;
    total = result.total;
    totalPages = result.totalPages;
    hasNextPage = result.hasNextPage ?? false;
    hasPrevPage = result.hasPrevPage ?? false;
  } catch { /* non-critical */ }

  // Separate featured from others
  const featured = items.filter((i) => i.isFeatured);
  const regular = items.filter((i) => !i.isFeatured);
  const activeFilters: Record<string, string | undefined> = { category, search };

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 64px' }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, height: 28, background: '#f7971f', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Довідка INRIUM
              </h1>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>{total}</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Відповіді на часті питання, поради для початківців і гайди для GM
            </p>
          </div>

          {/* Filters */}
          <FilterBar
            accentColor="#f7971f"
            activeValues={activeFilters}
            fields={[
              { param: 'search', placeholder: 'Пошук по довідці…', type: 'text' },
              { param: 'category', placeholder: 'Всі розділи', options: [
                { label: 'Початківцям', value: 'help' },
                { label: 'Ролі', value: 'roles' },
                { label: 'Game Master', value: 'gm' },
              ]},
            ]}
          />

          {/* Featured items */}
          {featured.length > 0 && !search && !category && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f7971f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: '#f7971f', borderRadius: 2, display: 'inline-block' }} />
                Рекомендовано
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {featured.map((item) => <HelpCard key={item.id} item={item} />)}
              </div>
            </div>
          )}

          {/* All or filtered items */}
          {regular.length > 0 && (
            <div>
              {!search && !category && featured.length > 0 && (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 14, background: 'var(--border)', borderRadius: 2, display: 'inline-block' }} />
                  Всі матеріали
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(search || category ? items : regular).map((item) => <HelpCard key={item.id} item={item} />)}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <p style={{ marginBottom: 12 }}>{search || category ? 'Нічого не знайдено за фільтрами' : 'Матеріали довідки поки не додані'}</p>
              {(search || category) && (
                <Link href="/help" style={{ fontSize: 13, color: '#f7971f', textDecoration: 'none' }}>← Скинути фільтри</Link>
              )}
            </div>
          )}

          <PaginationWrapper
            page={page}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            accentColor="#f7971f"
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
