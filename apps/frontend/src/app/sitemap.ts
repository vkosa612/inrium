import type { MetadataRoute } from 'next';
import { apiGetSitemap } from '@/lib/api';
import { SITE_URL } from '@/lib/site-config';

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/news`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/articles`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/systems`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/games`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/communities`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/help`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contacts`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/advertise`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const data = await apiGetSitemap();

    const contentUrls: MetadataRoute.Sitemap = data.content.map((c) => ({
      url: `${BASE_URL}/content/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const helpUrls: MetadataRoute.Sitemap = data.help.map((h) => ({
      url: `${BASE_URL}/help/${h.slug}`,
      lastModified: new Date(h.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

    const systemUrls: MetadataRoute.Sitemap = data.systems.map((s) => ({
      url: `${BASE_URL}/systems/${s.slug}`,
      lastModified: new Date(s.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

    const gameUrls: MetadataRoute.Sitemap = (data.games ?? []).map((g) => ({
      url: `${BASE_URL}/games/${g.slug}`,
      lastModified: new Date(g.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const communityUrls: MetadataRoute.Sitemap = (data.communities ?? []).map((c) => ({
      url: `${BASE_URL}/communities/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    return [
      ...staticPages,
      ...contentUrls,
      ...helpUrls,
      ...systemUrls,
      ...gameUrls,
      ...communityUrls,
    ];
  } catch {
    return staticPages;
  }
}
