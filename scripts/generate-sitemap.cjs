const fs = require('fs');
const path = require('path');

const baseUrl = 'https://www.klarpakke.no';
const pages = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/no', priority: '1.0', changefreq: 'daily' },
  { url: '/no/priser', priority: '0.9', changefreq: 'weekly' },
  { url: '/no/om-oss', priority: '0.8', changefreq: 'monthly' },
  { url: '/no/innlogging', priority: '0.9', changefreq: 'weekly' },
  { url: '/no/registrer', priority: '0.9', changefreq: 'weekly' },
  { url: '/personvern', priority: '0.7', changefreq: 'monthly' },
  { url: '/vilkar', priority: '0.7', changefreq: 'monthly' },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), sitemap);
console.log('✅ Sitemap generated successfully');
