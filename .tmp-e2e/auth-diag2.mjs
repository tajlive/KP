import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('request', (req) => {
  const u = req.url();
  if (u.includes('trading_sessions') || u.includes('paper_accounts')) {
    const h = req.headers();
    const auth = h['authorization'] || '(ingen)';
    console.log('REQ', u.split('?')[0].split('/').pop());
    console.log('  apikey:', (h['apikey'] || '').slice(0, 25) + '...');
    console.log('  authorization:', auth.startsWith('Bearer') ? 'Bearer ' + auth.slice(7, 30) + '...' : auth);
  }
});
await page.goto('https://www.klarpakke.no/no/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await page.locator('input[type="password"]').first().fill('TestTest123!');
await page.waitForTimeout(1500);
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard**', { timeout: 30000 });
await page.waitForTimeout(9000);
// Dekode JWT payload for aa se rolle
const cookies = await page.context().cookies();
const sb = cookies.filter(c => c.name.startsWith('sb-')).map(c => c.name);
console.log('SB-COOKIES:', sb.join(', ') || 'INGEN');
await browser.close();
