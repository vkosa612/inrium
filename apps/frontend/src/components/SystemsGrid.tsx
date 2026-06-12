import type { GameSystem } from '@/lib/mock-data';
import { GAME_SYSTEMS } from '@/lib/mock-data';

const COMPLEXITY_COLOR: Record<GameSystem['complexity'], string> = {
  Легка: '#4ade80',
  Середня: '#fbbf24',
  Складна: '#f87171',
};

function SystemCard({ system }: { system: GameSystem }) {
  return (
    <div
      className="card-hover"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* System art */}
      <div
        className={`bg-gradient-to-br ${system.gradient}`}
        style={{
          height: 84,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(12,12,20,0.5) 100%)',
          }}
        />
        <span
          style={{
            position: 'relative',
            fontSize: 13,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '0 12px',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {system.name}
        </span>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 3,
              background: 'rgba(139,92,246,0.12)',
              color: '#a78bfa',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            {system.genre}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {system.players} гравців
          </span>
        </div>

        <p
          style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}
          className="line-clamp-3"
        >
          {system.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: COMPLEXITY_COLOR[system.complexity] }}>
            ● {system.complexity}
          </span>
          <a
            href={`/systems/${system.id}`}
            style={{
              fontSize: 12,
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Детальніше →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SystemsGrid() {
  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
            Ігрові системи
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Популярні системи з базою знань та матеріалами
          </p>
        </div>
        <a href="/systems" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          Всі системи →
        </a>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {GAME_SYSTEMS.map((system) => (
          <SystemCard key={system.id} system={system} />
        ))}
      </div>
    </section>
  );
}
