'use client';

import { HELP_ITEMS } from '@/lib/mock-data';

export default function HelpBlock() {
  return (
    <section
      style={{
        marginTop: 48,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '20px 24px',
          background: 'linear-gradient(90deg, rgba(139,92,246,0.08) 0%, transparent 60%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
            Допомога для новачків
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Все що потрібно, щоб розпочати свою першу пригоду
          </p>
        </div>
        <a
          href="/help"
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Усі гайди
        </a>
      </div>

      {/* Items */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 0,
        }}
      >
        {HELP_ITEMS.map((item, idx) => (
          <a
            key={item.id}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '20px 24px',
              borderRight: idx < HELP_ITEMS.length - 1 ? '1px solid var(--border)' : 'none',
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
            <span style={{ fontSize: 28 }}>{item.icon}</span>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {item.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
