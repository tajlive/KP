import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto('https://www.klarpakke.no/no/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(4000);
await p.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await p.fill('input[type="password"]', 'TestTest123!');
await p.click('button[type="submit"]');
await p.waitForTimeout(8000);
await p.goto('https://www.klarpakke.no/no/dashboard/analysis', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(5000);
// klikk accordion
try {
  await p.click('text=Avansert analyse', { timeout: 5000 });
  console.log('KLIKKET ACCORDION');
} catch (e) { console.log('ACCORDION-KLIKK FEILET:', e.message.slice(0, 80)); }
await p.waitForTimeout(4000);
await p.screenshot({ path: '/tmp/s7-expanded.png', fullPage: true });
const h = await p.evaluate(() => document.body.scrollHeight);
console.log('SCROLLHEIGHT:', h);
// evt. synlige feil i konsoll
await b.close();
