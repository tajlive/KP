/**
 * Tilgjengelighet (a11y) — axe-core WCAG på ALLE offentlige sider
 * Blokkerer kun på impact=critical.
 * Rapporterer serious + moderate som warnings.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ALL_PAGES = [
  "/no", "/no/priser", "/no/priser/cancel", "/no/priser/success",
  "/no/login", "/no/register", "/no/om-oss", "/no/kontakt",
  "/no/bots", "/no/leaderboard", "/no/jokertrade",
  "/no/binance-guide", "/no/kalkulator", "/no/hjelp",
  "/no/kurs", "/no/personvern", "/no/vilkar", "/no/cookies",
  "/no/marked", "/no/velkommen", "/no/copy-trading",
  "/no/copy-trading/discover", "/no/handel", "/no/interessetest",
] as const;

async function checkA11y(page: Page, path: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  const critical = results.violations.filter(v => v.impact === "critical");
  const serious = results.violations.filter(v => v.impact === "serious");
  
  // Logg alle violations for debugging
  if (results.violations.length > 0) {
    console.log(`\n  🔍 ${path}: ${results.violations.length} violations`);
    for (const v of results.violations.slice(0, 3)) {
      console.log(`    [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
    }
  }

  // Kun critical blokkerer
  if (critical.length > 0) {
    const summary = critical
      .map(v => `[${v.impact}] ${v.id}: ${v.help}`)
      .join("\n");
    expect(critical, `Kritiske a11y-brudd på ${path}:\n${summary}`).toHaveLength(0);
  }
}

test.describe("WCAG Tilgjengelighet — desktop", () => {
  for (const path of ALL_PAGES) {
    test(`${path} — ingen kritiske brudd`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await checkA11y(page, path);
    });
  }
});

test.describe("WCAG Tilgjengelighet — mobil (375px)", () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  // Kjør kun de viktigste sidene på mobil (48 tester er nok)
  const MOBILE_PRIORITY = [
    "/no", "/no/priser", "/no/login", "/no/register",
    "/no/leaderboard", "/no/jokertrade", "/no/kurs",
    "/no/om-oss", "/no/kontakt", "/no/personvern",
  ];
  
  for (const path of MOBILE_PRIORITY) {
    test(`${path} mobil — ingen kritiske brudd`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await checkA11y(page, path);
    });
  }
});
