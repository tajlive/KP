import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto('https://www.klarpakke.no/no/login');
await p.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await p.fill('input[type="password"]', 'TestTest123!');
await p.click('button[type="submit"]');
await p.waitForTimeout(6000);
const r = await p.evaluate(async () => {
  const res = await fetch('/api/user/profile', {
    method: 'PATCH', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ risk_tolerance: 'advanced' }),
  });
  return { status: res.status, body: await res.json() };
});
console.log(JSON.stringify(r));
await b.close();
