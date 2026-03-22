/**
 * Tilgjengelighet (a11y) – axe-core WCAG på kritiske sider
 * Kjør: npm run test:a11y
 * Mot prod: BASE_URL=https://www.klarpakke.no npm run test:a11y
 *
 * Feiler kun på impact=critical (blokkerer ikke på serious/minor).
 * Rapporterer alle violations i feilmelding ved critical.
 *
 * Kjører både desktop og mobil-viewport (fanger kontrast/layout som kun vises på små skjermer).
 */
import { test, expect, devices, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_PAGES = [
  { path: "/no/priser", name: "Priser" },
  { path: "/no/innlogging", name: "Innlogging" },
  { path: "/no/kurs", name: "Kurs" },
  { path: "/no/interessetest", name: "Interessetest" },
] as const;

async function assertNoCriticalAxe(page: Page, path: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  const critical = results.violations.filter((v) => v.impact === "critical");
  if (critical.length > 0) {
    const summary = critical
      .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
      .join("\n");
    expect(
      critical,
      `Kritiske a11y-brudd på ${path}:\n${summary}`,
    ).toHaveLength(0);
  }
}

test.describe("Tilgjengelighet (axe) desktop @accessibility", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path}) – ingen kritiske axe-brudd`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await assertNoCriticalAxe(page, path);
    });
  }
});

test.describe("Tilgjengelighet (axe) mobil-viewport @accessibility", () => {
  test.use({
    ...devices["iPhone 13"],
  });

  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path}) mobil – ingen kritiske axe-brudd`, async ({
      page,
    }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await assertNoCriticalAxe(page, path);
    });
  }
});
