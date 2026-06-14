import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchContent, type ContentItem } from '@/lib/api';
import { LATEST_NEWS } from '@/lib/mock-data';

// Always render at request time so fresh data is fetched from API
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Новини — INRIUM',
  description: 'Останні новини зі світу настільних рольових ігор',
};

const TYPE_COLOR: Record<string, string> = {
  NEWS: '#f59e0b',
  ARTICLE: '#ec4899',
  GAME_SYSTEM: '#22d3ee',
  KIT: '#10b981',
  HELP_PAGE: '#f97316',
};

const TYPE_LABEL: Record<string, string> = {
  NEWS: 'Новини',
  ARTICLE: 'Стаття',
  GAME_SYSTEM: 'Система',
  KIT: 'Набір',
  HELP_PAGE: 'Допомога',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function NewsCard({ item }: { item: ContentItem }) {
  const color = TYPE_COLOR[item.type] ?? '#a78bfa';
  const label = TYPE_LABEL[item.type] ?? item.type;
  const date = formatDate(item.publishedAt ?? item.createdAt);

  return (
    <Link href={`/content/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article
        className="card-hover"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: color,
              background: `${color}18`,
              border: `1px solid ${color}30`,
              padding: '3px 10px',
              borderRadius: 20,
            }}
          >
            {label}
          </span>
          {item.isFeatured && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--accent)',
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.25)',
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              ★ Обране
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {date}
          </span>
        </div>

        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 8,
            lineHeight: 1.35,
          }}
        >
          {item.title}
        </h2>

        {item.excerpt && (
          <p
            className="line-clamp-2"
            style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}
          >
            {item.excerpt}
          </p>
        )}

        {(item.author || item.category) && (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
            {item.author?.displayName}
            {item.author && item.category && ' · '}
            {item.category?.name}
          </div>
        )}
      </article>
    </Link>
  );
}

const MOCK_ITEMS: ContentItem[] = LATEST_NEWS.map((a, i) => ({
  id: a.id,
  slug: a.id,
  type: 'NEWS',
  status: 'PUBLISHED',
  title: a.title,
  excerpt: a.excerpt,
  coverImageUrl: null,
  isFeatured: false,
  publishedAt: new Date(Date.now() - i * 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  author: null,
  category: null,
  tags: [],
}));

export default async function NewsPage() {
  let items: ContentItem[] = [];
  let total = 0;
  let fromApi = true;

  try {
    const result = await fetchContent({ type: 'NEWS', limit: 20 });
    items = result.items;
    total = result.total;
  } catch {
    items = MOCK_ITEMS;
    total = MOCK_ITEMS.length;
    fromApi = false;
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, height: 28, background: '#f59e0b', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Новини
              </h1>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  padding: '2px 10px',
                  borderRadius: 20,
                }}
              >
                {total}
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Останні події зі світу настільних рольових ігор
              {!fromApi && (
                <span style={{ color: '#f59e0b', marginLeft: 8 }}>· Показано демо-дані</span>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <p>Новин поки немає</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
