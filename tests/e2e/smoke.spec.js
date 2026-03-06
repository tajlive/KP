import { test, expect } from "@playwright/test";

test("Landing page loads", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  
  const supabaseLoaded = await page.evaluate(() => {
    return typeof window.supabase !== "undefined";
  });
  expect(supabaseLoaded).toBeTruthy();
  console.info("✅ Supabase loaded");
});

test("Config is correct", async ({ page }) => {
  await page.goto("/");
  const config = await page.evaluate(() => window.KLARPAKKE_CONFIG);
  expect(config.SUPABASE_URL).toBe("https://vuxbjlykgmzskxbclquf.supabase.co");
  console.info("✅ Config correct");
});
