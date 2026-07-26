import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.goto('https://www.klarpakke.no/no/login');
await p.fill('input[type="email"]', 'tomarnejensen@gmail.com');
await p.fill('input[type="password"]', 'TestTest123!');
await p.click('button[type="submit"]');
await p.waitForTimeout(6000);
console.log('URL:', p.url());
// 1. httpOnly-status på cookies
const cookies = await ctx.cookies('https://www.klarpakke.no');
for (const c of cookies.filter(c => c.name.includes('sb') || c.name.includes('auth'))) {
  console.log(`cookie ${c.name.slice(0,40)}: httpOnly=${c.httpOnly}`);
}
// 2. document.cookie (synlig for JS?)
const docCookie = await p.evaluate(() => document.cookie.slice(0, 200));
console.log('document.cookie:', docCookie || '(TOM)');
// 3. localStorage sb-nøkler
const ls = await p.evaluate(() => Object.keys(localStorage).filter(k => k.includes('sb') || k.includes('supabase')));
console.log('localStorage sb-*:', JSON.stringify(ls));
await b.close();
