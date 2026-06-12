'use client';

import type { Article } from '@/lib/mock-data';

interface TopPicksPanelProps {
  articles: Article[];
}

export default function TopPicksPanel({ articles }: TopPicksPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Вибір редакції
      </div>
      {articles.slice(0, 3).map((article) => (
        <a
          key={article.id}
          href={`/articles/${article.id}`}
          style={{
            display: 'flex',
            gap: 10,
            textDecoration: 'none',
            color: 'inherit',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px',
            transition: 'border-color 0.15s',
            flex: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-bright)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
          }}
        >
          <div
            className={`bg-gradient-to-br ${article.gradient}`}
            style={{
              width: 56,
              height: 56,
              borderRadius: 6,
              flexShrink: 0,
              border: '1px solid var(--border)',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#e2e8f0',
                lineHeight: 1.4,
                marginBottom: 4,
              }}
              className="line-clamp-2"
            >
              {article.title}
            </p>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{article.date}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
