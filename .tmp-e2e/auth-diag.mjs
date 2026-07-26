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
const storage = await page.evaluate(() => {
  const keys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-') || k.includes('auth'));
  const out = {};
  for (const k of keys) out[k] = (localStorage.getItem(k) || '').slice(0, 120);
  return out;
});
console.log(JSON.stringify(storage, null, 2));
await browser.close();
