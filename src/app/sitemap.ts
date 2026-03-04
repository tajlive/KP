import { MetadataRoute } from 'next';

const baseUrl = 'https://www.klarpakke.no';
const locales = ['no', 'en'];

// Main routes for all locales
const mainRoutes = [
  '',
  '/paper-trading',
  '/auto-trading-ai',
  '/auto-trading',
  '/kurs',
  '/kalkulator',
  '/leaderboard',
  '/leagues',
  '/om-oss',
  '/kontakt',
  '/personvern',
  '/vilkar',
  '/hjelp',
];

// Auth routes (lower priority)
const authRoutes = [
  '/login',
  '/signup',
  '/glemt-passord',
  '/reset-password',
];

// Dashboard routes (private, but good for SEO discovery)
const dashboardRoutes = [
  '/dashboard',
  '/dashboard/settings',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemap: MetadataRoute.Sitemap = [];
  const now = new Date();

  // Add main routes for each locale
  locales.forEach((locale) => {
    mainRoutes.forEach((route) => {
      const isHome = route === '';
      sitemap.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: now,
        changeFrequency: isHome ? 'daily' : 'weekly',
        priority: isHome ? 1.0 : 0.8,
      });
    });

    // Auth routes
    authRoutes.forEach((route) => {
      sitemap.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    });

    // Dashboard routes
    dashboardRoutes.forEach((route) => {
      sitemap.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    });
  });

  return sitemap;
}
