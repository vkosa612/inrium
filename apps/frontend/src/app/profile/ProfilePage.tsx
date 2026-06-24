'use client';

import ProtectedRouteShell from '@/components/ProtectedRouteShell';
import ProfilePageClient from './ProfilePageClient';

export default function ProfilePage() {
  return (
    <ProtectedRouteShell requirement="AUTH">
      <ProfilePageClient />
    </ProtectedRouteShell>
  );
}
