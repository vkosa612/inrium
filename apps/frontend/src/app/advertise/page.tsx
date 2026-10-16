import type { Metadata } from 'next';
import Link from 'next/link';
import StaticInfoPage from '@/components/StaticInfoPage';
import { CONTACTS } from '@/lib/site-config';

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
        {CONTACTS.adsEmail ? (
          <>
            Для обговорення розміщення напишіть на{' '}
            <a href={`mailto:${CONTACTS.adsEmail}`} style={{ color: '#f7971f' }}>{CONTACTS.adsEmail}</a>{' '}
            або скористайтесь сторінкою{' '}
          </>
        ) : (
          <>Адреса для рекламних запитів ще не вказана. Скористайтесь сторінкою </>
        )}
        <Link href="/contacts" style={{ color: '#f7971f' }}>Контакти</Link>.
      </p>
    </StaticInfoPage>
  );
}
