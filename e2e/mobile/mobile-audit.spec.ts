/**
 * Mobile Audit — 375px viewport test of ALL public routes.
 *
 * Single test iterating all 34 routes sequentially to avoid
 * parallel-worker file contention. Tests:
 * 1. Horizontal overflow (scrollWidth > innerWidth)
 * 2. Elements outside viewport bounds
 * 3. Touch targets < 44px (interactive elements too small)
 *
 * @mobile @audit
 */

import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ── 34 public routes ──────────────────────────────────────────────────
const ROUTES = [
  "/no",                           // Hjem
  "/no/priser",                    // Priser
  "/no/priser/success",
  "/no/priser/cancel",
  "/no/om-oss",                    // Om oss
  "/no/kontakt",                   // Kontakt
  "/no/hjelp",                     // Hjelp
  "/no/kalkulator",                // Kalkulator
  "/no/bots",                      // Bots
  "/no/binance-guide",             // Binance-guide
  "/no/vilkar",                    // Vilkår
  "/no/personvern",                // Personvern
  "/no/cookies",                   // Cookies
  "/no/login",                     // Logg inn
  "/no/register",                  // Registrer
  "/no/reset-password",
  "/no/update-password",
  "/no/jokertrade",                // JokerTrade
  "/no/leaderboard",               // Ledertavle
  "/no/copy-trading",              // Copy trading
  "/no/copy-trading/discover",
  "/no/akademi",                   // Akademi
  "/no/akademi/dashboard-guide",
  "/no/kurs",                      // Kurs
  "/no/kurs/grunnleggende/leksjon/introduksjon-til-krypto",
  "/no/kurs/strategi/leksjon/dollar-cost-averaging",
  "/no/checkout",                  // Checkout
  "/no/checkout/success",
  "/no/marketplace",               // Marketplace
  "/no/velkommen",                 // Velkommen
  "/no/velg-strategi",             // Velg strategi
  "/no/feil/ikke-funnet",          // 404
  "/no/feil/ingen-tilgang",        // 403
  "/no/feil/serverfeil",           // 500
];

const V = { width: 375, height: 667 };
const DIR = path.resolve("public/mobile-audit");

interface Result {
  route: string;
  ok: boolean;
  overflow: boolean;
  offScreen: number;
  smallTouch: number;
  errors: string[];
  screenshot?: string;
}

// ── helpers ────────────────────────────────────────────────────────────

const overflow = (p: Page) =>
  p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

const offScreen = (p: Page) =>
  p.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    let c = 0;
    for (const el of document.querySelectorAll("*")) {
      if (!(el instanceof HTMLElement)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.left > vw || r.top > vh || r.right < 0 || r.bottom < 0) continue;
      const t = el.tagName.toLowerCase();
      if (t === "html" || t === "body") continue;
      if (window.getComputedStyle(el).position === "fixed") continue;
      if (r.left < -10 || r.right > vw + 10) {
        if (!el.textContent?.trim() && !el.children.length) continue;
        c++;
      }
    }
    return c;
  });

const touch44 = (p: Page) =>
  p.evaluate(() => {
    let c = 0;
    for (const el of document.querySelectorAll(
      "a,button,input,select,textarea,[role='button'],[role='link'],[role='tab'],[role='menuitem']",
    )) {
      if (!(el instanceof HTMLElement)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const s = window.getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") continue;
      if (el.tagName === "A" && s.display === "inline") continue;
      if (r.width >= 44 || r.height >= 44) continue;
      c++;
    }
    return c;
  });

const shot = async (p: Page, r: string) => {
  const n = (r.replace(/\//g, "_") || "home").replace(/^_/, "");
  const fp = path.join(DIR, `${n}.png`);
  await p.screenshot({ path: fp, fullPage: true });
  return `/mobile-audit/${n}.png`;
};

// ── test ───────────────────────────────────────────────────────────────

test("Mobil-audit: 34 ruter i 375×667 @mobile @audit", async ({ page }) => {
  fs.mkdirSync(DIR, { recursive: true });
  for (const f of fs.readdirSync(DIR)) if (f.endsWith(".png")) fs.unlinkSync(path.join(DIR, f));

  const results: Result[] = [];

  for (const route of ROUTES) {
    const errs: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errs.push(msg.text().slice(0, 200)); });

    await page.setViewportSize(V);
    const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
    await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);

    if (resp && resp.status() >= 400) {
      const r: Result = { route, ok: false, overflow: false, offScreen: 0, smallTouch: 0, errors: [`HTTP ${resp.status()}`], screenshot: await shot(page, route) };
      results.push(r);
      continue;
    }
    await page.waitForTimeout(500);

    const ov = await overflow(page);
    const os = await offScreen(page);
    const st = await touch44(page);
    const bad = ov || os > 30 || st > 0;

    const r: Result = { route, ok: !bad, overflow: ov, offScreen: os, smallTouch: st, errors: errs.slice(0, 5) };
    if (bad) r.screenshot = await shot(page, route);
    results.push(r);

    // Log progress
    process.stdout.write(bad ? "❌" : "✅");
  }

  // ── Write results ───────────────────────────────────────────────────
  fs.writeFileSync(path.join(DIR, "results.json"), JSON.stringify(results, null, 2) + "\n");

  // ── Summary ─────────────────────────────────────────────────────────
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;

  console.log(`\n\n${"=".repeat(47)}`);
  console.log(`📱 MOBIL-AUDIT SAMMENDRAG (375×667)`);
  console.log(`${"=".repeat(47)}`);
  console.log(`✅ ${pass} av ${results.length} sider bestått`);
  console.log(`❌ ${fail} av ${results.length} sider har mobil-problemer`);
  console.log(`${"=".repeat(47)}`);

  if (fail > 0) {
    console.log(`\nSider med feil:`);
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  ❌ ${r.route}`);
      if (r.overflow) console.log(`     └─ Horisontal overflow`);
      if (r.offScreen > 30) console.log(`     └─ ${r.offScreen} element(er) utenfor skjerm`);
      if (r.smallTouch > 0) console.log(`     └─ ${r.smallTouch} små touch-targets (<44px)`);
    }
  }
  console.log();

  // ── Assert — fail the test if any route has issues ──────────────────
  const bad = results.filter((r) => !r.ok);
  expect(bad.length, `${bad.length} av ${results.length} sider har mobil-problemer`).toBe(0);
});
