import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto('https://www.klarpakke.no/no/login');
await p.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await p.fill('input[type="password"]', 'TestTest123!');
await p.click('button[type="submit"]');
await p.waitForTimeout(5000);
for (const url of ['/no/profile', '/no/profile?tab=profile', '/no/profile?tab=wallet']) {
  await p.goto('https://www.klarpakke.no' + url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);
  console.log(url, '->', p.url());
}
await p.screenshot({ path: '/tmp/s13c.png' });
await b.close();
