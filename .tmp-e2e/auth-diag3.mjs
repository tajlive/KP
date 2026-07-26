import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('request', (req) => {
  if (req.url().includes('trading_sessions')) console.log('FULL:', req.url().replace(/user_id=eq\.[^&]+/, 'user_id=eq.<UID>'));
});
await page.goto('https://www.klarpakke.no/no/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await page.locator('input[type="password"]').first().fill('TestTest123!');
await page.waitForTimeout(1500);
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard**', { timeout: 30000 });
await page.waitForTimeout(9000);
await browser.close();
