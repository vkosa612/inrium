import type { Metadata } from 'next';
import LegalDraftPage, { LegalSection } from '@/components/LegalDraftPage';
import { CONTACTS } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Політика приватності (чернетка) — INRIUM',
  description: 'Чернетка політики приватності платформи INRIUM.',
  robots: { index: false, follow: true },
};

const OWNER_QUESTIONS = [
  'Хто є оператором (контролером) персональних даних: фізична особа чи юридична особа, повна назва та адреса?',
  'Яка юрисдикція та які закони про захист даних застосовуються (напр. GDPR, закон України про захист персональних даних)?',
  'Скільки часу зберігати неактивні акаунти, прострочені сесії та журнали запитів?',
  'Чи планується аналітика, реклама або сторонні віджети (тоді потрібні банер згоди та оновлення цього документа)?',
  'Через який поштовий сервіс (SMTP-провайдера) надсилаються листи, і де він зберігає дані?',
  'Де розміщений сервер і база даних (країна/хостинг)? Чи робляться резервні копії та як довго вони зберігаються?',
  'Яка адреса для запитів щодо доступу, виправлення та видалення даних?',
  'Чи є вікові обмеження для користувачів?',
];

export default function PrivacyPage() {
  return (
    <LegalDraftPage title="Політика приватності" ownerQuestions={OWNER_QUESTIONS}>
      <LegalSection title="1. Які дані ми збираємо">
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>
            <strong>Акаунт:</strong> електронна пошта, ім&apos;я для відображення, пароль (зберігається лише у вигляді
            хешу), роль, статус підтвердження пошти.
          </li>
          <li>
            <strong>Профіль (необов&apos;язково):</strong> короткий опис і посилання на аватар.
          </li>
          <li>
            <strong>Ігрова активність:</strong> створені вами ігри, заявки на участь і повідомлення до заявок,
            закладки.
          </li>
          <li>
            <strong>Технічні дані сесій:</strong> IP-адреса і User-Agent браузера прив&apos;язуються до сесії входу
            (для безпеки та відкликання сесій).
          </li>
          <li>
            <strong>Журнали сервера:</strong> службові журнали запитів із ідентифікатором запиту; адреси електронної
            пошти в журналах маскуються.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Cookie">
        <p>Платформа використовує лише технічно необхідні cookie; рекламних чи аналітичних cookie немає.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>
            <code>inrium_at</code> — короткоживучий токен доступу (HttpOnly).
          </li>
          <li>
            <code>inrium_rt</code> — токен оновлення сесії (HttpOnly, надсилається лише на <code>/api/auth</code>).
          </li>
          <li>
            <code>inrium_csrf</code> — службовий ідентифікатор захисту від міжсайтових запитів (HttpOnly).
          </li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Дані автентифікації не зберігаються в <code>localStorage</code>/<code>sessionStorage</code> браузера.
        </p>
      </LegalSection>

      <LegalSection title="3. Для чого використовуються дані">
        <p>
          Для створення та захисту акаунта, роботи ігрового функціоналу (заявки, набір гравців), надсилання службових
          листів (підтвердження пошти, скидання пароля) та запобігання зловживанням (обмеження частоти запитів, CAPTCHA).
        </p>
      </LegalSection>

      <LegalSection title="4. Видалення даних">
        <p>
          Ви можете видалити акаунт у профілі: разом з ним видаляються сесії, закладки, заявки та ігри, створені вами.
          Для інших запитів щодо даних зверніться за контактами нижче.
        </p>
      </LegalSection>

      <LegalSection title="5. Контакти з питань даних">
        <p>
          {CONTACTS.privacyEmail ? (
            <>
              Електронна пошта: <a href={`mailto:${CONTACTS.privacyEmail}`} style={{ color: '#f7971f' }}>{CONTACTS.privacyEmail}</a>
            </>
          ) : (
            <em>Адреса ще не вказана (власнику потрібно задати NEXT_PUBLIC_PRIVACY_EMAIL або NEXT_PUBLIC_CONTACT_EMAIL).</em>
          )}
        </p>
      </LegalSection>
    </LegalDraftPage>
  );
}
