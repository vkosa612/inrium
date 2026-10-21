import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchPageClient from './SearchPageClient';

export const metadata: Metadata = {
  title: 'Пошук — INRIUM',
  description: 'Пошук по ігрових системах, матеріалах та довідці INRIUM',
  robots: { index: false, follow: false },
};

export default function SearchPage() {
  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <SearchPageClient />
      </main>
      <Footer />
    </>
  );
}
