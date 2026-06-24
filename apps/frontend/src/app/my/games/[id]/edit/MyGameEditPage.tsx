'use client';

import ProtectedRouteShell from '@/components/ProtectedRouteShell';
import MyGameEditPageClient from './MyGameEditPageClient';

interface Props {
  id: string;
}

function MyGameEditPageInner({ id }: Props) {
  return (
    <ProtectedRouteShell requirement="GAME_MASTER_OR_ADMIN">
      <MyGameEditPageClient id={id} />
    </ProtectedRouteShell>
  );
}

export default MyGameEditPageInner;
