import ProfilePageClient from './ProfilePageClient';

export const metadata = {
  title: 'Профіль — INRIUM',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
