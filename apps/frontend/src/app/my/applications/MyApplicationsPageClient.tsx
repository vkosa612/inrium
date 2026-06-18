'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { apiGetMyApplications, type MyGameApplication } from '@/lib/api';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, formatGameDate } from '@/lib/game-labels';

export default function MyApplicationsPageClient() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<MyGameApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setApplications(await apiGetMyApplications());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити заявки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/my/applications');
      return;
    }
    void load();
  }, [user, authLoading, router, load]);

  if (authLoading || !user) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Завантаження…</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Мої заявки</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>Ігрові сесії, на які ви подали заявку</p>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Завантаження…</p>
        ) : applications.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>
            Ви ще не подавали заявок. Перегляньте{' '}
            <Link href="/games" style={{ color: '#10b981' }}>відкриті ігри</Link>.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {applications.map((app) => {
              const color = APPLICATION_STATUS_COLOR[app.status] ?? '#6b7280';
              return (
                <li key={app.id} style={{
                  padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <Link href={`/games/${app.game.slug}`} style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
                        {app.game.title}
                      </Link>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                        Майстер: {app.game.master.displayName} · {formatGameDate(app.game.startsAt)}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 12, height: 'fit-content', color, background: `${color}18`, border: `1px solid ${color}35` }}>
                      {APPLICATION_STATUS_LABEL[app.status]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
