import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ContentCard from '@/components/ContentCard';
import TopPicksPanel from '@/components/TopPicksPanel';
import MainFeed from '@/components/MainFeed';
import Sidebar from '@/components/Sidebar';
import SystemsGrid from '@/components/SystemsGrid';
import KitsGrid from '@/components/KitsGrid';
import HelpBlock from '@/components/HelpBlock';
import Footer from '@/components/Footer';
import { FEATURED_ARTICLE, TOP_ARTICLES } from '@/lib/mock-data';

export default function HomePage() {
  return (
    <>
      <Header />

      <main style={{ minHeight: '100vh' }}>
        {/* ── Hero zone ── */}
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '24px 24px 0',
          }}
        >
          {/* Hero + sidebar-preview grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 340px',
              gap: 20,
              marginBottom: 20,
            }}
          >
            <HeroSection article={FEATURED_ARTICLE} />

            {/* Right column: top picks (client component for hover) */}
            <TopPicksPanel articles={TOP_ARTICLES} />
          </div>

          {/* ── Top cards strip ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 40,
            }}
          >
            {TOP_ARTICLES.map((article) => (
              <ContentCard key={article.id} article={article} />
            ))}
          </div>
        </div>

        {/* ── Main content area ── */}
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 300px',
              gap: 32,
              marginBottom: 8,
            }}
          >
            <MainFeed />
            <Sidebar />
          </div>

          {/* ── Systems grid ── */}
          <SystemsGrid />

          {/* ── Kits grid ── */}
          <KitsGrid />

          {/* ── Help block ── */}
          <HelpBlock />
        </div>
      </main>

      <Footer />
    </>
  );
}
