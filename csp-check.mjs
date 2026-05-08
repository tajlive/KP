import { chromium } from './node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage();

const cspErrors = [];
page.on('pageerror', err => {
  if (err.message.includes('Content Security Policy')) {
    cspErrors.push(err.message.slice(0, 120));
  }
});
page.on('console', msg => {
  if (msg.text().includes('Content Security Policy')) {
    cspErrors.push(msg.text().slice(0, 120));
  }
});

let cspHeader = null;
page.on('response', response => {
  if (response.url() === 'https://www.klarpakke.no/no') {
    cspHeader = response.headers()['content-security-policy'];
  }
});

await page.goto('https://www.klarpakke.no/no', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

console.log('CSP Header:', cspHeader?.slice(0, 200));
console.log('CSP Errors count:', cspErrors.length);
if (cspErrors.length > 0) {
  console.log('CSP Errors:');
  cspErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
}

await browser.close();
process.exit(cspErrors.length > 0 ? 1 : 0);
