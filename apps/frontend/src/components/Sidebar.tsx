'use client';

import { POPULAR_TAGS, SIDEBAR_TOP_SYSTEMS, LATEST_NEWS } from '@/lib/mock-data';
import ContentCard from './ContentCard';

export default function Sidebar() {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top systems */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
            Топ систем тижня
          </h3>
        </div>
        <div style={{ padding: '4px 0' }}>
          {SIDEBAR_TOP_SYSTEMS.map((sys, idx) => (
            <a
              key={sys.name}
              href={`/systems/${sys.name.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: idx === 0 ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                  border: idx === 0 ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: idx === 0 ? '#c4b5fd' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{sys.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sys.count}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Теги</h3>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {POPULAR_TAGS.map((tag) => (
            <a
              key={tag}
              href={`/tag/${tag.toLowerCase()}`}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                textDecoration: 'none',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-dim)';
              }}
            >
              #{tag}
            </a>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Останні новини</h3>
        </div>
        <div style={{ padding: '4px 16px 8px' }}>
          {LATEST_NEWS.slice(0, 3).map((article) => (
            <ContentCard key={article.id} article={article} compact />
          ))}
        </div>
      </div>

      {/* Quick start */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.06) 100%)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 10,
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>🎲</div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
          Підбірка для старту
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          Не знаєш з чого почати? Відповідай на кілька питань і ми підберемо ідеальну систему.
        </p>
        <a
          href="/quiz"
          style={{
            display: 'block',
            padding: '9px 0',
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Пройти підбір
        </a>
      </div>
    </aside>
  );
}
