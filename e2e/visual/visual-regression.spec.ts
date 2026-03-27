/**
 * Visual Regression Tests — Klarpakke
 *
 * Tar screenshot-baseline av kritiske sider og sammenligner ved hver PR.
 * Blokkerer deploy hvis visuell diff > 2%.
 *
 * Første kjøring: npm run test:visual:update  (generer baseline)
 * Deretter:        npm run test:visual          (sammenlign mot baseline)
 *
 * Snapshots lagres i: e2e/visual/__snapshots__/
 */
import { test, expect, Page } from '@playwright/test';

const PAGES = [
  { name: 'landing',       path: '/no',              waitFor: 'h1' },
  { name: 'priser',        path: '/no/priser',        waitFor: 'h1, main' },
  { name: 'innlogging',    path: '/no/innlogging',    waitFor: 'form, input[type="email"]' },
  { name: 'paper-trading', path: '/no/paper-trading', waitFor: 'h1, main' },
] as const;

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 390,  height: 844 },
] as const;

async function freezePage(page: Page) {
  await page.addStyleTag({
    content: `
      [data-testid="live-price"],
      [data-testid="timestamp"],
      [data-testid="ticker"],
      [data-dynamic="true"],
      .animate-ticker-scroll,
      .animate-pulse { visibility: hidden !important; }
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        transition-duration: 0.001ms !important;
      }
    `,
  });
}

// ---- SCREENSHOT TESTER ----
for (const vp of VIEWPORTS) {
  for (const pg of PAGES) {
    test(`[visual] ${pg.name} — ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(pg.path, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForSelector(pg.waitFor, { timeout: 10_000 }).catch(() => {});
      await freezePage(page);
      await expect(page).toHaveScreenshot(`${pg.name}-${vp.name}.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: vp.name === 'desktop',
        animations: 'disabled',
      });
    });
  }
}

// ---- CSS SANITY-TESTER ----

test('[css] CDS global CSS er IKKE aktiv', async ({ page }) => {
  await page.goto('/no');
  const bodyFont = await page.evaluate(() =>
    window.getComputedStyle(document.body).fontFamily.toLowerCase()
  );
  expect(bodyFont).not.toMatch(/coinbase|cds-/);
});

test('[css] Inter er aktiv på body', async ({ page }) => {
  await page.goto('/no');
  const bodyFont = await page.evaluate(() =>
    window.getComputedStyle(document.body).fontFamily.toLowerCase()
  );
  expect(bodyFont).toMatch(/inter|system-ui|-apple-system/);
});

test('[css] Bakgrunn er hvit på forsiden', async ({ page }) => {
  await page.goto('/no');
  const bodyBg = await page.evaluate(() =>
    window.getComputedStyle(document.body).backgroundColor
  );
  const ok = bodyBg === 'rgb(255, 255, 255)' || bodyBg === 'rgba(0, 0, 0, 0)';
  expect(ok).toBe(true);
});

test('[css] Brand-farge er #0052FF i hero-gradient', async ({ page }) => {
  await page.goto('/no', { waitUntil: 'networkidle' });

  // HeroSection bruker from-[#0052FF] (Tailwind arbitrary gradient), ikke bg-brand-500.
  // Vi sjekker computed backgroundImage på <section> som inneholder fra-fargen.
  const hasBrandColor = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('section'));
    for (const section of sections) {
      const bg = window.getComputedStyle(section);
      const img = bg.backgroundImage || '';
      const color = bg.backgroundColor || '';
      // #0052FF = rgb(0, 82, 255)
      if (img.includes('0, 82, 255') || img.includes('rgb(0,82,255)') ||
          color === 'rgb(0, 82, 255)') {
        return true;
      }
    }
    return false;
  });

  expect(hasBrandColor).toBe(true);
});

// ---- I18N MISSING-NØKKEL TESTER ----

const I18N_PAGES = ['/no', '/no/priser', '/no/innlogging'];
for (const path of I18N_PAGES) {
  test(`[i18n] Ingen MISSING-nøkler på ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    const bodyText = await page.evaluate(() => document.body.innerText);
    const missing = bodyText.match(/\[MISSING[:\s][^\]]+\]/g);
    if (missing) {
      throw new Error(
        `${missing.length} manglende i18n-nøkler på ${path}:\n${missing.slice(0, 10).join('\n')}${missing.length > 10 ? `\n...og ${missing.length - 10} til` : ''}`
      );
    }
  });
}
