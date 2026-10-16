import type { Metadata } from 'next';
import StaticInfoPage from '@/components/StaticInfoPage';
import { CONTACTS, telegramHref } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Контакти — INRIUM',
  description: 'Звʼязок з командою INRIUM.',
};

export default function ContactsPage() {
  const hasAnyContact = Boolean(CONTACTS.email || CONTACTS.telegram);

  return (
    <StaticInfoPage title="Контакти">
      <p>Маєте питання щодо платформи, контенту або співпраці?</p>
      {hasAnyContact ? (
        <ul style={{ marginTop: 16, paddingLeft: 20 }}>
          {CONTACTS.email && (
            <li>
              Електронна пошта:{' '}
              <a href={`mailto:${CONTACTS.email}`} style={{ color: '#f7971f' }}>{CONTACTS.email}</a>
            </li>
          )}
          {CONTACTS.telegram && (
            <li>
              Telegram:{' '}
              <a href={telegramHref(CONTACTS.telegram)} rel="noopener noreferrer" target="_blank" style={{ color: '#f7971f' }}>
                {CONTACTS.telegram}
              </a>
            </li>
          )}
        </ul>
      ) : (
        <p style={{ marginTop: 16 }}>
          Контактні дані ще не вказані. Власник сайту має задати їх у налаштуваннях розгортання
          (<code>NEXT_PUBLIC_CONTACT_EMAIL</code>, <code>NEXT_PUBLIC_CONTACT_TELEGRAM</code>).
        </p>
      )}
      <p style={{ marginTop: 16, fontSize: 13 }}>
        Для технічних питань self-hosted розгортання дивіться README у корені репозиторію.
      </p>
    </StaticInfoPage>
  );
}
