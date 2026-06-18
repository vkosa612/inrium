import type { Metadata } from 'next';
import StaticInfoPage from '@/components/StaticInfoPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Реклама — INRIUM',
  description: 'Розміщення матеріалів та партнерство на INRIUM.',
};

export default function AdvertisePage() {
  return (
    <StaticInfoPage title="Реклама та партнерство">
      <p>
        INRIUM приймає партнерські матеріали про настільні RPG: нові системи, набори, події та клуби.
        Усі публікації проходять модерацію редакцією.
      </p>
      <p style={{ marginTop: 16 }}>
        Для обговорення розміщення напишіть на{' '}
        <a href="mailto:ads@inrium.local" style={{ color: '#f7971f' }}>ads@inrium.local</a>{' '}
        або скористайтесь сторінкою <a href="/contacts" style={{ color: '#f7971f' }}>Контакти</a>.
      </p>
    </StaticInfoPage>
  );
}
