'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import CommunityForm from '@/components/admin/CommunityForm';
import { apiGetAdminCommunities, type Community } from '@/lib/api';

function EditCommunityLoader() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGetAdminCommunities()
      .then((list) => {
        const found = list.find((c) => c.id === id) ?? null;
        if (!found) {
          setError('Спільноту не знайдено.');
          return;
        }
        setCommunity(found);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Помилка завантаження');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminRouteShell requirement="ADMIN">
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Завантаження…
        </div>
      </AdminRouteShell>
    );
  }

  if (error || !community) {
    return (
      <AdminRouteShell requirement="ADMIN">
        <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Спільноту не знайдено.'}</p>
          <button
            type="button"
            onClick={() => router.push('/admin/communities')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            ← До списку спільнот
          </button>
        </div>
      </AdminRouteShell>
    );
  }

  return <CommunityForm initial={community} />;
}

export default function AdminCommunityEditPage() {
  return <EditCommunityLoader />;
}
