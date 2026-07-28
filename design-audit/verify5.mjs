import { chromium } from "playwright";
import { mkdirSync } from "fs";
mkdirSync("design-audit/verify5", { recursive: true });
const BASE = "https://www.klarpakke.no";
const browser = await chromium.launch({ channel: "chrome", headless: true });

// Desktop landing (uinnlogget)
const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "nb-NO" });
const dp = await d.newPage();
await dp.goto(BASE + "/no", { waitUntil: "domcontentloaded" });
await dp.waitForTimeout(3500);
await dp.screenshot({ path: "design-audit/verify5/d-landing.png" });
console.log("OK d-landing");
await d.close();

// Mobil landing + historikk (innlogget)
const m = await browser.newContext({
  viewport: { width: 375, height: 812 },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  locale: "nb-NO",
});
const mp = await m.newPage();
mp.setDefaultTimeout(25000);
await mp.goto(BASE + "/no", { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(3500);
await mp.screenshot({ path: "design-audit/verify5/m-landing.png", fullPage: true });
console.log("OK m-landing");
await mp.goto(BASE + "/no/login", { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(2000);
await mp.fill('input[type="email"]', "tomarnejensen@gmail.com");
await mp.fill('input[type="password"]', "TestTest123!");
await mp.press('input[type="password"]', "Enter");
await mp.waitForURL(/dashboard/, { timeout: 25000 });
await mp.goto(BASE + "/no/dashboard/historikk", { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(4000);
await mp.screenshot({ path: "design-audit/verify5/m-historikk.png" });
console.log("OK m-historikk");
await browser.close();
