import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto('https://www.klarpakke.no/no/login');
await p.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await p.fill('input[type="password"]', 'TestTest123!');
await p.click('button[type="submit"]');
await p.waitForTimeout(6000);
// PATCH risikonivå + navn via sesjonen
const patch = await p.evaluate(async () => {
  const r = await fetch('/api/user/profile', {
    method: 'PATCH', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ risk_tolerance: 'advanced', full_name: 'Tom Jensen' }),
  });
  return { status: r.status, body: await r.json() };
});
console.log('PATCH:', patch.status, patch.body?.profile?.risk_tolerance, patch.body?.profile?.full_name);
// GET tilbake — verifiser persistert
const get = await p.evaluate(async () => {
  const r = await fetch('/api/user/profile', { credentials: 'same-origin' });
  return (await r.json())?.profile;
});
console.log('GET: risk_tolerance =', get?.risk_tolerance, '| full_name =', get?.full_name);
await b.close();
