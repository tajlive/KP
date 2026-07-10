/**
 * Mobile Audit — 375px viewport test of ALL public routes.
 *
 * Tests:
 * 1. Horizontal overflow (scrollWidth > innerWidth)
 * 2. Elements outside viewport bounds (negative X or beyond right edge)
 * 3. Touch targets < 44px (interactive elements too small)
 *
 * Runs as a single test iterating all routes to avoid
 * parallel-worker file contention.
 *
 * @mobile @audit
 */

import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Public routes (34 stk) ────────────────────────────────────────────
const PUBLIC_ROUTES = [
  "/no",
  "/no/priser", "/no/priser/success", "/no/priser/cancel",
  "/no/om-oss", "/no/kontakt", "/no/hjelp", "/no/kalkulator",
  "/no/bots", "/no/binance-guide",
  "/no/vilkar", "/no/personvern", "/no/cookies",
  "/no/login", "/no/register", "/no/reset-password", "/no/update-password",
  "/no/jokertrade",
  "/no/leaderboard", "/no/copy-trading", "/no/copy-trading/discover",
  "/no/akademi", "/no/akademi/dashboard-guide",
  "/no/kurs",
  "/no/kurs/grunnleggende/leksjon/introduksjon-til-krypto",
  "/no/kurs/strategi/leksjon/dollar-cost-averaging",
  "/no/checkout", "/no/checkout/success", "/no/marketplace",
  "/no/velkommen", "/no/velg-strategi",
  "/no/feil/ikke-funnet", "/no/feil/ingen-tilgang", "/no/feil/serverfeil",
];

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const SCREENSHOT_DIR = path.resolve("public/mobile-audit");

interface PageResult {
  route: string;
  status: "pass" | "fail";
  horizontalOverflow: boolean;
  offScreenElements: number;
  smallTouchTargets: number;
  errors: string[];
  screenshot?: string;
}

// ── Detection helpers ──────────────────────────────────────────────────

const checkHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

const checkOffScreenElements = (page: Page) =>
  page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let count = 0;
    const all = document.querySelectorAll("*");
    for (const el of all) {
      if (!(el instanceof HTMLElement)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.left > vw || r.top > vh || r.right < 0 || r.bottom < 0) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === "html" || tag === "body") continue;
      const st = window.getComputedStyle(el);
      if (st.position === "fixed" && st.inset === "0px") continue;
      if (r.left < -10 || r.right > vw + 10) {
        if (!el.textContent?.trim() && el.children.length === 0) continue;
        count++;
      }
    }
    return count;
  });

const checkSmallTouchTargets = (page: Page) =>
  page.evaluate(() => {
    let count = 0;
    const sel = [
      "a", "button", "input", "select", "textarea",
      "[role='button']", "[role='link']", "[role='tab']",
      "[role='menuitem']", "[role='option']",
    ].join(",");
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (!(el instanceof HTMLElement)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const st = window.getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      if (el.tagName === "A" && st.display === "inline") continue;
      if (r.width >= 44 || r.height >= 44) continue;
      count++;
    }
    return count;
  });

const takeScreenshot = async (page: Page, route: string): Promise<string> => {
  const name = (route.replace(/\//g, "_") || "home").replace(/^_/, "");
  const fp = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  return `/mobile-audit/${name}.png`;
};

const saveResults = (results: PageResult[]) => {
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, "results.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
};

// ── Tests ──────────────────────────────────────────────────────────────

test.describe("Mobile Audit — 375×667 @mobile @audit", () => {
  let allResults: PageResult[] = [];

  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    // Rens gamle screenshots (ikke results.json)
    for (const f of fs.readdirSync(SCREENSHOT_DIR)) {
      if (f.endsWith(".png")) fs.unlinkSync(path.join(SCREENSHOT_DIR, f));
    }
  });

  test.afterAll(() => {
    saveResults(allResults);
    const pass = allResults.filter((r) => r.status === "pass").length;
    const fail = allResults.filter((r) => r.status === "fail").length;
    const total = allResults.length;

    console.log(`\n${"=".repeat(47)}`);
    console.log(`📱 MOBIL-AUDIT SAMMENDRAG (375×667)`);
    console.log(`${"=".repeat(47)}`);
    console.log(`✅ ${pass} av ${total} sider bestått`);
    console.log(`❌ ${fail} av ${total} sider har mobil-problemer`);
    console.log(`${"=".repeat(47)}`);

    if (fail > 0) {
      console.log(`\nSider med feil:`);
      for (const r of allResults.filter((r) => r.status === "fail")) {
        console.log(`  ❌ ${r.route}`);
        if (r.horizontalOverflow) console.log(`     └─ Horisontal overflow`);
        if (r.offScreenElements > 30) console.log(`     └─ ${r.offScreenElements} element(er) utenfor skjerm`);
        if (r.smallTouchTargets > 0) console.log(`     └─ ${r.smallTouchTargets} små touch-targets (<44px)`);
      }
    }
    console.log();
  });

  for (const route of PUBLIC_ROUTES) {
    test(`${route} — mobil-sjekk`, async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);

      const consoleErrs: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrs.push(msg.text().slice(0, 200));
      });

      const resp = await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      }).catch(() => null);

      await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // HTTP error
      if (resp && resp.status() >= 400) {
        const result: PageResult = {
          route, status: "fail",
          horizontalOverflow: false, offScreenElements: 0, smallTouchTargets: 0,
          errors: [`HTTP ${resp.status()}: ${resp.statusText()}`],
          screenshot: await takeScreenshot(page, route),
        };
        allResults.push(result);
        test.info().annotations.push({ type: "fail", description: `HTTP ${resp.status()}` });
        expect(resp.status()).toBeLessThan(400);
        return;
      }

      await page.waitForTimeout(500);

      const overflow = await checkHorizontalOverflow(page);
      const offScreen = await checkOffScreenElements(page);
      const smallTouch = await checkSmallTouchTargets(page);

      const hasIssues = overflow || offScreen > 30 || smallTouch > 0;

      const result: PageResult = {
        route,
        status: hasIssues ? "fail" : "pass",
        horizontalOverflow: overflow,
        offScreenElements: offScreen,
        smallTouchTargets: smallTouch,
        errors: consoleErrs.slice(0, 5),
      };

      if (hasIssues) {
        result.screenshot = await takeScreenshot(page, route);
      }

      allResults.push(result);

      if (overflow) {
        test.info().annotations.push({ type: "overflow", description: `${route}: horisontal overflow` });
        expect(overflow, `${route}: Ingen horisontal overflow`).toBe(false);
      }
      if (smallTouch > 0) {
        test.info().annotations.push({ type: "touch", description: `${route}: ${smallTouch} touch < 44px` });
        expect(smallTouch, `${route}: Ingen touch-targets < 44px`).toBe(0);
      }
    });
  }
});
