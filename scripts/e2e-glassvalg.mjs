// E2E-verifisering av glassvalg-siden i prod: bil-info + VIN + bilmerke-logo + glasstype-bokser.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'https://finnbilglass.no';
const REGNR = process.env.REGNR || 'UR67407'; // Mercedes 208 CDI 2002

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });

// 1. Forside → skriv kjennemerke
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#input-regnr', REGNR);
await page.click('#form-regnr button[type=submit]');
await page.waitForSelector('#screen-glass:not(.hidden)', { timeout: 15000 });

// 2. Bilkort: merke/logo + navn + VIN
const logoEl = await page.$('#glass-merkelbl img.bilkort-logo');
const logoAlt = logoEl ? await logoEl.getAttribute('alt') : null;
const logoSrc = logoEl ? await logoEl.getAttribute('src') : null;
const logoVisible = logoEl ? await logoEl.isVisible() : false;

const navn = await page.textContent('#glass-bilnavn');
const detTekst = (await page.textContent('#glass-det')) || '';

// 3. Bokser
const bokser = await page.$$eval('.glassopt', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));

// 4. Skjermbilde
const skjerm = `/tmp/glassvalg-vin-logo.png`;
await page.screenshot({ path: skjerm, fullPage: true });

console.log(JSON.stringify({
  h2: await page.textContent('#screen-glass h2'),
  logo: { alt: logoAlt, src: logoSrc, synlig: logoVisible },
  bilnavn: navn,
  detlinjer: detTekst,
  harVin: /VIN-nummer:/.test(detTekst),
  bokser,
  skjerm
}, null, 2));

await browser.close();
