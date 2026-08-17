// E2E-flyt finnbilglass.no — iPhone 15 Pro-visning, bevis-screenshots.
// Kjøres med playwright fra klarpakke-repoet: node scripts/e2e-finnbilglass.mjs
import { chromium } from 'playwright';

const BASE = 'https://finnbilglass.no';
const UT = '/Users/taj/finnbilglass/docs';

async function svarSpm(page, svarListe) {
  // PINPOINT → 0 spørsmål, direkte til resultat. VERIFY/FALLBACK → spørsmål.
  try {
    await page.waitForSelector('#screen-spm:not(.hidden)', { timeout: 4000 });
  } catch {
    await page.waitForSelector('#screen-resultat:not(.hidden)', { timeout: 15000 });
    return;
  }
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('#screen-spm:not(.hidden)', { timeout: 8000 });
    const tittel = await page.textContent('#spm-tittel');
    const svar = svarListe[i] || 'Vet ikke';
    // svar = 'Ja' | 'Nei' | 'Vet ikke'
    if (svar === 'Vet ikke') {
      await page.click('#btn-vetikke');
    } else {
      const knapper = page.locator('#spm-svar button.sek');
      await knapper.filter({ hasText: svar }).first().click();
    }
    console.log(`  spm ${i + 1}: ${tittel} → ${svar}`);
    // Neste steg: nytt spørsmål eller resultat — stopp ved resultat
    try {
      await page.waitForSelector('#screen-resultat:not(.hidden)', { timeout: 2500 });
      return;
    } catch { /* flere spørsmål */ }
  }
  await page.waitForSelector('#screen-resultat:not(.hidden)', { timeout: 15000 });
}

async function testFlyt(navn, regnr, svarListe) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  console.log(`\n=== ${navn} (${regnr}) ===`);

  await page.fill('#input-regnr', regnr);
  await page.click('#form-regnr button[type=submit]');
  await page.waitForSelector('#screen-bekreft:not(.hidden)', { timeout: 15000 });
  const bekreft = await page.textContent('#bekreft-bil');
  console.log('BEKREFT:', bekreft.trim());
  await page.screenshot({ path: `${UT}/bevis-${navn}-bekreft.png` });

  await page.click('#btn-bekreft-ja');
  // Glassvalg vises kun ved FALLBACK (frontrute er standard/forhåndsvalgt ellers)
  if (await page.isVisible('#screen-glass')) await page.click('.glassopt.aktiv');
  await svarSpm(page, svarListe);

  const navn2 = await page.textContent('#resultat-kort .name');
  const meta = await page.textContent('#resultat-kort .meta');
  const pris = await page.textContent('#resultat-pris');
  console.log('RESULTAT:', (navn2 || '').trim());
  console.log('META:', (meta || '').trim());
  console.log('PRIS:', (pris || '').trim());
  await page.screenshot({ path: `${UT}/bevis-${navn}-resultat.png` });

  // 43R-verifisering: ved VERIFY skal seksjonen være synlig direkte (ikke bak knapp)
  const verifySynlig = await page.isVisible('#verify-seksjon');
  const verifyKnapp = await page.isVisible('#btn-apne-verify');
  console.log('43R-seksjon synlig:', verifySynlig, '| åpne-knapp synlig:', verifyKnapp);
  if (verifySynlig) {
    await page.locator('#verify-seksjon').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${UT}/bevis-${navn}-43r.png` });
  }

  await browser.close();
  return { bekreft, navn: navn2, meta, pris };
}

(async () => {
  const res = {};
  res.su18018 = await testFlyt('su18018', 'SU18018', ['Ja', 'Nei', 'Nei', 'Ja']); // sensor Ja, adas Nei, oppvarmet Nei, antenne Ja
  res.aj95429 = await testFlyt('aj95429', 'AJ95429', ['Nei', 'Nei', 'Nei', 'Nei']);
  console.log('\n=== SAMMENDRAG ===');
  console.log(JSON.stringify(res, null, 2));
})().catch((e) => {
  console.error('E2E FEILET:', e);
  process.exit(1);
});
