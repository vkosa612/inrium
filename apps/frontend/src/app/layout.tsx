import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://inrium.ua';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'INRIUM — платформа для настільних рольових ігор',
    template: '%s — INRIUM',
  },
  description: 'INRIUM — знаходь ігри, ігрові системи, набори та матеріали для настільних рольових ігор.',
  openGraph: {
    siteName: 'INRIUM',
    type: 'website',
    locale: 'uk_UA',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    site: '@inrium_ua',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
