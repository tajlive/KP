import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto('https://www.klarpakke.no/no/login');
await p.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await p.fill('input[type="password"]', 'TestTest123!');
await p.click('button[type="submit"]');
await p.waitForTimeout(5000);
for (const [url, name] of [['https://www.klarpakke.no/no/profile', 's13-profile'], ['https://www.klarpakke.no/no/dashboard/profile', 's13-dashprofile']]) {
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  console.log(name, '->', p.url());
  await p.screenshot({ path: `/tmp/${name}.png` });
}
await b.close();
