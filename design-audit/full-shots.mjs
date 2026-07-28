import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "https://www.klarpakke.no";
const OUT = "design-audit/full";
mkdirSync(OUT, { recursive: true });

const mobilePages = [
  ["/no", "m00-landing", false],
  ["/no/register", "m01-register", false],
  ["/no/login", "m02-login", false],
  ["/no/dashboard", "m03-dashboard", true],
  ["/no/dashboard/portfolio", "m04-portfolio", true],
  ["/no/trade", "m05-trade", true],
  ["/no/dashboard/resultater", "m06-resultater", true],
  ["/no/dashboard/analysis", "m07-analysis", true],
  ["/no/dashboard/auto-trade", "m08-autotrade", true],
  ["/no/dashboard/historikk", "m09-historikk", true],
  ["/no/konto", "m10-konto", true],
  ["/no/jokertrade", "m11-jokertrade", true],
];

const desktopPages = [
  ["/no", "d00-landing", false],
  ["/no/dashboard", "d01-dashboard", true],
  ["/no/trade", "d02-trade", true],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });

// --- Mobil ---
const mctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  locale: "nb-NO",
});
const mp = await mctx.newPage();
mp.setDefaultTimeout(25000);

let loggedIn = false;
for (const [path, name, needsAuth] of mobilePages) {
  try {
    if (needsAuth && !loggedIn) {
      await mp.goto(BASE + "/no/login", { waitUntil: "domcontentloaded" });
      await mp.waitForTimeout(2000);
      await mp.fill('input[type="email"]', "tomarnejensen@gmail.com");
      await mp.fill('input[type="password"]', "TestTest123!");
      await mp.press('input[type="password"]', "Enter");
      await mp.waitForURL(/dashboard/, { timeout: 25000 });
      loggedIn = true;
      console.log("LOGIN OK (mobil)");
    }
    await mp.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await mp.waitForTimeout(3500);
    await mp.screenshot({ path: `${OUT}/${name}.png` });
    console.log("OK", name, mp.url().replace(BASE, ""));
  } catch (e) {
    console.log("FEIL", name, e.message.slice(0, 80));
    await mp.screenshot({ path: `${OUT}/${name}-error.png` }).catch(() => {});
  }
}
await mctx.close();

// --- Desktop ---
const dctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "nb-NO",
});
const dp = await dctx.newPage();
dp.setDefaultTimeout(25000);
loggedIn = false;
for (const [path, name, needsAuth] of desktopPages) {
  try {
    if (needsAuth && !loggedIn) {
      await dp.goto(BASE + "/no/login", { waitUntil: "domcontentloaded" });
      await dp.waitForTimeout(2000);
      await dp.fill('input[type="email"]', "tomarnejensen@gmail.com");
      await dp.fill('input[type="password"]', "TestTest123!");
      await dp.press('input[type="password"]', "Enter");
      await dp.waitForURL(/dashboard/, { timeout: 25000 });
      loggedIn = true;
      console.log("LOGIN OK (desktop)");
    }
    await dp.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await dp.waitForTimeout(3500);
    await dp.screenshot({ path: `${OUT}/${name}.png` });
    console.log("OK", name, dp.url().replace(BASE, ""));
  } catch (e) {
    console.log("FEIL", name, e.message.slice(0, 80));
  }
}
await browser.close();
console.log("FERDIG");
