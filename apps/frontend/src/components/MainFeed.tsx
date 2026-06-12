import { LATEST_NEWS, POPULAR_ARTICLES } from '@/lib/mock-data';
import ContentCard from './ContentCard';

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '2px solid var(--border)',
      }}
    >
      <h2
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 4,
            height: 18,
            borderRadius: 2,
            background: 'var(--accent)',
            display: 'inline-block',
          }}
        />
        {title}
      </h2>
      <a
        href={href}
        style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
      >
        Всі →
      </a>
    </div>
  );
}

export default function MainFeed() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Latest news */}
      <section>
        <SectionHeader title="Останні новини" href="/news" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {LATEST_NEWS.map((article) => (
            <ContentCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      {/* Popular articles */}
      <section>
        <SectionHeader title="Популярні статті" href="/articles" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {POPULAR_ARTICLES.map((article) => (
            <ContentCard key={article.id} article={article} compact />
          ))}
        </div>
      </section>
    </div>
  );
}
