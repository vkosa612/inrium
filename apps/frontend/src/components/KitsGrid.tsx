import { KITS } from '@/lib/mock-data';

export default function KitsGrid() {
  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
            Набори та ресурси
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Стартові набори, готові пригоди та матеріали для гри
          </p>
        </div>
        <a href="/kits" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          Всі набори →
        </a>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {KITS.map((kit) => (
          <a
            key={kit.id}
            href={`/kits/${kit.id}`}
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
            {/* Art */}
            <div
              className={`bg-gradient-to-br ${kit.gradient}`}
              style={{
                height: 64,
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 12px',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'rgba(139,92,246,0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139,92,246,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {kit.tag}
              </span>
            </div>

            <div style={{ padding: '14px 16px 16px' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                {kit.type}
              </span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4, marginBottom: 8 }}>
                {kit.title}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                {kit.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
