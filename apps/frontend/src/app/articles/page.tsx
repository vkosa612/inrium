import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchContent, type ContentItem } from '@/lib/api';
import { POPULAR_ARTICLES } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Статті — INRIUM',
  description: 'Огляди, гайди та статті про настільні рольові ігри',
};

const TYPE_COLOR: Record<string, string> = {
  ARTICLE: '#ec4899',
  NEWS: '#f59e0b',
  GAME_SYSTEM: '#22d3ee',
  KIT: '#10b981',
  HELP_PAGE: '#f97316',
};

const TYPE_LABEL: Record<string, string> = {
  ARTICLE: 'Стаття',
  NEWS: 'Новини',
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

function ArticleCard({ item }: { item: ContentItem }) {
  const color = TYPE_COLOR[item.type] ?? '#a78bfa';
  const label = TYPE_LABEL[item.type] ?? item.type;

  return (
    <Link href={`/content/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article
        className="card-hover"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 20,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
          alignItems: 'start',
          cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
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
              <span style={{ fontSize: 11, color: 'var(--accent)' }}>★ Обране</span>
            )}
          </div>

          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 6,
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </h2>

          {item.excerpt && (
            <p
              className="line-clamp-2"
              style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}
            >
              {item.excerpt}
            </p>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            {item.author && <span>{item.author.displayName}</span>}
            {item.category && <span>{item.category.name}</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {formatDate(item.publishedAt ?? item.createdAt)}
          </span>
        </div>
      </article>
    </Link>
  );
}

const MOCK_ARTICLES: ContentItem[] = POPULAR_ARTICLES.map((a, i) => ({
  id: a.id,
  slug: a.id,
  type: 'ARTICLE',
  status: 'PUBLISHED',
  title: a.title,
  excerpt: a.excerpt,
  coverImageUrl: null,
  isFeatured: false,
  publishedAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
  createdAt: new Date().toISOString(),
  author: null,
  category: null,
  tags: [],
}));

export default async function ArticlesPage() {
  let items: ContentItem[] = [];
  let total = 0;
  let fromApi = true;

  try {
    const result = await fetchContent({ type: 'ARTICLE', limit: 20 });
    items = result.items;
    total = result.total;
  } catch {
    items = MOCK_ARTICLES;
    total = MOCK_ARTICLES.length;
    fromApi = false;
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, height: 28, background: '#ec4899', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Статті
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
              Огляди, гайди та матеріали для гравців і майстрів
              {!fromApi && <span style={{ color: '#f59e0b', marginLeft: 8 }}>· Показано демо-дані</span>}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item) => (
              <ArticleCard key={item.id} item={item} />
            ))}
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <p>Статей поки немає</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
