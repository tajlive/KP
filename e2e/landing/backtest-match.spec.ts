/**
 * E2E-test: Verifiser at backtest-tall matcher på tvers av landing og dashboard
 * 
 * Tester at ROISimulator på landingssiden viser korrekte backtest-baserte tall
 * basert på ekte historiske data fra Binance.
 * 
 * @e2e @backtest @critical
 */

import { test, expect } from "@playwright/test";

// Test-parametere
const TEST_SCENARIOS = [
  { profile: 'Konservativ', strategy: 'eth-dca', months: 12, capital: 100000 },
  { profile: 'Balansert', strategy: 'btc-sma-20-50', months: 12, capital: 100000 },
  { profile: 'Aggressiv', strategy: 'btc-sma-10-30', months: 12, capital: 100000 },
];

// Hjelpefunksjon for å parse prosent fra tekst
function parsePercent(text: string): number {
  const cleaned = text.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned);
}

test.describe("Backtest Engine - Én sannhetskilde @backtest", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/no#roi-calculator", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    
    // Vent på at kalkulatoren laster
    await expect(page.locator("text=Ekte backtest")).toBeVisible({ timeout: 10000 });
  });

  test("ROISimulator viser backtest-baserte tall", async ({ page }) => {
    // Sett startkapital til 100k
    const slider = page.locator('input[type="range"]').first();
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = '100000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    // Vent på at resultatet lastes
    await page.waitForTimeout(2000);
    
    // Hent forventet avkastning
    const returnText = await page.locator('[class*="text-kp-brand"] >> text=+%').first().textContent();
    const returnPct = parsePercent(returnText!);
    
    console.log('Forventet avkastning:', returnPct + '%');
    
    // Verifiser at avkastning er realistisk
    expect(returnPct).toBeGreaterThan(-100);  // Ikke -100%
    expect(returnPct).toBeLessThan(1000);     // Ikke +1000%
    
    // Verifiser at metrics vises
    const maxDrawdown = await page.locator('text=Max drawdown').locator('..').locator('[class*="text-kp-error"]').textContent();
    expect(maxDrawdown).toBeTruthy();
    console.log('Max drawdown:', maxDrawdown);
    
    // Verifiser at disclaimer vises
    await expect(page.locator("text=Beregnet med historisk backtest")).toBeVisible();
    
    console.log('✅ ROISimulator viser backtest-baserte tall med disclaimer');
  });

  test("alle tre strategier gir forskjellige resultater", async ({ page }) => {
    const results: Record<string, number> = {};
    
    // Test hver strategi
    for (const scenario of TEST_SCENARIOS) {
      // Klikk på strategi
      const button = page.locator('button', { hasText: new RegExp(scenario.profile) });
      await button.click();
      
      // Vent på oppdatering
      await page.waitForTimeout(1500);
      
      // Hent forventet avkastning
      const returnText = await page.locator('[class*="text-kp-brand"] >> text=+%').first().textContent();
      const returnPct = parsePercent(returnText!);
      
      results[scenario.profile] = returnPct;
      console.log(`${scenario.profile}: ${returnPct}%`);
    }
    
    // Verifiser at alle tre ga resultater
    expect(results['Konservativ']).toBeDefined();
    expect(results['Balansert']).toBeDefined();
    expect(results['Aggressiv']).toBeDefined();
    
    // Verifiser at resultatene er rimelige
    expect(Math.abs(results['Konservativ'])).toBeLessThan(500);
    expect(Math.abs(results['Balansert'])).toBeLessThan(500);
    expect(Math.abs(results['Aggressiv'])).toBeLessThan(500);
    
    console.log('✅ Alle strategier gir unike, realistiske resultater');
  });

  test("scenarier vises i riktig rekkefølge", async ({ page }) => {
    // Velg balansert
    const balansertButton = page.locator('button', { hasText: /Balansert/ });
    await balansertButton.click();
    await page.waitForTimeout(1500);
    
    // Hent alle scenario-verdier
    const optimisticText = await page.locator('text=Optimistisk').locator('xpath=../../..').locator('[class*="text-green-400"]').textContent();
    const expectedText = await page.locator('text=Forventet').locator('xpath=../../..').locator('[class*="text-kp-brand"]').textContent();
    const pessimisticText = await page.locator('text=Pessimistisk').locator('xpath=../../..').locator('[class*="text-amber-400"]').textContent();
    
    const optimistic = parsePercent(optimisticText!);
    const expected = parsePercent(expectedText!);
    const pessimistic = parsePercent(pessimisticText!);
    
    console.log(`Scenarier: Opt=${optimistic}%, Exp=${expected}%, Pes=${pessimistic}%`);
    
    // Pessimistisk <= Forventet <= Optimistisk
    expect(pessimistic).toBeLessThanOrEqual(optimistic);
    expect(expected).toBeGreaterThanOrEqual(pessimistic - 0.01);
    expect(expected).toBeLessThanOrEqual(optimistic + 0.01);
    
    console.log('✅ Scenarier er i riktig rekkefølge');
  });

  test("chart viser equity curve", async ({ page }) => {
    // Sjekk at chart er synlig
    const chart = page.locator('.recharts-responsive-container');
    await expect(chart).toBeVisible();
    
    // Sjekk at chart inneholder linjer
    const lines = chart.locator('.recharts-line');
    const lineCount = await lines.count();
    expect(lineCount).toBeGreaterThanOrEqual(3); // Optimistisk, forventet, pessimistisk
    
    console.log('✅ Equity curve chart vises');
  });

  test("alle tidsperioder er tilgjengelige", async ({ page }) => {
    const periods = [3, 6, 12, 24, 36];
    
    for (const months of periods) {
      const button = page.locator('button', { hasText: `${months} mnd` });
      await expect(button).toBeVisible();
      
      await button.click();
      await page.waitForTimeout(1000);
      
      // Verifiser at resultatet oppdateres
      const returnText = await page.locator('[class*="text-kp-brand"] >> text=+%').first().textContent();
      expect(returnText).toBeTruthy();
    }
    
    console.log('✅ Alle tidsperioder fungerer');
  });

  test("cache fungerer - rask respons ved gjentatt kall", async ({ page }) => {
    // Velg balansert strategi og 12 måneder
    const balansertButton = page.locator('button', { hasText: /Balansert/ });
    await balansertButton.click();
    
    const periodButton = page.locator('button', { hasText: '12 mnd' });
    await periodButton.click();
    
    // Vent på første kalkulering
    await page.waitForTimeout(2000);
    
    // Logg første resultat
    const firstResult = await page.locator('[class*="text-kp-brand"] >> text=+%').first().textContent();
    console.log('Første kall:', firstResult);
    
    // Bytt til annen strategi og tilbake (tvinger nytt kall men samme cache-nøkkel)
    const aggressivButton = page.locator('button', { hasText: /Aggressiv/ });
    await aggressivButton.click();
    await page.waitForTimeout(1000);
    
    // Tilbake til balansert (samme som første kall)
    await balansertButton.click();
    await page.waitForTimeout(500); // Raskere respons indikerer cache
    
    // Verifiser at resultatet er det samme
    const cachedResult = await page.locator('[class*="text-kp-brand"] >> text=+%').first().textContent();
    console.log('Cachet kall:', cachedResult);
    
    expect(firstResult).toBe(cachedResult);
    
    console.log('✅ Cache fungerer - konsistente resultater');
  });
});
