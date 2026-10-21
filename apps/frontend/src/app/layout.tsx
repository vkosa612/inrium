import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SITE_URL } from '@/lib/site-config';

const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'INRIUM — платформа для настільних рольових ігор',
    template: '%s — INRIUM',
  },
  description: 'INRIUM — знаходь ігри, ігрові системи та матеріали для настільних рольових ігор.',
  openGraph: {
    siteName: 'INRIUM',
    type: 'website',
    locale: 'uk_UA',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
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
