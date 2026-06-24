'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CommunityForm from '@/components/admin/CommunityForm';
import { apiGetAdminCommunities, type Community } from '@/lib/api';

export default function AdminCommunityEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAdminCommunities()
      .then((list) => {
        const found = list.find((c) => c.id === id) ?? null;
        if (!found) router.replace('/admin/communities');
        setCommunity(found);
      })
      .catch(() => router.replace('/admin/communities'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Завантаження…</div>;
  if (!community) return null;

  return <CommunityForm initial={community} />;
}
