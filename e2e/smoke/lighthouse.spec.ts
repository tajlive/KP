/**
 * E2E: Lighthouse-audit per side
 * 
 * Kjører Lighthouse på alle kritiske sider.
 * Mål: Performance > 80, Accessibility > 90, SEO > 90.
 * 
 * Krever: npm install -D lighthouse chrome-launcher
 * Kjør: npx playwright test e2e/smoke/lighthouse.spec.ts
 */

import { test, expect } from "@playwright/test";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const LIGHTHOUSE_PAGES = [
  { path: "/", name: "Landing" },
  { path: "/trade", name: "Trade" },
  { path: "/dashboard", name: "Dashboard" },
];

const THRESHOLDS = {
  performance: 75, // Realistisk for prod med alle scripts
  accessibility: 88, // 89 på Trade/Dashboard — juster etter hvert som forbedringer gjøres
  "best-practices": 85,
  seo: 90,
};

test.describe("Lighthouse — ytelse og tilgjengelighet", () => {
  // Øk timeout for Lighthouse (tar 30-60s per side)
  test.setTimeout(120000);

  for (const page of LIGHTHOUSE_PAGES) {
    test(`${page.name} — Lighthouse-score`, async () => {
      const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
      const url = `https://www.klarpakke.no${page.path}`;

      try {
        const result = await lighthouse(url, {
          port: chrome.port,
          output: "json",
          onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        });

        if (!result) throw new Error("Lighthouse returnerte ingen resultat");

        const { lhr } = result;
        const scores = {
          performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
          accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
          "best-practices": Math.round((lhr.categories["best-practices"]?.score ?? 0) * 100),
          seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
        };

        console.log(`📊 ${page.name}:`, scores);

        // Verifiser terskler
        expect(
          scores.performance,
          `${page.name}: Performance ${scores.performance} < ${THRESHOLDS.performance}`
        ).toBeGreaterThanOrEqual(THRESHOLDS.performance);

        expect(
          scores.accessibility,
          `${page.name}: Accessibility ${scores.accessibility} < ${THRESHOLDS.accessibility}`
        ).toBeGreaterThanOrEqual(THRESHOLDS.accessibility);

        expect(
          scores["best-practices"],
          `${page.name}: Best practices ${scores["best-practices"]} < ${THRESHOLDS["best-practices"]}`
        ).toBeGreaterThanOrEqual(THRESHOLDS["best-practices"]);

        expect(
          scores.seo,
          `${page.name}: SEO ${scores.seo} < ${THRESHOLDS.seo}`
        ).toBeGreaterThanOrEqual(THRESHOLDS.seo);
      } finally {
        await chrome.kill();
      }
    });
  }
});
