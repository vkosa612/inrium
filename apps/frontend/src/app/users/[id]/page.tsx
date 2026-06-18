import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { apiGetPublicUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Адміністратор',
  EDITOR: 'Редактор',
  GAME_MASTER: 'Майстер гри',
  PLAYER: 'Гравець',
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const user = await apiGetPublicUser(id);
    return { title: `${user.displayName} — INRIUM` };
  } catch {
    return { title: 'Профіль — INRIUM' };
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PublicUserPage({ params }: Props) {
  const { id } = await params;

  let user;
  try {
    user = await apiGetPublicUser(id);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f7971f, #ffd200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: '#0c0c14',
              flexShrink: 0,
            }}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              user.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>{user.displayName}</h1>
            <p style={{ margin: 0, color: '#f7971f', fontSize: 14 }}>{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
        </div>
        {user.bio && (
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-dim)', margin: 0 }}>{user.bio}</p>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          На платформі з {new Date(user.createdAt).toLocaleDateString('uk-UA')}
        </p>
      </main>
      <Footer />
    </>
  );
}
