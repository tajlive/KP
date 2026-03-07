import { MetadataRoute } from 'next';

const baseUrl = 'https://www.klarpakke.no';

// Norwegian routes (default - no prefix)
const noRoutes = [
  '',
  '/paper-trading',
  '/kurs',
  '/kalkulator',
  '/leaderboard',
  '/leagues',
  // REMOVED: '/om-oss',
  '/kontakt',
  '/personvern',
  '/vilkar',
  '/priser',
];

// English routes (/en/ prefix)
const enRoutes = [
  '/en',
  '/en/paper-trading',
  '/en/courses',
  '/en/calculator',
  '/en/leaderboard',
  '/en/leagues',
  '/en/about',
  '/en/contact',
  '/en/privacy',
  '/en/terms',
  '/en/pricing',
];

// Static pages (lower priority)
const staticRoutes = [
  '/hjelp',
  '/en/help',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemap: MetadataRoute.Sitemap = [];
  const now = new Date();

  // Norwegian routes (default locale, no prefix)
  noRoutes.forEach((route) => {
    const isHome = route === '';
    sitemap.push({
      url: `${baseUrl}${route}`,
      lastModified: now,
      changeFrequency: isHome ? 'daily' : 'weekly',
      priority: isHome ? 1.0 : 0.8,
    });
  });

  // English routes
  enRoutes.forEach((route) => {
    const isHome = route === '/en';
    sitemap.push({
      url: `${baseUrl}${route}`,
      lastModified: now,
      changeFrequency: isHome ? 'daily' : 'weekly',
      priority: isHome ? 0.9 : 0.7,
    });
  });

  // Static routes
  staticRoutes.forEach((route) => {
    sitemap.push({
      url: `${baseUrl}${route}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  });

  return sitemap;
}
