import type { Metadata } from 'next';
import StaticInfoPage from '@/components/StaticInfoPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Контакти — INRIUM',
  description: 'Звʼязок з командою INRIUM.',
};

export default function ContactsPage() {
  return (
    <StaticInfoPage title="Контакти">
      <p>Маєте питання щодо платформи, контенту або співпраці?</p>
      <ul style={{ marginTop: 16, paddingLeft: 20 }}>
        <li>Email: <a href="mailto:hello@inrium.local" style={{ color: '#f7971f' }}>hello@inrium.local</a></li>
        <li>Telegram: @inrium_support</li>
      </ul>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        Для технічних питань self-hosted розгортання дивіться README у корені репозиторію.
      </p>
    </StaticInfoPage>
  );
}
