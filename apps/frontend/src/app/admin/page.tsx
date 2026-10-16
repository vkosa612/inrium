'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGetAdminStats, type AdminStats } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import { useAuth } from '@/context/AuthContext';
import { roleLabel } from '@/lib/labels';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
}

function buildStatCards(stats: AdminStats | null): StatCard[] {
  const fmt = (n: number | undefined | null) => (typeof n === 'number' ? String(n) : '—');
  const cards: StatCard[] = [
    { label: 'Матеріалів', value: fmt(stats?.content.total), icon: '📄', color: '#a78bfa' },
    { label: 'Новин', value: fmt(stats?.content.news), icon: '📰', color: '#f59e0b' },
    { label: 'Статей', value: fmt(stats?.content.articles), icon: '✍️', color: '#ec4899' },
    { label: 'Чернеток', value: fmt(stats?.content.drafts), icon: '📝', color: '#60a5fa' },
    { label: 'Ігрових систем', value: fmt(stats?.systems), icon: '🎲', color: '#34d399' },
    { label: 'Наборів', value: fmt(stats?.kits), icon: '📦', color: '#fbbf24' },
    { label: 'Ігор', value: fmt(stats?.games), icon: '🗓️', color: '#f472b6' },
  ];
  // Кількість акаунтів бачить лише адміністратор.
  if (stats?.users) {
    cards.push({ label: 'Користувачів', value: fmt(stats.users.total), icon: '👥', color: '#10b981' });
  }
  return cards;
}

const QUICK_LINKS = [
  { label: 'Контент', desc: 'Новини, статті та матеріали', href: '/admin/content', icon: '📋', soon: false },
  { label: 'Ігрові системи', desc: 'Огляди та описи систем', href: '/admin/systems', icon: '🎲', soon: false },
  { label: 'Набори', desc: 'Стартові набори та інструменти', href: '/admin/kits', icon: '📦', soon: false },
  { label: 'Користувачі', desc: 'Ролі та акаунти', href: '/admin/users', icon: '👤', soon: false },
  { label: 'Спільноти', desc: 'Керування спільнотами', href: '/admin/communities', icon: '👥', soon: false },
  { label: 'Головна сторінка', desc: 'Блоки та виділений контент', href: '/admin/home-blocks', icon: '🏠', soon: false },
];

// Розділи, доступні лише ADMIN (редактору не показуємо посилання, що ведуть на Доступ заборонено).
const ADMIN_ONLY_LINKS = new Set(['/admin/users', '/admin/communities']);

function AdminDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGetAdminStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStatsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;
  const statCards = buildStatCards(stats);

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

          {/* ── Page header ───────────────────────────────────────────── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ width: 3, height: 28, background: '#f59e0b', borderRadius: 2 }} />
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Адмін-панель
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#f59e0b',
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  padding: '2px 10px',
                  borderRadius: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {roleLabel(user.role)}
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Вітаємо, {user.displayName}. Управляйте контентом INRIUM.
            </p>
          </div>

          {/* ── Stats row ─────────────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 32,
            }}
          >
            {statCards.map((card) => (
              <div
                key={card.label}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '20px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <span style={{ fontSize: 28 }}>{card.icon}</span>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>
          {statsError && (
            <p role="alert" style={{ fontSize: 12, color: '#f87171', margin: '-20px 0 32px' }}>
              Не вдалося завантажити статистику. Спробуйте оновити сторінку.
            </p>
          )}

          {/* ── Quick links ───────────────────────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Розділи
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {QUICK_LINKS.filter((link) => user.role === 'ADMIN' || !ADMIN_ONLY_LINKS.has(link.href)).map((link) => {
                const inner = (
                  <>
                    {link.soon && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          background: 'var(--border)',
                          padding: '2px 8px',
                          borderRadius: 20,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Незабаром
                      </span>
                    )}
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{link.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                      {link.label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{link.desc}</div>
                  </>
                );
                const cardStyle = {
                  background: 'var(--bg-card)',
                  border: `1px solid ${link.soon ? 'var(--border)' : 'var(--border-bright)'}`,
                  borderRadius: 12,
                  padding: '20px',
                  opacity: link.soon ? 0.5 : 1,
                  cursor: link.soon ? 'default' : 'pointer',
                  textDecoration: 'none' as const,
                  display: 'block' as const,
                  position: 'relative' as const,
                };
                return link.soon ? (
                  <div key={link.label} style={cardStyle}>{inner}</div>
                ) : (
                  <Link key={link.label} href={link.href} style={cardStyle} className="card-hover">
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── CMS ready note ────────────────────────────────────────── */}
          <div
            style={{
              marginTop: 32,
              padding: '16px 20px',
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 12,
              fontSize: 13,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#10b981' }}>✓ CMS активна.</strong>{' '}
            Управляйте{' '}
            <Link href="/admin/content" style={{ color: '#10b981', textDecoration: 'underline' }}>контентом</Link>,{' '}
            <Link href="/admin/systems" style={{ color: '#a78bfa', textDecoration: 'underline' }}>ігровими системами</Link> та{' '}
            <Link href="/admin/kits" style={{ color: '#10b981', textDecoration: 'underline' }}>наборами</Link> через адмін-панель.
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AdminPage() {
  return (
    <AdminRouteShell requirement="ADMIN_OR_EDITOR">
      <AdminDashboardContent />
    </AdminRouteShell>
  );
}
