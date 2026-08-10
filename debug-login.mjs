import { chromium } from 'playwright';

const email = 'tom@klarpakke.no';
const pw = process.env.PW;
const base = 'https://www.klarpakke.no';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console.'+m.type()+']', m.text().slice(0,200)); });
page.on('response', r => { if (r.url().includes('token') || r.url().includes('dashboard') || r.url().includes('login')) console.log('[resp]', r.status(), r.url().slice(0,120)); });
page.on('requestfailed', r => console.log('[reqfail]', r.url().slice(0,120), r.failure()?.errorText));

await page.goto(base + '/no/login?next=' + encodeURIComponent('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log('login page loaded:', page.url());

await page.locator('input[name="email"]').first().fill(email);
await page.locator('input[name="password"]').first().fill(pw);
console.log('filled, clicking submit…');

const t0 = Date.now();
await page.locator('button[type="submit"]').first().click();

// Poll URL every 2s for 60s
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const u = page.url();
  console.log(`t+${((Date.now()-t0)/1000).toFixed(0)}s url=${u}`);
  if (u.includes('dashboard')) { console.log('✅ REDIRECTED'); break; }
}

const cookies = await page.context().cookies();
console.log('cookies after login:', cookies.map(c => `${c.name} (domain=${c.domain} httpOnly=${c.httpOnly})`).join('\n  '));

await browser.close();
