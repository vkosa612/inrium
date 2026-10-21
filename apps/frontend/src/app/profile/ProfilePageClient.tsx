'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/context/AuthContext';
import {
  apiChangePassword,
  apiDeleteMyAccount,
  apiGetBookmarks,
  apiGetMe,
  apiGetMyApplications,
  apiRemoveBookmark,
  apiUpdateProfile,
  resolveMediaUrl,
  type AuthUser,
  type BookmarkItem,
  type MyGameApplication,
} from '@/lib/api';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, formatGameDate } from '@/lib/game-labels';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Адміністратор',
  EDITOR: 'Редактор',
  GAME_MASTER: 'Майстер гри',
  PLAYER: 'Гравець',
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#f59e0b',
  EDITOR: '#22d3ee',
  GAME_MASTER: '#10b981',
  PLAYER: '#a78bfa',
};

const TYPE_LABEL: Record<string, string> = {
  CONTENT: 'Матеріал',
  HELP: 'Довідка',
  SYSTEM: 'Система',
  KIT: 'Набір',
};

const inputStyle = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 14,
  padding: '10px 14px',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  display: 'block' as const,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-dim)',
  marginBottom: 6,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLOR[role] ?? '#a78bfa';
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      color, background: `${color}18`, border: `1px solid ${color}35`,
      padding: '4px 12px', borderRadius: 20,
    }}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

export default function ProfilePageClient() {
  const { user: ctxUser, updateUser, logout } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [applications, setApplications] = useState<MyGameApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!ctxUser) return;

    Promise.all([apiGetMe(), apiGetBookmarks(), apiGetMyApplications()])
      .then(([fresh, bms, apps]) => {
        setUser(fresh);
        setDisplayName(fresh.displayName);
        setBio(fresh.bio ?? '');
        setAvatarUrl(fresh.avatarUrl ?? '');
        setBookmarks(bms);
        setApplications(apps);
      })
      .catch(() => {
        setUser(ctxUser);
        setDisplayName(ctxUser.displayName);
        setBio(ctxUser.bio ?? '');
        setAvatarUrl(ctxUser.avatarUrl ?? '');
        setError('Не вдалося завантажити профіль');
      })
      .finally(() => setLoading(false));
  }, [ctxUser]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess('');
    setError('');
    try {
      const updated = await apiUpdateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      setUser(updated);
      updateUser(updated);
      setProfileSuccess('Профіль збережено');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      const res = await apiChangePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(async () => {
        await logout();
        router.replace('/login');
      }, 1500);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Помилка зміни пароля');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm('Ви точно хочете назавжди видалити акаунт?')) return;

    setDeleteSaving(true);
    setDeleteError('');
    try {
      await apiDeleteMyAccount({
        password: deletePassword,
        confirmation: deleteConfirmation,
      });
      await logout(); // cookie очищає сервер; повідомляємо інші вкладки
      sessionStorage.setItem('inrium_flash_message', 'Акаунт видалено.');
      router.replace('/login');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Не вдалося видалити акаунт');
    } finally {
      setDeleteSaving(false);
    }
  }

  async function handleRemoveBookmark(id: string) {
    try {
      await apiRemoveBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити закладку');
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Завантаження профілю…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) return null;

  const avatarSrc = resolveMediaUrl(user.avatarUrl);
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 3, height: 28, background: 'var(--accent)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Профіль</h1>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* Summary card */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
            padding: '24px 28px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center',
          }}>
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: `${ROLE_COLOR[user.role] ?? 'var(--accent)'}20`,
                border: `2px solid ${ROLE_COLOR[user.role] ?? 'var(--accent)'}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: ROLE_COLOR[user.role] ?? 'var(--accent)',
              }}>
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{user.displayName}</h2>
                <RoleBadge role={user.role} />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{user.email}</p>
              {user.bio && <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.6 }}>{user.bio}</p>}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>З нами з {joinedDate}</p>
            </div>
          </div>

          {/* Edit profile */}
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Редагування профілю</h3>
            <form onSubmit={(e) => void handleProfileSave(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Ім&apos;я для відображення</label>
                <input style={inputStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={64} />
              </div>
              <div>
                <label style={labelStyle}>Про себе</label>
                <textarea style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Коротко про себе (необов'язково)" />
              </div>
              <ImageUpload label="Аватар" value={avatarUrl} onChange={setAvatarUrl} />
              {profileSuccess && (
                <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>
                  {profileSuccess}
                </div>
              )}
              <button type="submit" disabled={profileSaving} style={{
                alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 8, border: 'none',
                background: profileSaving ? 'rgba(245,158,11,0.4)' : '#f59e0b', color: '#111',
                fontWeight: 700, fontSize: 14, cursor: profileSaving ? 'wait' : 'pointer',
              }}>
                {profileSaving ? 'Зберігаю…' : 'Зберегти профіль'}
              </button>
            </form>
          </section>

          {/* Change password */}
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Зміна пароля</h3>
            <form onSubmit={(e) => void handlePasswordChange(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Поточний пароль</label>
                <input type="password" style={inputStyle} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <div>
                <label style={labelStyle}>Новий пароль</label>
                <input type="password" style={inputStyle} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Мін. 8 символів, літера та цифра</p>
              </div>
              {passwordError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>
                  {passwordSuccess}
                </div>
              )}
              <button type="submit" disabled={passwordSaving} style={{
                alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-dim)', fontWeight: 600, fontSize: 14,
                cursor: passwordSaving ? 'wait' : 'pointer',
              }}>
                {passwordSaving ? 'Змінюю…' : 'Змінити пароль'}
              </button>
            </form>
          </section>

          {/* Game applications */}
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Мої заявки на ігри</h3>
              {applications.length > 0 && (
                <Link href="/my/applications" style={{ fontSize: 13, color: '#10b981', textDecoration: 'none' }}>Усі →</Link>
              )}
            </div>
            {applications.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                Ви ще не подавали заявок. Перегляньте <Link href="/games" style={{ color: '#10b981' }}>відкриті ігри</Link>.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {applications.slice(0, 5).map((app) => {
                  const color = APPLICATION_STATUS_COLOR[app.status] ?? '#6b7280';
                  return (
                    <li key={app.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <Link href={`/games/${app.game.slug}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none', fontSize: 14 }}>
                        {app.game.title}
                      </Link>
                      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ color, fontWeight: 600 }}>{APPLICATION_STATUS_LABEL[app.status]}</span>
                        <span>{formatGameDate(app.game.startsAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {(user.role === 'GAME_MASTER' || user.role === 'ADMIN') && (
              <Link href="/my/games" style={{
                display: 'inline-block', marginTop: 16, fontSize: 14, color: '#10b981', fontWeight: 600, textDecoration: 'none',
              }}>
                Керувати моїми іграми →
              </Link>
            )}
          </section>

          {/* Bookmarks */}
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Збережене</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Матеріали, довідка та системи, які ви зберегли</p>

            {bookmarks.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Поки немає збережених матеріалів. Відкрийте статтю, довідку або систему і натисніть «Зберегти».</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bookmarks.map((bm) => (
                  <li key={bm.id} style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                    padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                        {TYPE_LABEL[bm.targetType] ?? bm.targetType}
                      </span>
                      {bm.unavailable ? (
                        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Матеріал недоступний або видалений
                        </p>
                      ) : (
                        <>
                          <Link href={bm.url ?? '#'} style={{ display: 'block', marginTop: 4, fontSize: 15, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                            {bm.title}
                          </Link>
                          {bm.excerpt && (
                            <p className="line-clamp-2" style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>{bm.excerpt}</p>
                          )}
                        </>
                      )}
                    </div>
                    <button type="button" onClick={() => void handleRemoveBookmark(bm.id)} style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                    }}>
                      Видалити
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Delete account */}
          <section style={{
            background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 16, padding: '24px 28px', marginBottom: 20,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Видалення акаунта</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Ця дія повністю видалить ваш акаунт і пов&apos;язані персональні дані. Відновити акаунт буде неможливо.
            </p>
            <form onSubmit={(e) => void handleDeleteAccount(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Поточний пароль</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label style={labelStyle}>Підтвердження</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  required
                  placeholder="ВИДАЛИТИ"
                  autoComplete="off"
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Введіть ВИДАЛИТИ для підтвердження
                </p>
              </div>
              {deleteError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
                  {deleteError}
                </div>
              )}
              <button type="submit" disabled={deleteSaving} style={{
                alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)',
                color: '#f87171', fontWeight: 700, fontSize: 14,
                cursor: deleteSaving ? 'wait' : 'pointer',
              }}>
                {deleteSaving ? 'Видаляю…' : 'Видалити акаунт'}
              </button>
            </form>
          </section>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(user.role === 'ADMIN' || user.role === 'EDITOR') && (
              <Link href="/admin" style={{
                padding: '10px 20px', borderRadius: 8, background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', textDecoration: 'none',
                fontSize: 14, fontWeight: 600,
              }}>
                Адмін-панель
              </Link>
            )}
            <button type="button" onClick={() => void logout().then(() => router.push('/'))} style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
              background: 'transparent', color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Вийти
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
