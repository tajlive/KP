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
await p.waitForTimeout(6000);
// scroll til heatmap-tittel og ta skjermbilde av området
const heat = p.locator('text=Daglig P&L Heatmap').first();
await heat.scrollIntoViewIfNeeded();
await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/s7-heatmap.png' });
// scroll til risikonokkeltall
const risk = p.locator('text=Risikon').first();
try {
  await risk.scrollIntoViewIfNeeded({ timeout: 5000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/s7-risk.png' });
  console.log('RISK FUNNET');
} catch { console.log('RISK-TITTEL IKKE FUNNET'); }
await b.close();
console.log('FERDIG');
