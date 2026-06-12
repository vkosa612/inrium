import type { Article } from '@/lib/mock-data';
import { CATEGORY_STYLES } from '@/lib/mock-data';

interface HeroSectionProps {
  article: Article;
}

export default function HeroSection({ article }: HeroSectionProps) {
  const catStyle = CATEGORY_STYLES[article.category];

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        minHeight: 420,
        display: 'flex',
        alignItems: 'flex-end',
        cursor: 'pointer',
      }}
    >
      {/* Background gradient art */}
      <div
        className={`bg-gradient-to-br ${article.gradient}`}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Decorative shapes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 60%, rgba(6, 182, 212, 0.08) 0%, transparent 40%)
          `,
        }}
      />

      {/* Subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Bottom gradient overlay */}
      <div className="gradient-overlay" style={{ position: 'absolute', inset: 0 }} />

      {/* FEATURED label */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '4px 10px',
          borderRadius: 4,
          textTransform: 'uppercase',
        }}
      >
        FEATURED
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '32px 32px 28px' }}>
        {/* Category */}
        <span
          className={catStyle}
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 4,
            border: '1px solid',
            marginBottom: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {article.category}
        </span>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(22px, 4vw, 34px)',
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: 14,
            color: '#f1f5f9',
            maxWidth: 700,
          }}
        >
          {article.title}
        </h1>

        {/* Excerpt */}
        <p
          style={{
            fontSize: 15,
            color: '#94a3b8',
            lineHeight: 1.6,
            marginBottom: 20,
            maxWidth: 600,
          }}
          className="line-clamp-2"
        >
          {article.excerpt}
        </p>

        {/* Meta + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>{article.date}</span>
            <span>·</span>
            <span>{article.readTime} читання</span>
            {article.views && (
              <>
                <span>·</span>
                <span>{article.views} переглядів</span>
              </>
            )}
          </div>
          <a
            href={`/articles/${article.id}`}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              transition: 'background-color 0.15s',
            }}
          >
            Читати →
          </a>
        </div>
      </div>
    </div>
  );
}
