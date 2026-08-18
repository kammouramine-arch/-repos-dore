import type { MetadataRoute } from 'next';
import { SEO_PAGES } from '@/content/seo-pages';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ['', '/tarifs', '/confidentialite', '/conditions', '/cookies'];

  return [
    ...staticRoutes.map((route) => ({
      url: `${APP_URL}${route}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.7,
    })),
    ...SEO_PAGES.map((page) => ({
      url: `${APP_URL}/${page.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
