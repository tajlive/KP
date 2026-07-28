import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "https://www.klarpakke.no";
mkdirSync("design-audit/media/video", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });

// Steg 1: login én gang, lagre session (slettes etterpå)
const c1 = await browser.newContext({ locale: "nb-NO" });
const p1 = await c1.newPage();
p1.setDefaultTimeout(25000);
await p1.goto(BASE + "/no/login", { waitUntil: "domcontentloaded" });
await p1.waitForTimeout(2000);
await p1.fill('input[type="email"]', "tomarnejensen@gmail.com");
await p1.fill('input[type="password"]', "TestTest123!");
await p1.press('input[type="password"]', "Enter");
await p1.waitForURL(/dashboard/, { timeout: 25000 });
await c1.storageState({ path: "design-audit/media/auth.json" });
await c1.close();
console.log("LOGIN OK");

// Steg 2: video av ekte flyt (mobil), uten å fullføre handel
const c2 = await browser.newContext({
  viewport: { width: 375, height: 812 },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  locale: "nb-NO",
  storageState: "design-audit/media/auth.json",
  recordVideo: { dir: "design-audit/media/video", size: { width: 375, height: 812 } },
});
const p2 = await c2.newPage();
p2.setDefaultTimeout(25000);

await p2.goto(BASE + "/no/dashboard", { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(3500);

await p2.goto(BASE + "/no/trade", { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(4500); // la graf + pris laste

// Rent skjermbilde til mockup (før vi rører skjemaet)
await p2.screenshot({ path: "design-audit/media/trade-clean.png" });

// Fyll beløp — vis konvertering (IKKE submit)
const belop = p2.locator('input[type="text"], input[type="number"]').first();
await belop.click();
await belop.press("ControlOrMeta+a");
await belop.pressSequentially("2500", { delay: 120 });
await p2.waitForTimeout(1800);
await p2.screenshot({ path: "design-audit/media/trade-filled.png" });

// Hold musepeker over Kjøp-knappen uten å trykke
await p2.locator("text=/Kjøp BTC/").first().hover().catch(() => {});
await p2.waitForTimeout(1200);

await c2.close(); // lagrer video
await browser.close();
console.log("FERDIG");
