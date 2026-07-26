import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://www.klarpakke.no/no/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await page.locator('input[type="password"]').first().fill('TestTest123!');
await page.waitForTimeout(1500);
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard**', { timeout: 30000 });
await page.waitForTimeout(6000);
const cookies = await page.context().cookies('https://www.klarpakke.no');
for (const c of cookies.filter(c => c.name.startsWith('sb-'))) {
  console.log('COOKIE:', c.name, '| httpOnly:', c.httpOnly, '| sameSite:', c.sameSite, '| domain:', c.domain, '| value-len:', c.value.length, '| value-start:', decodeURIComponent(c.value).slice(0, 40));
}
const docCookies = await page.evaluate(() => document.cookie.split(';').map(s => s.trim().split('=')[0]).join(', '));
console.log('document.cookie:', docCookies || '(TOM)');
await browser.close();
