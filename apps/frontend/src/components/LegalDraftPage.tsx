import type { ReactNode } from 'react';
import StaticInfoPage from '@/components/StaticInfoPage';
import { LEGAL } from '@/lib/site-config';

interface LegalDraftPageProps {
  title: string;
  /** Питання, на які має відповісти власник сайту (і, за потреби, юрист), перш ніж документ можна вважати чинним. */
  ownerQuestions: string[];
  children: ReactNode;
}

const sectionHeading: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text)',
  marginTop: 32,
  marginBottom: 10,
};

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={sectionHeading}>{title}</h2>
      {children}
    </section>
  );
}

/** Каркас юридичної сторінки-ЧЕРНЕТКИ: видимий статус, дані оператора та перелік відкритих питань. */
export default function LegalDraftPage({ title, ownerQuestions, children }: LegalDraftPageProps) {
  return (
    <StaticInfoPage title={title}>
      <div
        role="note"
        data-testid="legal-draft-banner"
        style={{
          padding: '14px 16px',
          marginBottom: 24,
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 8,
          color: '#fbbf24',
          fontSize: 14,
        }}
      >
        <strong>ЧЕРНЕТКА.</strong> Цей документ ще не затверджений власником сайту та не пройшов юридичну перевірку.
        Він описує, як платформа працює технічно, і не є юридичною консультацією або чинною офертою.
      </div>

      <p style={{ marginBottom: 8 }}>
        <strong>Оператор сайту:</strong>{' '}
        {LEGAL.operatorName ?? <em>не вказано (потрібно заповнити власнику)</em>}
      </p>
      {LEGAL.operatorAddress && (
        <p style={{ marginBottom: 8 }}>
          <strong>Адреса:</strong> {LEGAL.operatorAddress}
        </p>
      )}

      {children}

      <LegalSection title="Відкриті питання до власника сайту">
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ownerQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </LegalSection>
    </StaticInfoPage>
  );
}
