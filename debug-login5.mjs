import { chromium } from 'playwright';

const pw = process.env.PW;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const tokenCalls = [];
page.on('response', r => { if (r.url().includes('/auth/v1/token')) tokenCalls.push(r.status()); });
page.on('console', m => { if (m.type() === 'error') console.log('[cerr]', m.text().slice(0,200)); });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0,300)));

await page.goto('https://www.klarpakke.no/no/login?next=%2Fdashboard', { waitUntil: 'networkidle', timeout: 60000 });
await new Promise(r => setTimeout(r, 3000));

await page.locator('input[name="email"]').fill('tom@klarpakke.no');
await page.locator('input[name="password"]').fill(pw);

const t0 = Date.now();
await page.locator('button[type="submit"]').click();

for (let i = 0; i < 25; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const u = page.url();
  const err = await page.evaluate(() => document.querySelector('[data-testid="auth-error"]')?.innerText || null);
  console.log(`t+${((Date.now()-t0)/1000).toFixed(0)}s url=${u.slice(0,80)} err=${err} tokenCalls=${tokenCalls.join(',')}`);
  if (u.includes('dashboard')) { console.log('✅ REDIRECT OK'); break; }
}

const cookies = await page.context().cookies('https://www.klarpakke.no');
console.log('cookies:', cookies.map(c => c.name).join(', ') || '(ingen)');
await browser.close();
