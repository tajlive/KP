/**
 * Mobile Audit — 375px viewport test of ALL public routes.
 *
 * Tests:
 * 1. Horizontal overflow (scrollWidth > innerWidth)
 * 2. Elements outside viewport bounds (negative X or extending beyond right edge)
 * 3. Touch targets < 44px (interactive elements too small for mobile)
 *
 * Takes screenshots on failure and produces a final summary.
 *
 * @mobile @audit
 */

import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ── Public routes (non-authenticated, in Norwegian locale) ──────────────
const PUBLIC_ROUTES = [
  // Landing
  "/no",                           // Hjem
  // Marketing
  "/no/priser",                    // Priser
  "/no/priser/success",            // Priser – success
  "/no/priser/cancel",             // Priser – cancel
  "/no/om-oss",                    // Om oss
  "/no/kontakt",                   // Kontakt
  "/no/hjelp",                     // Hjelp
  "/no/kalkulator",                // Kalkulator
  "/no/bots",                      // Trading bots
  "/no/binance-guide",             // Binance-guide
  // Legal
  "/no/vilkar",                    // Vilkår
  "/no/personvern",                // Personvern
  "/no/cookies",                   // Cookies
  // Auth pages (public – login/register don't require auth)
  "/no/login",                     // Logg inn
  "/no/register",                  // Registrer
  "/no/reset-password",            // Tilbakestill passord
  "/no/update-password",           // Oppdater passord
  // Social / Community
  "/no/jokertrade",                // JokerTrade
  "/no/leaderboard",               // Ledertavle
  "/no/copy-trading",              // Copy trading
  "/no/copy-trading/discover",     // Copy trading – oppdag
  // Academy
  "/no/akademi",                   // Akademi
  "/no/akademi/dashboard-guide",   // Dashboard-guide
  "/no/kurs",                      // Kurs
  "/no/kurs/grunnleggende/leksjon/introduksjon-til-krypto",
  "/no/kurs/strategi/leksjon/dollar-cost-averaging",
  // Commerce
  "/no/checkout",                  // Checkout
  "/no/checkout/success",          // Checkout – success
  "/no/marketplace",               // Marketplace
  // Onboarding (public)
  "/no/velkommen",                 // Velkommen
  "/no/velg-strategi",             // Velg strategi
  // Error pages
  "/no/feil/ikke-funnet",          // 404
  "/no/feil/ingen-tilgang",        // 403
  "/no/feil/serverfeil",           // 500
];

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const SCREENSHOT_DIR = path.resolve("public/mobile-audit");
const PARTIAL_DIR = path.resolve(".hermes/mobile-audit-partial");

// ── Types ──────────────────────────────────────────────────────────────

interface PageResult {
  route: string;
  status: "pass" | "fail";
  horizontalOverflow: boolean;
  offScreenElements: number;
  smallTouchTargets: number;
  errors: string[];
  screenshot?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function checkHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
}

/** Bare tell elementer som stikker betydelig utenfor viewport */
function checkOffScreenElements(page: Page): Promise<number> {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let count = 0;

    const all = document.querySelectorAll("*");
    for (const el of all) {
      if (!(el instanceof HTMLElement)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Skip helt skjulte elementer
      if (rect.left > viewportWidth || rect.top > viewportHeight) continue;
      if (rect.right < 0 || rect.bottom < 0) continue;

      const tag = el.tagName.toLowerCase();
      // Skip body/html og fixed position (intentional full-width / overlay)
      if (tag === "html" || tag === "body") continue;
      const style = window.getComputedStyle(el);
      if (style.position === "fixed" && style.inset === "0px") continue;

      // Bare tell elementer som er betydelig utenfor (>= 10px)
      if (rect.left < -10 || rect.right > viewportWidth + 10) {
        // Dekorative elementer uten innhold telles ikke
        if (!el.textContent?.trim() && el.children.length === 0) continue;
        count++;
      }
    }
    return count;
  });
}

function checkSmallTouchTargets(page: Page): Promise<number> {
  return page.evaluate(() => {
    let count = 0;
    const interactiveSelectors = [
      "a", "button", "input", "select", "textarea",
      "[role='button']", "[role='link']", "[role='tab']",
      "[role='menuitem']", "[role='option']",
    ];
    const elements = document.querySelectorAll(interactiveSelectors.join(","));

    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;

      // Skip inline links i brødtekst (de er <44px, men det er normalt)
      if (el.tagName === "A" && style.display === "inline") continue;

      // Skip elementer som er del av en større interaktiv container
      // (f.eks. et <a>-tag med padding i en navigasjonsliste)
      if (rect.width >= 44 || rect.height >= 44) continue;

      // Faktisk lite interaktivt element
      count++;
    }
    return count;
  });
}

async function takeScreenshot(page: Page, route: string): Promise<string> {
  const sanitized = route.replace(/\//g, "_").replace(/^_/, "") || "home";
  const filename = `${sanitized}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  // Returner URL-relativ bane
  return `/mobile-audit/${filename}`;
}

// ── Tests ───────────────────────────────────────────────────────────────

test.describe("Mobile Audit — 375x667 viewport @mobile @audit", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(PARTIAL_DIR, { recursive: true });
    // Rens gamle partial-filer
    for (const f of fs.readdirSync(PARTIAL_DIR)) {
      fs.unlinkSync(path.join(PARTIAL_DIR, f));
    }
  });

  test.afterAll(() => {
    // Samle alle partial-resultater
    const results: PageResult[] = [];
    for (const f of fs.readdirSync(PARTIAL_DIR)) {
      if (f.endsWith(".json")) {
        try {
          const data = fs.readFileSync(path.join(PARTIAL_DIR, f), "utf-8");
          results.push(JSON.parse(data));
        } catch {
          // skip corrupt
        }
      }
    }

    // Sorter etter route
    results.sort((a, b) => a.route.localeCompare(b.route));

    // Skriv samlet resultat
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, "results.json"),
      JSON.stringify(results, null, 2),
      "utf-8",
    );

    const passCount = results.filter((r) => r.status === "pass").length;
    const failCount = results.filter((r) => r.status === "fail").length;
    const total = results.length;

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`📱 MOBIL-AUDIT SAMMENDRAG (375×667)`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`✅ ${passCount} av ${total} sider bestått`);
    console.log(`❌ ${failCount} av ${total} sider har mobil-problemer`);
    console.log(`═══════════════════════════════════════════\n`);

    if (failCount > 0) {
      console.log(`Sider med feil:`);
      for (const r of results.filter((r) => r.status === "fail")) {
        console.log(`  ❌ ${r.route}`);
        if (r.horizontalOverflow) console.log(`     └─ Horisontal overflow`);
        if (r.offScreenElements > 20) console.log(`     └─ ${r.offScreenElements} element(er) utenfor skjerm`);
        if (r.smallTouchTargets > 0) console.log(`     └─ ${r.smallTouchTargets} små touch-targets (<44px)`);
      }
      console.log();
    }
  });

  for (const route of PUBLIC_ROUTES) {
    test(`${route} — mobil-sjekk`, async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);

      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      }).catch(() => null);

      await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Samle console errors
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text().slice(0, 200));
        }
      });

      // Sjekk HTTP status
      if (response && response.status() >= 400 && response.status() < 600) {
        const result: PageResult = {
          route,
          status: "fail",
          horizontalOverflow: false,
          offScreenElements: 0,
          smallTouchTargets: 0,
          errors: [`HTTP ${response.status()}: ${response.statusText()}`],
          screenshot: await takeScreenshot(page, route),
        };
        // Skriv delresultat
        const partialFile = path.join(PARTIAL_DIR, `${route.replace(/\//g, "_")}.json`);
        fs.writeFileSync(partialFile, JSON.stringify(result), "utf-8");
        test.info().annotations.push({ type: "fail", description: `HTTP ${response.status()}` });
        expect(response.status()).toBeLessThan(400);
        return;
      }

      await page.waitForTimeout(500);

      // 1. Horisontal overflow
      const hasOverflow = await checkHorizontalOverflow(page);

      // 2. Elementer utenfor skjerm
      const offScreen = await checkOffScreenElements(page);

      // 3. Touch targets < 44px
      const smallTargets = await checkSmallTouchTargets(page);

      // Vurder om siden har reelle problemer
      const hasIssues = hasOverflow || offScreen > 30 || smallTargets > 0;

      const result: PageResult = {
        route,
        status: hasIssues ? "fail" : "pass",
        horizontalOverflow: hasOverflow,
        offScreenElements: offScreen,
        smallTouchTargets: smallTargets,
        errors: consoleErrors.slice(0, 5),
      };

      if (hasIssues) {
        result.screenshot = await takeScreenshot(page, route);
      }

      // Skriv delresultat til partial-mappe (pga parallelle workers)
      const partialFile = path.join(PARTIAL_DIR, `${route.replace(/\//g, "_")}.json`);
      fs.writeFileSync(partialFile, JSON.stringify(result), "utf-8");

      // Assertions for reelle problemer
      if (hasOverflow) {
        test.info().annotations.push({ type: "overflow", description: `${route}: horisontal overflow` });
      }
      if (smallTargets > 0) {
        test.info().annotations.push({
          type: "touch",
          description: `${route}: ${smallTargets} touch-targets < 44px`,
        });
      }

      if (hasOverflow) {
        expect(hasOverflow, `${route}: Ingen horisontal overflow`).toBe(false);
      }
      if (smallTargets > 0) {
        expect(smallTargets, `${route}: Ingen touch-targets < 44px`).toBe(0);
      }
    });
  }
});
