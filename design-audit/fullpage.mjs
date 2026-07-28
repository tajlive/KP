import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  locale: "nb-NO",
});
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
await page.goto("https://www.klarpakke.no/no/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.fill('input[type="email"]', "tomarnejensen@gmail.com");
await page.fill('input[type="password"]', "TestTest123!");
await page.press('input[type="password"]', "Enter");
await page.waitForURL(/dashboard/, { timeout: 25000 });
await page.goto("https://www.klarpakke.no/no/dashboard/portfolio", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
await page.screenshot({ path: "design-audit/verify/02b-portfolio-full.png", fullPage: true });
console.log("OK fullpage");
await browser.close();
