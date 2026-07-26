import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('response', async (res) => {
  const u = res.url();
  if (u.includes('trading_sessions') || u.includes('/trades') || u.includes('paper_accounts')) {
    let body = '';
    try { body = (await res.text()).slice(0, 220); } catch {}
    console.log('SB', res.status(), u.split('?')[0].split('/').pop(), u.includes('archived') ? '(archived-filter)' : '', '=>', body.replace(/\n/g, ' '));
  }
});
await page.goto('https://www.klarpakke.no/no/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await page.locator('input[type="password"]').first().fill('TestTest123!');
await page.waitForTimeout(1500);
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard**', { timeout: 30000 });
await page.waitForTimeout(10000);
await browser.close();
console.log('FERDIG');
