import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
let capturedAuth = null;
page.on('request', (req) => {
  if (req.url().includes('trading_sessions')) capturedAuth = req.headers()['authorization'];
});
await page.goto('https://www.klarpakke.no/no/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await page.locator('input[type="password"]').first().fill('TestTest123!');
await page.waitForTimeout(1500);
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard**', { timeout: 30000 });
await page.waitForTimeout(9000);
if (capturedAuth) {
  const jwt = capturedAuth.replace('Bearer ', '');
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
  console.log('JWT sub:', payload.sub);
  console.log('JWT role:', payload.role);
  console.log('JWT exp:', new Date(payload.exp * 1000).toISOString(), '(nå:', new Date().toISOString() + ')');
}
await browser.close();
