import type { Article } from '@/lib/mock-data';
import { CATEGORY_STYLES } from '@/lib/mock-data';

interface ContentCardProps {
  article: Article;
  compact?: boolean;
}

export default function ContentCard({ article, compact = false }: ContentCardProps) {
  const catStyle = CATEGORY_STYLES[article.category];

  if (compact) {
    return (
      <a
        href={`/articles/${article.id}`}
        className="card-hover"
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        {/* Thumbnail */}
        <div
          className={`bg-gradient-to-br ${article.gradient}`}
          style={{
            width: 64,
            height: 64,
            borderRadius: 6,
            flexShrink: 0,
            border: '1px solid var(--border)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            className={catStyle}
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 3,
              border: '1px solid',
              display: 'inline-block',
              marginBottom: 5,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {article.category}
          </span>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#e2e8f0',
              lineHeight: 1.4,
              marginBottom: 4,
            }}
            className="line-clamp-2"
          >
            {article.title}
          </p>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {article.date} · {article.readTime}
          </span>
        </div>
      </a>
    );
  }

  return (
    <a
      href={`/articles/${article.id}`}
      className="card-hover"
      style={{
        display: 'block',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {/* Image placeholder */}
      <div
        style={{ position: 'relative', paddingTop: '56%', overflow: 'hidden' }}
      >
        <div
          className={`bg-gradient-to-br ${article.gradient}`}
          style={{ position: 'absolute', inset: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle at 30% 40%, rgba(139,92,246,0.1) 0%, transparent 60%)`,
          }}
        />
        {/* Category badge on image */}
        <span
          className={catStyle}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(12,12,20,0.6)',
          }}
        >
          {article.category}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#e2e8f0',
            lineHeight: 1.4,
            marginBottom: 8,
          }}
          className="line-clamp-2"
        >
          {article.title}
        </h3>
        <p
          style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}
          className="line-clamp-2"
        >
          {article.excerpt}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#475569' }}>
            {article.date}
          </span>
          <span style={{ fontSize: 12, color: '#475569' }}>
            {article.readTime} · {article.views ? article.views + ' переглядів' : ''}
          </span>
        </div>
      </div>
    </a>
  );
}
