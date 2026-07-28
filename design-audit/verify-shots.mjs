import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "https://www.klarpakke.no";
const OUT = "/Users/taj/klarpakke/design-audit/verify";
mkdirSync(OUT, { recursive: true });

const pages = [
  ["/no/dashboard", "01-dashboard"],
  ["/no/dashboard/portfolio", "02-portfolio"],
  ["/no/dashboard/resultater", "03-resultater"],
  ["/no/dashboard/analysis", "04-analysis"],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  locale: "nb-NO",
});
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

try {
  // Landing (uinnlogget)
  await page.goto(BASE + "/no", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/00-landing.png` });
  console.log("OK 00-landing");

  // Login — Enter i passordfeltet (knapp-klikk timer ut)
  await page.goto(BASE + "/no/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"]', "tomarnejensen@gmail.com");
  await page.fill('input[type="password"]', "TestTest123!");
  await page.press('input[type="password"]', "Enter");
  await page.waitForURL(/dashboard/, { timeout: 25000 });
  console.log("LOGIN OK");

  for (const [path, name] of pages) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000); // la API-data nå frem
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log("OK", name);
  }
} catch (err) {
  console.error("FEIL:", err.message);
  await page.screenshot({ path: `${OUT}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}
