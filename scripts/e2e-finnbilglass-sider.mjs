// Skjermbilder av ALLE finnbilglass.no-sider — mobil 393×852 (Tom-designprosess).
import { chromium } from 'playwright';

const BASE = 'https://finnbilglass.no';
const UT = '/Users/taj/finnbilglass/docs/sider-2026-08-17';

const sider = [
  ['01-forside', '/'],
  ['02-bilglass-uten-forsikring', '/bilglass-uten-forsikring'],
  ['03-om-oss', '/om-oss'],
  ['04-personvern', '/personvern'],
  ['05-404', '/finnes-ikke'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const [navn, sti] of sider) {
  try {
    await page.goto(BASE + sti, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${UT}/${navn}.png`, fullPage: true });
    console.log(`OK ${navn} (${sti}) — ${await page.title()}`);
  } catch (e) {
    console.log(`FEIL ${navn}: ${e.message}`);
  }
}

// Forside med kjennemerke skrevet inn (foto-inngangen)
try {
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('#input-regnr', 'SU 18018');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${UT}/01b-forside-med-regnr.png`, fullPage: true });
  console.log('OK 01b-forside-med-regnr');
} catch (e) {
  console.log('FEIL 01b:', e.message);
}

await browser.close();
