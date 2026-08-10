import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,300)); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e).slice(0,300)));

await page.goto('https://www.klarpakke.no/no/login', { waitUntil: 'networkidle', timeout: 60000 });
await new Promise(r => setTimeout(r, 8000));

const hyd = await page.evaluate(() => {
  const form = document.querySelector('form');
  // React 19 hydration check: se etter react fiber keys
  const anyEl = document.querySelector('button[type="submit"]');
  const hasReactProps = anyEl && Object.keys(anyEl).some(k => k.startsWith('__react'));
  return {
    formOnSubmit: !!form?.onsubmit,
    hasReactProps,
    scriptsLoaded: performance.getEntriesByType('resource').filter(r => r.name.includes('_next/static/chunks')).length,
    scriptsFailed: performance.getEntriesByType('resource').filter(r => r.name.includes('_next') && r.responseStatus >= 400).map(r => r.name.slice(-80)),
  };
});
console.log('HYDRATION:', JSON.stringify(hyd, null, 2));
console.log('ERRORS:', errors.slice(0, 10));

await browser.close();
