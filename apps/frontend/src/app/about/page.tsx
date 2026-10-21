import type { Metadata } from 'next';
import StaticInfoPage from '@/components/StaticInfoPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {  title: 'Про нас — INRIUM',
  description: 'INRIUM — self-hosted платформа для настільних рольових ігор.',
};

export default function AboutPage() {
  return (
    <StaticInfoPage title="Про INRIUM">
      <p>
        INRIUM — платформа для гравців і майстрів настільних рольових ігор: новини, статті, довідка,
        каталоги систем, пошук ігрових сесій та спільнота навколо вашого столу.
      </p>
      <p style={{ marginTop: 16 }}>
        Проєкт розгортається self-hosted через Docker Compose: ви контролюєте дані, контент і доступ.
        Матеріали сайту публікуються через адмін-панель без змін у коді.
      </p>
    </StaticInfoPage>
  );
}
