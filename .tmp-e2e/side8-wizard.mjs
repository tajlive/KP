import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto('https://www.klarpakke.no/no/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(4000);
await p.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await p.fill('input[type="password"]', 'TestTest123!');
await p.click('button[type="submit"]');
await p.waitForTimeout(8000);
await p.goto('https://www.klarpakke.no/no/dashboard/auto-trade', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(5000);
// Steg 1: strategi valgt (DCA default) -> Neste
await p.click('button:has-text("Neste")');
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/s8-step2.png', fullPage: true });
// Steg 2 -> Neste
try {
  await p.click('button:has-text("Neste")', { timeout: 4000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/s8-step3.png', fullPage: true });
} catch (e) { console.log('STEG 3 ikke nådd:', e.message.slice(0, 60)); }
// Steg 3 -> Neste (oppsummering)
try {
  await p.click('button:has-text("Neste")', { timeout: 4000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/s8-step4.png', fullPage: true });
} catch (e) { console.log('STEG 4 ikke nådd:', e.message.slice(0, 60)); }
await b.close();
console.log('FERDIG');
