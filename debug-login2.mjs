import { chromium } from 'playwright';

const pw = process.env.PW;
const base = 'https://www.klarpakke.no';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(base + '/no/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

// Sjekk JS-hydration og form-tilstand
const info = await page.evaluate(() => {
  const form = document.querySelector('form');
  return {
    hasForm: !!form,
    formMethod: form?.method,
    formAction: form?.action,
    formOnSubmit: !!form?.onsubmit,
    reactHydrated: !!document.querySelector('[data-reactroot], #__next'),
    nextDataScripts: document.querySelectorAll('script[src*="_next/static"]').length,
    bodyClasses: document.body.className,
  };
});
console.log('FORM INFO:', JSON.stringify(info, null, 2));

// Lytt til submit-event
await page.evaluate(() => {
  window.__submitFired = false;
  document.querySelector('form')?.addEventListener('submit', (e) => {
    window.__submitFired = true;
    window.__submitDefaultPrevented = e.defaultPrevented;
  }, { capture: true });
});

await page.locator('input[name="email"]').first().fill('tom@klarpakke.no');
await page.locator('input[name="password"]').first().fill(pw);

// Sjekk verdier før klikk
const vals = await page.evaluate(() => ({
  email: document.querySelector('input[name="email"]')?.value,
  pwLen: document.querySelector('input[name="password"]')?.value?.length,
}));
console.log('VALUES:', JSON.stringify(vals));

await page.locator('button[type="submit"]').first().click();
await new Promise(r => setTimeout(r, 4000));

const after = await page.evaluate(() => ({
  submitFired: window.__submitFired,
  defaultPrevented: window.__submitDefaultPrevented,
  url: location.href,
}));
console.log('AFTER CLICK:', JSON.stringify(after, null, 2));

await browser.close();
