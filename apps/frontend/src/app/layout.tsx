import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'INRIUM — платформа для настільних рольових ігор',
  description:
    'INRIUM — знаходь ігри, майстрів та спільноти для настільних рольових ігор.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
