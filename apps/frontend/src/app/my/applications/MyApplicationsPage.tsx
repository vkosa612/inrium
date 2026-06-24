'use client';

import ProtectedRouteShell from '@/components/ProtectedRouteShell';
import MyApplicationsPageClient from './MyApplicationsPageClient';

export default function MyApplicationsPage() {
  return (
    <ProtectedRouteShell requirement="AUTH">
      <MyApplicationsPageClient />
    </ProtectedRouteShell>
  );
}
